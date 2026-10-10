import { test } from "node:test";
import assert from "node:assert/strict";
import { compareReports } from "../services/reportComparisonService.js";
import { buildFindings } from "../services/comparisonSummaryService.js";

const R = (o) => ({
  testName: o.testName,
  normalizedName: o.key,
  canonicalName: o.testName,
  family: o.family || null,
  value: o.value != null ? String(o.value) : "",
  numericValue: o.qualitative ? null : (o.value != null ? o.value : null),
  qualifier: o.qualifier || "",
  unit: o.unit || "",
  referenceRange: o.refText || "",
  referenceLow: o.low ?? null,
  referenceHigh: o.high ?? null,
  flag: "",
  isNumeric: !o.qualitative && o.value != null,
  isQualitative: !!o.qualitative,
  reviewRequired: !!o.qualitative,
  status: "",
});

const setA = {
  reportId: "64b100000000000000000001",
  reportName: "Panel Jan 2025.pdf",
  reportDate: "2025-01-10",
  collectionDate: null,
  results: [
    R({ key: "glucose", testName: "Fasting Blood Sugar", family: "glucose", value: 100, unit: "mg/dL", low: 70, high: 100, refText: "70 - 100" }),
    R({ key: "hdl_cholesterol", testName: "HDL Cholesterol", family: "cholesterol", value: 60, unit: "mg/dL", low: 40, refText: "> 40" }),
    R({ key: "vitamin_d", testName: "Vitamin D", value: 30, unit: "ng/mL", low: 30, high: 100 }),
    R({ key: "blood_group", testName: "Blood Group", value: "B+", qualitative: true }),
    R({ key: "total_protein", testName: "Total Protein", value: 7.2, unit: "g/dL", low: 6.4, high: 8.3 }),
  ],
};

const setB = {
  reportId: "64b100000000000000000002",
  reportName: "Panel Jul 2025.pdf",
  reportDate: "2025-07-10",
  collectionDate: null,
  results: [
    R({ key: "glucose", testName: "Fasting Blood Sugar", family: "glucose", value: 5.2, unit: "mmol/L", low: 3.9, high: 5.5, refText: "3.9 - 5.5" }),
    R({ key: "hdl_cholesterol", testName: "HDL Cholesterol", family: "cholesterol", value: 30, unit: "mg/dL", low: 40, refText: "> 40" }),
    R({ key: "vitamin_d", testName: "Vitamin D", value: 75, unit: "nmol/L", low: 30, high: 100 }),
    R({ key: "blood_group", testName: "Blood Group", value: "B+", qualitative: true }),
    R({ key: "creatinine", testName: "Creatinine", family: "creatinine", value: 1.1, unit: "mg/dL", low: 0.7, high: 1.3 }),
  ],
};

test("matches same test across reports despite different units (validated conversion)", () => {
  const cmp = compareReports([setA, setB]);
  const glucose = cmp.rows.find((r) => r.testKey === "glucose");
  assert.ok(glucose, "glucose row present");
  assert.equal(glucose.presentInAllReports, true);

  const change = glucose.changes[0];
  assert.equal(change.comparable, true);
  assert.equal(change.direction, "decreased");
  assert.ok(change.percentageChange < 0, "percentage change is negative");
  assert.ok(Math.abs(change.absoluteChange - (5.2 * 18.0182 - 100)) < 1, "absolute change on canonical mg/dL scale");
});

test("orders reports chronologically even when passed out of order", () => {
  const cmp = compareReports([setB, setA]);
  assert.equal(cmp.reports[0].reportDate, "2025-01-10");
  const glucose = cmp.rows.find((r) => r.testKey === "glucose");
  assert.equal(glucose.entries[0].reportDate, "2025-01-10");
  assert.equal(glucose.entries[1].reportDate, "2025-07-10");
  // change must still be A -> B (older -> newer)
  assert.equal(glucose.changes[0].direction, "decreased");
});

test("findings stay traceable to the correct reports when input is out of order", () => {
  // Input order is B (2025-07-10) then A (2025-01-10) — the reverse of chronological.
  const cmp = compareReports([setB, setA]);
  const findings = buildFindings(cmp);

  const glucose = findings.find(
    (f) => f.testName === "Fasting Blood Sugar" && /Value decreased/.test(f.finding)
  );
  assert.ok(glucose, "glucose change finding present");
  // The change is credited to the newer report (B) with its own date...
  assert.equal(glucose.reportId, setB.reportId);
  assert.equal(glucose.reportDate, "2025-07-10");
  // ...and the wording spans the two correct reported dates in order.
  assert.match(glucose.finding, /between 2025-01-10 and 2025-07-10/);
});

test("detects newly appearing and missing tests", () => {  const cmp = compareReports([setA, setB]);
  const creatinine = cmp.rows.find((r) => r.testKey === "creatinine");
  assert.ok(creatinine, "creatinine row");
  assert.ok(creatinine.missingAtReportIndexes.includes(0), "missing in earliest report");

  const protein = cmp.rows.find((r) => r.testKey === "total_protein");
  assert.ok(protein.missingAtReportIndexes.includes(1), "missing in latest report");

  assert.equal(cmp.summaryStats.newTests, 1);
  assert.equal(cmp.summaryStats.missingTests, 1);
});

test("non-convertible units are never compared directly", () => {
  const cmp = compareReports([setA, setB]);
  const vd = cmp.rows.find((r) => r.testKey === "vitamin_d");
  const change = vd.changes[0];
  assert.equal(change.comparable, false);
  assert.match(change.reason, /different units/);
});

test("qualitative results are reported as incomparable, not numeric", () => {
  const cmp = compareReports([setA, setB]);
  const bg = cmp.rows.find((r) => r.testKey === "blood_group");
  const change = bg.changes[0];
  assert.equal(change.comparable, false);
  assert.match(change.reason, /qualitative/);
});

test("out-of-range results are counted with status", () => {
  const cmp = compareReports([setA, setB]);
  const hdl = cmp.rows.find((r) => r.testKey === "hdl_cholesterol");
  assert.equal(hdl.entries[1].status, "LOW");
  assert.ok(cmp.summaryStats.outOfRangeCount >= 1);
});

test("percentage change is suppressed when baseline is zero", () => {
  const a = {
    reportId: "64b100000000000000000003",
    reportName: "A",
    reportDate: "2025-01-01",
    results: [R({ key: "ldl_cholesterol", testName: "LDL", family: "cholesterol", value: 0, unit: "mg/dL" })],
  };
  const b = {
    reportId: "64b100000000000000000004",
    reportName: "B",
    reportDate: "2025-06-01",
    results: [R({ key: "ldl_cholesterol", testName: "LDL", family: "cholesterol", value: 140, unit: "mg/dL" })],
  };
  const cmp = compareReports([a, b]);
  const change = cmp.rows[0].changes[0];
  assert.equal(change.comparable, true);
  assert.equal(change.percentageChange, null);
  assert.equal(change.direction, "increased");
});

test("same-unit comparison without family still works", () => {
  const a = {
    reportId: "64b100000000000000000005",
    reportName: "A",
    reportDate: "2025-01-01",
    results: [R({ key: "tsh", testName: "TSH", value: 4.5, unit: "µIU/mL", low: 0.4, high: 4.0 })],
  };
  const b = {
    reportId: "64b100000000000000000006",
    reportName: "B",
    reportDate: "2025-06-01",
    results: [R({ key: "tsh", testName: "TSH", value: 2.1, unit: "µIU/mL", low: 0.4, high: 4.0 })],
  };
  const cmp = compareReports([a, b]);
  const change = cmp.rows[0].changes[0];
  assert.equal(change.comparable, true);
  assert.equal(change.direction, "decreased");
  assert.equal(cmp.rows[0].entries[1].status, "NORMAL");
});