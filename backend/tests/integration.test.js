/**
 * Integration tests against a real MongoDB (local) exercising the actual
 * controllers. Auth is simulated (Clerk/doctor context is injected the way
 * requireAuth()/doctorAuth() populate it) so we can verify data-access rules
 * without minting live tokens.
 *
 * Uses an isolated test database — the developer DB is never touched.
 */
import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import Report from "../models/reportModel.js";
import Appointment from "../models/Appointment.js";
import ClinicalRecord from "../models/ClinicalRecord.js";

import {
  getReportHistory,
  getReportResults,
  postCompareReports,
} from "../controllers/reportInsightsController.js";

import {
  getPatientTimeline,
  getTimelineEvent,
  createClinicalRecord,
} from "../controllers/patientTimelineController.js";

const TEST_URI =
  process.env.TEST_MONGO_URI || "mongodb://127.0.0.1:27017/curadesk_feature_test";
const USER_A = "user_patient_a";
const USER_B = "user_patient_b";

const mkRes = () => {
  const res = { statusCode: 200, body: null };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
};

const ctxFor = (userId, overrides = {}) => ({
  auth: () => ({ userId }),
  params: {},
  query: {},
  body: {},
  ...overrides,
});

const REPORT_A1_TEXT = `
Patient Name: Alice
Date of Report: 10/01/2025
Fasting Blood Sugar 100 mg/dL (70 - 100)
Total Cholesterol 210 mg/dL (< 200)
`;

const REPORT_A2_TEXT = `
Patient Name: Alice
Date of Report: 15/06/2025
Fasting Blood Sugar 5.2 mmol/L (3.9 - 5.5)
Creatinine 1.1 mg/dL (0.7 - 1.3)
`;

const REPORT_B1_TEXT = `
Patient Name: Bob
Date of Report: 01/02/2025
Fasting Blood Sugar 130 mg/dL (70 - 100)
`;

let reportA1;
let reportA2;
let reportB1;
let appointmentA;
let appointmentB;

before(async () => {
  await mongoose.connect(TEST_URI);
  await Promise.all([
    Report.deleteMany({}),
    Appointment.deleteMany({}),
    ClinicalRecord.deleteMany({}),
  ]);

  reportA1 = await Report.create({
    userId: USER_A,
    reportName: "Alice-Jan-2025.pdf",
    fileOriginalName: "Alice-Jan-2025.pdf",
    fileHash: `test-hash-a1-${Date.now()}`,
    chromaChunkIds: [],
    reportType: "medical-report",
    extractedText: REPORT_A1_TEXT,
    reportDate: "2025-01-10",
    collectionDate: null,
    labMethod: "none",
  });

  reportA2 = await Report.create({
    userId: USER_A,
    reportName: "Alice-Jun-2025.pdf",
    fileOriginalName: "Alice-Jun-2025.pdf",
    fileHash: `test-hash-a2-${Date.now()}`,
    chromaChunkIds: [],
    reportType: "medical-report",
    extractedText: REPORT_A2_TEXT,
    reportDate: "2025-06-15",
    collectionDate: null,
    labMethod: "none",
  });

  reportB1 = await Report.create({
    userId: USER_B,
    reportName: "Bob-Feb-2025.pdf",
    fileOriginalName: "Bob-Feb-2025.pdf",
    fileHash: `test-hash-b1-${Date.now()}`,
    chromaChunkIds: [],
    reportType: "medical-report",
    extractedText: REPORT_B1_TEXT,
    reportDate: "2025-02-01",
    collectionDate: null,
    labMethod: "none",
  });

  appointmentA = await Appointment.create({
    owner: USER_A,
    createdBy: USER_A,
    patientName: "Alice",
    mobile: "9000000000",
    email: "alice@example.com",
    doctorId: new mongoose.Types.ObjectId(),
    doctorName: "Dr. Rao",
    speciality: "Cardiology",
    date: "10/03/2025",
    time: "10:30",
    fees: 500,
    status: "Completed",
  });

  appointmentB = await Appointment.create({
    owner: USER_B,
    createdBy: USER_B,
    patientName: "Bob",
    mobile: "9000000001",
    email: "bob@example.com",
    doctorId: new mongoose.Types.ObjectId(),
    doctorName: "Dr. Iyer",
    speciality: "Dermatology",
    date: "20/03/2025",
    time: "11:00",
    fees: 400,
    status: "Confirmed",
  });
});

after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test("report history returns only the authenticated patient's reports", async () => {
  const res = mkRes();
  await getReportHistory(ctxFor(USER_A), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.total, 2);
  assert.ok(res.body.reports.every((r) => r.reportName.startsWith("Alice")));
});

test("report history requires authentication", async () => {
  const res = mkRes();
  await getReportHistory({ auth: () => null, params: {}, query: {}, body: {} }, res);
  assert.equal(res.statusCode, 401);
});

test("report results are not readable by another patient", async () => {
  const res = mkRes();
  await getReportResults(ctxFor(USER_A, { params: { id: String(reportB1._id) } }), res);
  assert.equal(res.statusCode, 404);
});

test("report results are extracted from stored text and persisted once", async () => {
  const res = mkRes();
  await getReportResults(ctxFor(USER_A, { params: { id: String(reportA1._id) } }), res);

  assert.equal(res.statusCode, 200);
  const keys = res.body.labResults.map((r) => r.normalizedName);
  assert.ok(keys.includes("glucose"), `glucose in ${JSON.stringify(keys)}`);
  assert.ok(keys.includes("total_cholesterol"), `cholesterol in ${JSON.stringify(keys)}`);
  assert.equal(res.body.report.reportDate, "2025-01-10");
  assert.ok(["extracted-text", "extracted-chroma", "stored"].includes(res.body.extraction.method));

  const persisted = await Report.findById(reportA1._id);
  assert.equal(persisted.labResults.length, 2);
  assert.equal(persisted.labMethod, "deterministic");
});

test("compares two owned reports and produces a traceable, labelled summary", async () => {
  const res = mkRes();
  await postCompareReports(
    ctxFor(USER_A, { body: { reportIds: [String(reportA1._id), String(reportA2._id)] } }),
    res
  );

  assert.equal(res.statusCode, 200);
  const { comparison, summary } = res.body;

  assert.equal(comparison.reportCount, 2);
  assert.equal(comparison.reports[0].reportDate, "2025-01-10");

  const glucose = comparison.rows.find((r) => r.testKey === "glucose");
  assert.ok(glucose, "glucose row present");
  assert.equal(glucose.changes[0].comparable, true);
  assert.equal(glucose.changes[0].direction, "decreased");

  assert.equal(comparison.summaryStats.newTests, 1, "creatinine is newly appearing");

  assert.ok(typeof summary.summary === "string" && summary.summary.length > 0);
  assert.equal(summary.isInformational, true);
  assert.ok(summary.disclaimer.length > 0);
  assert.ok(Array.isArray(summary.findings));
  assert.ok(summary.findings.some((f) => f.testName && f.reportDate), "findings cite test + report");
});

test("comparing another patient's report is rejected", async () => {
  const res = mkRes();
  await postCompareReports(
    ctxFor(USER_A, { body: { reportIds: [String(reportA1._id), String(reportB1._id)] } }),
    res
  );
  assert.equal(res.statusCode, 404);
});

test("invalid comparison payloads are rejected", async () => {
  const bad1 = mkRes();
  await postCompareReports(ctxFor(USER_A, { body: { reportIds: [String(reportA1._id)] } }), bad1);
  assert.equal(bad1.statusCode, 400);

  const bad2 = mkRes();
  await postCompareReports(ctxFor(USER_A, { body: {} }), bad2);
  assert.equal(bad2.statusCode, 400);
});

test("patient timeline only aggregates that patient's records", async () => {
  const res = mkRes();
  await getPatientTimeline(ctxFor(USER_A, { query: {} }), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.total, 3); // 2 reports + 1 appointment

  const other = mkRes();
  await getPatientTimeline(ctxFor(USER_B, { query: {} }), other);
  assert.equal(other.body.total, 2, "B has 1 report + 1 appointment");
  assert.ok(other.body.events.every((e) => !e.title.startsWith("Alice")));
});

test("timeline event detail enforces ownership", async () => {
  const ok = mkRes();
  await getTimelineEvent(ctxFor(USER_A, { params: { eventId: `report:${reportA1._id}` } }), ok);
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.body.event.type, "report");

  const denied = mkRes();
  await getTimelineEvent(ctxFor(USER_A, { params: { eventId: `report:${reportB1._id}` } }), denied);
  assert.equal(denied.statusCode, 404);
});

test("clinician records a prescription linked to the appointment (patient derived server-side)", async () => {
  const res = mkRes();
  await createClinicalRecord(
    {
      doctor: { _id: new mongoose.Types.ObjectId(), name: "Dr. Rao" },
      body: {
        type: "medication",
        appointmentId: String(appointmentA._id),
        medication: {
          name: "Amlodipine",
          dose: "5mg",
          frequency: "Once daily",
          startDate: "2025-03-10",
          status: "active",
        },
      },
    },
    res
  );

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.record.patientUserId, USER_A, "patient derived from appointment");
  assert.equal(res.body.record.source, "clinician");
  assert.equal(res.body.record.verifiedByClinician, true);
  assert.equal(res.body.record.clinician.doctorName, "Dr. Rao");
});

test("client-supplied patient id cannot mismatch the appointment's patient", async () => {
  const res = mkRes();
  await createClinicalRecord(
    {
      doctor: { _id: new mongoose.Types.ObjectId(), name: "Dr. Iyer" },
      body: {
        type: "diagnosis",
        patientUserId: USER_A, // attacker-supplied, wrong
        appointmentId: String(appointmentB._id), // Bob's appointment
        diagnosis: { name: "Eczema" },
      },
    },
    res
  );

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.record.patientUserId, USER_B, "appointment patient wins");
});

test("clinician records must be valid", async () => {
  const missing = mkRes();
  await createClinicalRecord(
    { doctor: { _id: new mongoose.Types.ObjectId(), name: "Dr. Rao" }, body: { type: "medication", appointmentId: String(appointmentA._id), medication: {} } },
    missing
  );
  assert.equal(missing.statusCode, 400);

  const badType = mkRes();
  await createClinicalRecord({ doctor: { _id: new mongoose.Types.ObjectId() }, body: { type: "note", diagnosis: { name: "x" } } }, badType);
  assert.equal(badType.statusCode, 400);

  const noAuth = mkRes();
  await createClinicalRecord({ body: { type: "diagnosis", diagnosis: { name: "x" } } }, noAuth);
  assert.equal(noAuth.statusCode, 401);
});

test("timeline shows clinician medication events after they are recorded", async () => {
  const res = mkRes();
  await getPatientTimeline(ctxFor(USER_A, { query: { type: "medication" } }), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.total, 1);
  const med = res.body.events[0];
  assert.equal(med.type, "medication");
  assert.equal(med.source, "clinician");
  assert.equal(med.verified, true);
  assert.equal(med.title, "Amlodipine");
  assert.equal(med.meta.details.dose, "5mg");
  assert.ok(med.meta.appointmentId);

  // the diagnosis for Bob must never show up in Alice's timeline
  const aliceAll = mkRes();
  await getPatientTimeline(ctxFor(USER_A, { query: {} }), aliceAll);
  assert.ok(!aliceAll.body.events.some((e) => e.title === "Eczema"));
});

test("timeline returns a clear empty state for a patient with no records", async () => {
  const res = mkRes();
  await getPatientTimeline(ctxFor("user_patient_empty", { query: {} }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.total, 0);
  assert.deepEqual(res.body.events, []);
});