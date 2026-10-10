import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTimelineEvents, queryTimeline, findEvent } from "../services/timelineService.js";

const reports = [
  {
    _id: "64b000000000000000000001",
    reportName: "Lipid Panel.pdf",
    reportDate: "15/08/2025",
    collectionDate: "14/08/2025",
    labMethod: "deterministic",
    labResults: [{ reviewRequired: false }],
    createdAt: "2025-08-16T10:00:00.000Z",
  },
  {
    _id: "64b000000000000000000002",
    reportName: "CBC.pdf",
    reportDate: null,
    collectionDate: null,
    labMethod: "none",
    labResults: [],
    createdAt: "2025-07-01T10:00:00.000Z",
  },
];

const appointments = [
  {
    _id: "64b000000000000000000003",
    doctorName: "Dr. Rao",
    speciality: "Cardiology",
    date: "10/01/2025",
    time: "10:30",
    status: "Confirmed",
    fees: 500,
    createdAt: "2025-01-02T10:00:00.000Z",
  },
];

const clinicalRecords = [
  {
    _id: "64b000000000000000000004",
    type: "diagnosis",
    date: new Date("2025-03-05T00:00:00.000Z"),
    diagnosis: { name: "Hypertension", code: "" },
    clinician: { doctorName: "Dr. Rao" },
    appointmentId: "64b000000000000000000003",
    recordedAt: new Date("2025-03-05T09:00:00.000Z"),
    source: "clinician",
    verifiedByClinician: true,
  },
  {
    _id: "64b000000000000000000005",
    type: "medication",
    date: new Date("2025-03-05T00:00:00.000Z"),
    medication: { name: "Amlodipine", dose: "5mg", frequency: "Once daily", startDate: new Date("2025-03-05"), status: "active" },
    clinician: { doctorName: "Dr. Rao" },
    recordedAt: new Date("2025-03-05T09:05:00.000Z"),
    source: "clinician",
    verifiedByClinician: true,
  },
  {
    _id: "64b000000000000000000006",
    type: "diagnosis",
    date: null,
    diagnosis: { name: "Awaiting confirmation" },
    clinician: { doctorName: "" },
    recordedAt: new Date("2025-04-01T09:00:00.000Z"),
    source: "clinician",
    verifiedByClinician: true,
  },
];

test("builds one event per source record with all event types", () => {
  const events = buildTimelineEvents({ reports, appointments, clinicalRecords });
  assert.equal(events.length, 6);
  const types = new Set(events.map((e) => e.type));
  assert.deepEqual([...types].sort(), ["appointment", "diagnosis", "medication", "report"]);
});

test("sorts chronologically descending with undated events last", () => {
  const events = buildTimelineEvents({ reports, appointments, clinicalRecords });
  const dated = events.filter((e) => e.dateIso).map((e) => e.dateIso);
  assert.deepEqual(dated, [...dated].sort().reverse());

  const firstUndated = events.findIndex((e) => !e.dateIso);
  assert.ok(firstUndated > -1, "there is an undated event");
  assert.ok(events.slice(firstUndated).every((e) => !e.dateIso));
  assert.equal(events[firstUndated].dateLabel, "Not recorded");
});

test("distinguishes patient-uploaded from clinician-entered data", () => {
  const events = buildTimelineEvents({ reports, appointments, clinicalRecords });
  const clinician = events.filter((e) => e.source === "clinician");
  assert.equal(clinician.length, 3);
  assert.ok(clinician.every((e) => e.verified === true));
  const uploads = events.filter((e) => e.source === "patient-upload");
  assert.equal(uploads.length, 2);
  assert.ok(uploads.every((e) => e.verified === false));
});

test("links events to their source records", () => {
  const events = buildTimelineEvents({ reports, appointments, clinicalRecords });
  const report = events.find((e) => e.type === "report");
  assert.equal(report.meta.reportId, "64b000000000000000000001");
  const appointment = events.find((e) => e.type === "appointment");
  assert.equal(appointment.meta.appointmentId, "64b000000000000000000003");
  assert.equal(appointment.meta.status, "Confirmed");
  const diagnosis = events.find((e) => e.type === "diagnosis" && e.meta.recordId === "64b000000000000000000004");
  assert.equal(diagnosis.meta.clinician, "Dr. Rao");
  assert.equal(diagnosis.meta.appointmentId, "64b000000000000000000003");
  const medication = events.find((e) => e.type === "medication");
  assert.equal(medication.title, "Amlodipine");
  assert.equal(medication.meta.details.dose, "5mg");
  assert.equal(medication.meta.details.frequency, "Once daily");
});

test("filters by event type", () => {
  const events = buildTimelineEvents({ reports, appointments, clinicalRecords });
  assert.equal(queryTimeline(events, { types: ["report"] }).total, 2);
  assert.equal(queryTimeline(events, { types: ["diagnosis"] }).total, 2);
  assert.equal(queryTimeline(events, { types: ["appointment", "medication"] }).total, 2);
  assert.equal(queryTimeline(events, {}).total, 6);
});

test("filters by date range and excludes undated events", () => {
  const events = buildTimelineEvents({ reports, appointments, clinicalRecords });
  const inRange = queryTimeline(events, { from: "2025-01-01", to: "2025-12-31" });
  assert.equal(inRange.total, 4, "only dated events inside the range");
  assert.ok(inRange.events.every((e) => e.dateIso));

  const narrow = queryTimeline(events, { from: "2025-03-01", to: "2025-03-31" });
  assert.equal(narrow.total, 2);
  assert.ok(narrow.events.every((e) => e.dateIso >= "2025-03-01" && e.dateIso <= "2025-03-31"));
});

test("paginates large histories", () => {
  const events = buildTimelineEvents({ reports, appointments, clinicalRecords });
  const page1 = queryTimeline(events, { page: 1, limit: 2 });
  assert.equal(page1.events.length, 2);
  assert.equal(page1.total, 6);
  assert.equal(page1.pages, 3);
  assert.equal(page1.hasMore, true);

  const page3 = queryTimeline(events, { page: 3, limit: 2 });
  assert.equal(page3.events.length, 2);
  assert.equal(page3.hasMore, false);

  const page4 = queryTimeline(events, { page: 4, limit: 2 });
  assert.equal(page4.events.length, 0);
  assert.equal(page4.hasMore, false);
});

test("findEvent locates by id and returns null otherwise", () => {
  const events = buildTimelineEvents({ reports, appointments, clinicalRecords });
  const first = events[0];
  assert.equal(findEvent(events, first.id), first);
  assert.equal(findEvent(events, "report:64b000000000000000000001").type, "report");
  assert.equal(findEvent(events, "does-not-exist"), null);
});