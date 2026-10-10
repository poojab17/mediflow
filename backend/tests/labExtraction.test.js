import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractLabResults,
  extractReportDates,
  normalizeTestName,
  normalizeUnit,
  parseReferenceRange,
  deriveStatus,
  convertToCanonical,
} from "../services/labExtractionService.js";

const SAMPLE = `
Patient Name : John Doe
Age/Sex : 45/M
Date of Report : 15/08/2025
Specimen Collected On : 14-08-2025

Hemoglobin 13.2 g/dL (12.0 - 15.5)
Total Leucocyte Count 7,500 /cumm (4,000 - 11,000)
Platelet Count 2,40,000 /cumm (1,50,000 - 4,50,000)
Fasting Blood Sugar 98 mg/dL (70 - 100)
HbA1c 5.8 % (4.0 - 5.6)
Total Cholesterol 210 mg/dL (< 200)
LDL Cholesterol 138 mg/dL (< 100)
HDL Cholesterol 45 mg/dL (> 40)
Creatinine 1.1 mg/dL (0.7 - 1.3)
SGPT (ALT) 45 U/L (5 - 40)
Urine Protein Negative
Vitamin B12 250 pg/mL (200 - 900)
`;

const byKey = (results, key) => results.find((r) => r.normalizedName === key);

test("extracts structured results from report text", () => {
  const { results, method } = extractLabResults(SAMPLE);
  assert.equal(method, "deterministic");
  assert.ok(results.length >= 9, `expected >=9 results, got ${results.length}`);

  const hb = byKey(results, "hemoglobin");
  assert.ok(hb, "hemoglobin extracted");
  assert.equal(hb.numericValue, 13.2);
  assert.match(hb.unit, /g\/dL/i);
  assert.equal(hb.status, "NORMAL");

  const tlc = byKey(results, "white_blood_cells");
  assert.ok(tlc, "TLC extracted");
  assert.equal(tlc.numericValue, 7500);

  const plt = byKey(results, "platelet_count");
  assert.equal(plt.numericValue, 240000);
});

test("flags out-of-range values against stated reference range", () => {
  const { results } = extractLabResults(SAMPLE);
  assert.equal(byKey(results, "ldl_cholesterol").status, "HIGH");
  assert.equal(byKey(results, "total_cholesterol").status, "HIGH");
  assert.equal(byKey(results, "alt").status, "HIGH");
});

test("handles qualitative results safely (no NaN coercion)", () => {
  const { results } = extractLabResults(SAMPLE);
  const urine = byKey(results, "urine_protein");
  assert.ok(urine, "urine protein extracted");
  assert.equal(urine.isQualitative, true);
  assert.equal(urine.numericValue, null);
  assert.ok(!Number.isNaN(urine.numericValue));
  assert.equal(urine.reviewRequired, true);
});

test("normalizes test name spelling / abbreviation variations", () => {
  assert.equal(normalizeTestName("Hb").key, "hemoglobin");
  assert.equal(normalizeTestName("Haemoglobin").key, "hemoglobin");
  assert.equal(normalizeTestName("Hemoglobin (Hb)").key, "hemoglobin");
  assert.equal(normalizeTestName("Total Leukocyte Count").key, "white_blood_cells");
  assert.equal(normalizeTestName("WBC").key, "white_blood_cells");
  assert.equal(normalizeTestName("S. Creatinine").key, "creatinine");
  assert.equal(normalizeTestName("SGPT (ALT)").key, "alt");
  assert.equal(normalizeTestName("ALT/SGPT").key, "alt");
  assert.equal(normalizeTestName("Random Blood Sugar").key, "random_glucose");
  assert.equal(normalizeTestName("Urine Sugar").key, "urine_glucose");
});

test("ignores report header lines", () => {
  const { results } = extractLabResults(SAMPLE);
  const names = results.map((r) => r.testName.toLowerCase());
  assert.ok(!names.some((n) => n.includes("patient name")));
  assert.ok(!names.some((n) => n === "age/sex"));
});

test("reference range parsing supports ranges and one-sided bounds", () => {
  assert.deepEqual(parseReferenceRange(null, "(0.7 - 1.3)"), { low: 0.7, high: 1.3, text: "(0.7 - 1.3)" });
  const less = parseReferenceRange(null, "< 200");
  assert.equal(less.high, 200);
  assert.equal(less.low, null);
  const greater = parseReferenceRange(null, "> 40");
  assert.equal(greater.low, 40);
  assert.equal(greater.high, null);
});

test("status derivation", () => {
  assert.equal(deriveStatus(140, 70, 100), "HIGH");
  assert.equal(deriveStatus(60, 70, 100), "LOW");
  assert.equal(deriveStatus(85, 70, 100), "NORMAL");
  assert.equal(deriveStatus(5, null, null), null);
  assert.equal(deriveStatus(5, 4, null), "NORMAL");
});

test("unit conversion only for validated families", () => {
  assert.ok(Math.abs(convertToCanonical(5.2, "mmol/L", "glucose").value - 93.7) < 0.5);
  assert.equal(convertToCanonical(100, "mg/dL", "glucose").value, 100);
  assert.equal(convertToCanonical(1.1, "mg/dL", "creatinine").value, 1.1);
  assert.ok(convertToCanonical(88.4, "umol/L", "creatinine").value < 1.01);
  // unsupported / unknown family must never guess
  assert.equal(convertToCanonical(10, "ng/mL", null), null);
  assert.equal(convertToCanonical(10, "ng/mL", "glucose"), null);
  assert.equal(convertToCanonical(10, "", "glucose"), null);
});

test("unit normalization", () => {
  assert.equal(normalizeUnit("mg/dL"), "mg/dl");
  assert.equal(normalizeUnit("µmol/L"), "umol/l");
  assert.equal(normalizeUnit("/cumm"), "/ul");
  assert.equal(normalizeUnit("cells/mm3"), "/ul");
});

test("detects report and collection dates", () => {
  const dates = extractReportDates(SAMPLE);
  assert.equal(dates.reportDate, "2025-08-15");
  assert.equal(dates.collectionDate, "2025-08-14");
});

test("scientific-notation cell counts are scaled deterministically", () => {
  const { results } = extractLabResults("WBC 7.5 x10^3 /uL (4.5 - 11.0)");
  const wbc = results[0];
  assert.equal(wbc.normalizedName, "white_blood_cells");
  assert.equal(wbc.numericValue, 7500);
});