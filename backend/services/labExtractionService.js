/**
 * Deterministic laboratory-result extraction from already-extracted report
 * text. No AI, no network, no DB: pure functions that are unit-testable.
 *
 * Design goals:
 * - Keep the raw, source-supported values (value, unit, reference range,
 *   source line) together with parsed numeric equivalents.
 * - Convert units ONLY when the conversion is validated and supported for
 *   that specific test family.
 * - Never coerce ambiguous/non-numeric values into numbers.
 */

const IGNORED_NAMES = new Set([
  "patientname", "patient", "age", "sex", "gender", "agesex", "aged", "dob",
  "dateofreport", "reportdate", "reportsdate", "reportingdate",
  "collectiondate", "samplecollectiondate", "dateofcollection",
  "reporteddate", "date", "reference", "referencerange",
  "specimencollectedon", "specimendate", "specimentype", "receivedon",
  "collectedon", "collectedby", "requestedby", "refby", "referredby",
  "lab", "laboratory", "address", "phone", "phonenumber", "phoneno", "mobile",
  "email", "doctormobile", "dr", "doctorname", "physician", "pathologist",
  "clinical", "clinicalhistory", "clinicalfindings", "impression", "history",
  "diagnosis", "symptoms", "advice", "signature", "verifiedby", "note",
  "notes", "specimen", "units", "result", "remarks", "test", "method",
  "instrument", "department", "registration", "regno", "reportno", "billno",
  "labno", "accessionno", "sampleid", "sample",
]);

// Ordered most-specific-first: a generic alias must never shadow a specific
// test (e.g. "cholesterol" must not swallow "LDL cholesterol", and "hb" must
// not swallow "HbA1c").
const ALIASES = [
  { canonical: "hba1c", display: "Hemoglobin A1c (HbA1c)", aliases: ["hba1c", "glycated hemoglobin", "glycated haemoglobin", "a1c", "hemoglobin a1c", "glycohemoglobin"] },
  { canonical: "white_blood_cells", display: "White blood cells (WBC)", family: "cell_count", aliases: ["total leucocyte count", "total leukocyte count", "tlc", "wbc", "total white blood cells", "white blood cell count", "leucocyte count", "leukocyte count", "wbcs"] },
  { canonical: "hemoglobin", display: "Hemoglobin (Hb)", aliases: ["haemoglobin", "hgb", "hemoglobin", "hb"] },
  { canonical: "red_blood_cells", display: "Red blood cells (RBC)", family: "cell_count", aliases: ["rbc", "red blood cell count", "red blood cells", "erythrocyte count"] },
  { canonical: "hematocrit", display: "Hematocrit (HCT)", aliases: ["hematocrit", "haematocrit", "packed cell volume", "pcv", "hct"] },
  { canonical: "mcv", display: "Mean corpuscular volume (MCV)", aliases: ["mcv", "mean corpuscular volume"] },
  { canonical: "mch", display: "Mean corpuscular hemoglobin (MCH)", aliases: ["mch", "mean corpuscular hemoglobin", "mean corpuscular haemoglobin"] },
  { canonical: "mchc", display: "Mean corpuscular hemoglobin concentration (MCHC)", aliases: ["mchc", "mean corpuscular hemoglobin concentration", "mean corpuscular haemoglobin concentration"] },
  { canonical: "rdw", display: "Red cell distribution width (RDW)", aliases: ["rdw", "red cell distribution width"] },
  { canonical: "platelet_count", display: "Platelet count", family: "cell_count", aliases: ["platelet count", "platelets", "thrombocyte count", "plt", "platelet"] },
  { canonical: "neutrophils_pct", display: "Neutrophils", aliases: ["neutrophils", "neutrophil", "neutrophils %"] },
  { canonical: "lymphocytes_pct", display: "Lymphocytes", aliases: ["lymphocytes", "lymphocyte", "lymphocytes %"] },
  { canonical: "monocytes_pct", display: "Monocytes", aliases: ["monocytes", "monocyte", "monocytes %"] },
  { canonical: "eosinophils_pct", display: "Eosinophils", aliases: ["eosinophils", "eosinophil", "eosinophils %"] },
  { canonical: "basophils_pct", display: "Basophils", aliases: ["basophils", "basophil", "basophils %"] },
  { canonical: "urine_glucose", display: "Urine glucose", aliases: ["urine glucose", "urine sugar", "sugar urine"] },
  { canonical: "urine_protein", display: "Urine protein", aliases: ["urine protein", "urine albumin", "albumin urine", "protein urine"] },
  { canonical: "random_glucose", display: "Random blood glucose", family: "glucose", aliases: ["random blood sugar", "random blood glucose", "rbs", "random glucose"] },
  { canonical: "postprandial_glucose", display: "Postprandial blood glucose", family: "glucose", aliases: ["post prandial blood sugar", "postprandial blood sugar", "ppbs", "2 hour post prandial", "postprandial glucose"] },
  { canonical: "glucose", display: "Fasting blood glucose", family: "glucose", aliases: ["fasting blood sugar", "blood sugar fasting", "fasting glucose", "fbs", "fbg", "glucose fasting", "fasting plasma glucose", "blood sugar", "blood glucose", "glucose", "random sugar"] },
  { canonical: "hba1c", display: "Hemoglobin A1c (HbA1c)", aliases: ["hba1c", "glycated hemoglobin", "glycated haemoglobin", "a1c", "hemoglobin a1c", "glycohemoglobin"] },
  { canonical: "hdl_cholesterol", display: "HDL cholesterol", family: "cholesterol", aliases: ["hdl cholesterol", "hdl", "high density lipoprotein"] },
  { canonical: "ldl_cholesterol", display: "LDL cholesterol", family: "cholesterol", aliases: ["ldl cholesterol", "ldl", "low density lipoprotein"] },
  { canonical: "vldl", display: "VLDL cholesterol", family: "cholesterol", aliases: ["vldl", "vldl cholesterol"] },
  { canonical: "total_cholesterol", display: "Total cholesterol", family: "cholesterol", aliases: ["total cholesterol", "serum cholesterol", "cholesterol total", "cholesterol"] },
  { canonical: "triglycerides", display: "Triglycerides", family: "triglycerides", aliases: ["triglycerides", "triglyceride", "tg"] },
  { canonical: "creatinine", display: "Creatinine", family: "creatinine", aliases: ["creatinine", "serum creatinine", "s. creatinine", "plasma creatinine", "s creatinine"] },
  { canonical: "urea", display: "Urea", family: "urea", aliases: ["urea", "blood urea", "serum urea", "s. urea"] },
  { canonical: "bun", display: "Blood urea nitrogen (BUN)", family: "urea", aliases: ["bun", "blood urea nitrogen"] },
  { canonical: "uric_acid", display: "Uric acid", aliases: ["uric acid", "serum uric acid"] },
  { canonical: "sodium", display: "Sodium", aliases: ["sodium", "serum sodium"] },
  { canonical: "potassium", display: "Potassium", aliases: ["potassium", "serum potassium"] },
  { canonical: "chloride", display: "Chloride", aliases: ["chloride", "serum chloride"] },
  { canonical: "calcium", display: "Calcium", family: "calcium", aliases: ["calcium", "serum calcium"] },
  { canonical: "total_protein", display: "Total protein", aliases: ["total protein", "serum total protein"] },
  { canonical: "albumin", display: "Albumin", aliases: ["albumin", "serum albumin"] },
  { canonical: "globulin", display: "Globulin", aliases: ["globulin", "serum globulin"] },
  { canonical: "ag_ratio", display: "A/G ratio", aliases: ["a/g ratio", "albumin globulin ratio", "ag ratio"] },
  { canonical: "total_bilirubin", display: "Total bilirubin", family: "bilirubin", aliases: ["total bilirubin", "bilirubin total"] },
  { canonical: "direct_bilirubin", display: "Direct bilirubin", family: "bilirubin", aliases: ["direct bilirubin", "conjugated bilirubin"] },
  { canonical: "indirect_bilirubin", display: "Indirect bilirubin", family: "bilirubin", aliases: ["indirect bilirubin", "unconjugated bilirubin"] },
  { canonical: "alt", display: "ALT (SGPT)", aliases: ["sgpt", "alt", "alanine aminotransferase", "alt/sgpt"] },
  { canonical: "ast", display: "AST (SGOT)", aliases: ["sgot", "ast", "aspartate aminotransferase", "ast/sgot"] },
  { canonical: "alp", display: "Alkaline phosphatase (ALP)", aliases: ["alkaline phosphatase", "alp"] },
  { canonical: "ggt", display: "Gamma glutamyl transferase (GGT)", aliases: ["ggt", "gamma gt", "gamma glutamyl transferase"] },
  { canonical: "tsh", display: "Thyroid stimulating hormone (TSH)", aliases: ["tsh", "thyroid stimulating hormone", "thyrotropin"] },
  { canonical: "t3_total", display: "Triiodothyronine (T3)", aliases: ["t3", "triiodothyronine", "total t3"] },
  { canonical: "t4_total", display: "Thyroxine (T4)", aliases: ["t4", "thyroxine", "total t4"] },
  { canonical: "crp", display: "C-reactive protein (CRP)", aliases: ["crp", "c reactive protein", "c-reactive protein"] },
  { canonical: "esr", display: "Erythrocyte sedimentation rate (ESR)", aliases: ["esr", "erythrocyte sedimentation rate"] },
  { canonical: "ferritin", display: "Ferritin", aliases: ["ferritin", "serum ferritin"] },
  { canonical: "iron", display: "Serum iron", aliases: ["iron", "serum iron"] },
  { canonical: "tibc", display: "Total iron binding capacity (TIBC)", aliases: ["tibc", "total iron binding capacity"] },
  { canonical: "vitamin_b12", display: "Vitamin B12", aliases: ["vitamin b12", "vitamin b 12", "b12", "cobalamin"] },
  { canonical: "vitamin_d", display: "Vitamin D (25-OH)", aliases: ["vitamin d", "25 oh vitamin d", "25 hydroxy vitamin d", "25-hydroxyvitamin d", "25 oh vit d"] },
  { canonical: "pt", display: "Prothrombin time (PT)", aliases: ["pt", "prothrombin time"] },
  { canonical: "aptt", display: "Activated partial thromboplastin time (APTT)", aliases: ["aptt", "ap tt", "partial thromboplastin time", "ptt"] },
  { canonical: "inr", display: "International normalized ratio (INR)", aliases: ["inr"] },
  { canonical: "ddimer", display: "D-dimer", aliases: ["d dimer", "d-dimer"] },
  { canonical: "amylase", display: "Amylase", aliases: ["amylase", "serum amylase"] },
  { canonical: "lipase", display: "Lipase", aliases: ["lipase", "serum lipase"] },
  { canonical: "bicarbonate", display: "Bicarbonate (HCO3)", aliases: ["bicarbonate", "hco3", "co2 total", "carbon dioxide"] },
  { canonical: "creatine_kinase", display: "Creatine kinase (CK)", aliases: ["creatine kinase", "ck", "cpk"] },
  { canonical: "ldh", display: "Lactate dehydrogenase (LDH)", aliases: ["ldh", "lactate dehydrogenase"] },
  { canonical: "hiv", display: "HIV antibody", aliases: ["hiv", "hiv antibody", "hiv 1 & 2"] },
  { canonical: "hbsag", display: "HBsAg", aliases: ["hbsag", "hepatitis b surface antigen", "hbs antig"] },
  { canonical: "anti_hcv", display: "Anti-HCV", aliases: ["anti hcv", "hcv antibody", "hepatitis c antibody"] },
  { canonical: "blood_group", display: "Blood group", aliases: ["blood group", "abo blood group", "abo group", "blood grouping"] },
];

const UNIT_ALIASES = {
  "mgdl": "mg/dl", "mg/dl": "mg/dl",
  "mmoll": "mmol/l", "mmol/l": "mmol/l",
  "umoll": "umol/l", "µmol/l": "umol/l", "μmol/l": "umol/l", "mcmol/l": "umol/l",
  "gdl": "g/dl", "g/l": "g/l",
  "pgml": "pg/ml", "ngml": "ng/ml", "ngdl": "ng/dl", "ngl": "ng/l",
  "ugdl": "ug/dl", "ugl": "ug/l", "mcgdl": "ug/dl", "mcgl": "ug/l",
  "ul": "u/l", "iul": "iu/l", "miu/ml": "miu/ml", "u/ml": "uu/ml", "uul": "uu/ml", "mul": "mu/l",
  "%": "%",
  "/cumm": "/ul", "/ul": "/ul", "/mm3": "/ul", "/mm³": "/ul", "/mm^3": "/ul",
  "/cmm": "/ul", "cells/mm3": "/ul", "cells/cumm": "/ul", "/l": "/l",
  "/cumm(lakhs)": "/lakhs", "/ul(lakhs)": "/lakhs",
};

/** Convert a raw unit string to a canonical form for comparison. */
export function normalizeUnit(raw) {
  if (!raw) return "";
  let u = String(raw).trim().toLowerCase();
  u = u.replace(/[μµ]/g, "u").replace(/\s+/g, "");
  u = u.replace(/^(x|×)10[^0-9]*((\d+))?/i, "").replace(/^10[^0-9]*(\d+)/, ""); // strip lead "x10^3" for alias lookup
  if (UNIT_ALIASES[u]) return UNIT_ALIASES[u];
  // e.g. "x10^9/l" style or "10^3/ul" style left over
  if (/^10[^0-9]*\d+\//.test(u)) return u.replace(/^10[^0-9]*\d+/, "x").replace(/^x\//, "/");
  return u;
}

const cleanWord = (w) =>
  String(w)
    .toLowerCase()
    .replace(/[^a-z0-9%]/g, "")
    .trim();

const splitWords = (s) =>
  String(s)
    .split(/\s+/)
    .map(cleanWord)
    .filter(Boolean);

/** True when `sub` appears as a contiguous word sequence inside `words`. */
function containsWords(words, sub) {
  if (sub.length > words.length) return false;
  outer: for (let i = 0; i + sub.length <= words.length; i++) {
    for (let j = 0; j < sub.length; j++) {
      if (words[i + j] !== sub[j]) continue outer;
    }
    return true;
  }
  return false;
}

/**
 * Normalize a test name to a stable compare-key + display name.
 * Matching is word-boundary based so that a generic alias never swallows a
 * more specific test ("cholesterol" must not catch "LDL Cholesterol", and
 * "hba1c" must not catch "hb" or vice versa).
 */
export function normalizeTestName(raw) {
  const cleaned = String(raw || "")
    .replace(/\s*[:=\-]\s*$/, "")
    .trim();

  const words = splitWords(cleaned);
  if (words.length === 0) {
    return { key: "unknown", canonicalName: cleaned || "Unknown test", family: null, matchedAlias: null, raw: cleaned };
  }

  if (IGNORED_NAMES.has(words.join(""))) return null;

  for (const entry of ALIASES) {
    for (const alias of entry.aliases) {
      const anWords = splitWords(alias);
      if (!anWords.length) continue;
      // ultra-short single-word aliases (electrolyte symbols etc.) are not used
      if (anWords.length === 1 && anWords[0].length < 2) continue;
      if (containsWords(words, anWords)) {
        return {
          key: entry.canonical,
          canonicalName: entry.display,
          family: entry.family || null,
          matchedAlias: alias,
          raw: cleaned,
        };
      }
    }
  }

  const key = words.join("_") || "unknown";

  return { key, canonicalName: cleaned, family: null, matchedAlias: null, raw: cleaned };
}

/** Parse a numeric token including qualifiers (approx, <, >, ~). */
export function parseNumericValue(token) {
  if (token == null) return { num: null, qualifier: "", raw: "" };
  let s = String(token).trim();
  let qualifier = "";
  const qualMatch = s.match(/^(approx\.?|approximately|about|apx)[.:]?\s*/i);
  if (qualMatch) {
    qualifier = "~";
    s = s.slice(qualMatch[0].length);
  }
  if (/^[<>]/.test(s)) {
    qualifier += s[0] === ">" ? ">" : "<";
    s = s.slice(1);
    if (s.startsWith("=")) {
      qualifier += "=";
      s = s.slice(1);
    }
  }
  s = s.replace(/,/g, "").replace(/\s+/g, "");
  const n = parseFloat(s);
  return { num: Number.isFinite(n) ? n : null, qualifier, raw: String(token).trim() };
}

/** Extract low/high from a raw reference-range string. */
export function parseReferenceRange(value, raw) {
  if (raw == null) {
    if (value && /^<.*-$|^< *(\d)/.test(String(value))) return null;
    return null;
  }
  const s = String(raw);
  let text = s.replace(/^(ref\.?|reference|range|result|normal|expected)\s*/gi, "").trim();
  // strip trailing unit tokens from range text for numeric parsing
  const nums = text.match(/-?\d+(?:\.\d+)?/g) || [];
  const numeric = nums.map(Number);
  let low = null;
  let high = null;
  if (numeric.length >= 2) {
    low = Math.min(numeric[0], numeric[1]);
    high = Math.max(numeric[0], numeric[1]);
  } else if (numeric.length === 1) {
    const n = numeric[0];
    if (/<|less than|upto|up to/i.test(text)) high = n;
    else if (/>|greater than/i.test(text)) low = n;
    else if (/^[-–]/.test(text.trim())) high = n;
    else high = n;
  }
  return { low, high, text: s.trim() };
}

/** Determine result status against the stated reference range. */
export function deriveStatus(numericValue, low, high, flag) {
  if (flag && /^[HL]$/i.test(String(flag).trim())) return String(flag).toUpperCase();
  if (numericValue == null || !Number.isFinite(numericValue)) return null;
  if (low != null && high != null) {
    if (numericValue < low) return "LOW";
    if (numericValue > high) return "HIGH";
    return "NORMAL";
  }
  if (low != null && numericValue < low) return "LOW";
  if (high != null && numericValue > high) return "HIGH";
  if (low != null || high != null) return "NORMAL";
  return null;
}

const QUALITATIVE_VALUE =
  /^(negative|positive|reactive|non[- ]?reactive|normal|abnormal|trace|present|absent|nil|not[- ]?done|detected|not detected|weakly positive|strongly positive)$/i;

// Values that are actually dates must never be parsed as lab results.
const DATE_VALUE = /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/;

const QUALITATIVE_VALUE_HINTS =
  /^(negative|positive|reactive|non.?reactive|normal|abnormal|trace|not.?done|present|absent|nil|negative\s*\(.*\)|b\+|a\+|o\+|o-|ab\+|ab-|a-|b-)$/i;

const FAMILY_CONVERSIONS = {
  glucose: { canonicalUnit: "mg/dl", factors: { "mg/dl": 1, "mmol/l": 18.0182 } },
  cholesterol: { canonicalUnit: "mg/dl", factors: { "mg/dl": 1, "mmol/l": 38.67 } },
  triglycerides: { canonicalUnit: "mg/dl", factors: { "mg/dl": 1, "mmol/l": 88.57 } },
  creatinine: { canonicalUnit: "mg/dl", factors: { "mg/dl": 1, "umol/l": 1 / 88.4 } },
  calcium: { canonicalUnit: "mg/dl", factors: { "mg/dl": 1, "mmol/l": 1 / 0.2495 } },
  bilirubin: { canonicalUnit: "mg/dl", factors: { "mg/dl": 1, "umol/l": 1 / 17.1 } },
  urea: { canonicalUnit: "mg/dl", factors: { "mg/dl": 1, "mmol/l": 1 / 0.1667 } },
};

/**
 * Deterministic canonical conversion. Returns null when the conversion is NOT
 * validated/supported for the test family (never guessed).
 */
export function convertToCanonical(numericValue, unit, family) {
  if (numericValue == null || !Number.isFinite(numericValue)) return null;
  const u = normalizeUnit(unit || "");
  if (!u) return null;

  if (family === "cell_count") {
    // value is already exponent-adjusted at extraction; scale for /l vs /ul.
    const baseMult = u.includes("/l") ? 1e-6 : 1;
    if (!["/ul", "/cumm", "/mm3", "/cmm", "/l"].includes(u) && !u.includes("/l")) return null;
    return { value: numericValue * baseMult, unit: "/ul", originalUnit: unit, family };
  }

  const conv = FAMILY_CONVERSIONS[family];
  if (!conv) return null;
  if (!(u in conv.factors)) return null;
  return {
    value: numericValue * conv.factors[u],
    unit: conv.canonicalUnit,
    originalUnit: unit,
    family,
  };
}

/** Do two units belong to the same convertible group for a given family? */
export function unitsComparable(unitA, unitB, family) {
  const a = normalizeUnit(unitA || "");
  const b = normalizeUnit(unitB || "");
  if (!a && !b) return true; // both unknown units
  if (!a || !b) return false;
  if (a === b) return true;
  if (family === "cell_count") return true; // handled by canonical conversion
  const conv = FAMILY_CONVERSIONS[family];
  if (conv && a in conv.factors && b in conv.factors) return true;
  return false;
}

function matchReferenceRange(text) {
  // parenthesized or bracketed groups, e.g. (12.0 - 15.5), [0.6-1.2], (< 200), (4.0 to 5.6)
  const groups = [...String(text).matchAll(/[\(\[\(]([^\)\]]*)[\)\]]/g)].map((m) => m[1].trim());
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    const numbers = g.match(/\d+(?:\.\d+)?/g);
    if (!numbers || numbers.length === 0) continue;
    const hasRangeMark = /[-–—]|to\s|less|greater|<|>|upto|up to/i.test(g);
    const lowHigh = parseReferenceRange(null, g);
    // A group like "(Fasting)" has one number that is a label ("Fasting") -> no digits, skipped above.
    if (numbers.length >= 2 || hasRangeMark) {
      return { rawRange: g, low: lowHigh.low, high: lowHigh.high, rest: text.replace(/[\(\[\(][^\)\]]*[\)\]]/g, "").replace(/\s{2,}/g, " ").trim() };
    }
  }
  // labelled range: "Reference Range: 0.7 - 1.3" or "Ref: 135 - 145"
  const labelled = text.match(/ref(?:erence)?\s*range?\s*[:=]?\s*([\-–—]*\d+(?:\.\d+)?)\s*[-–—to]+\s*([\-–—]*\d+(?:\.\d+)?)/i);
  if (labelled) {
    const low = Math.min(Number(labelled[1]), Number(labelled[2]));
    const high = Math.max(Number(labelled[1]), Number(labelled[2]));
    return { rawRange: labelled[0].replace(/^ref(?:erence)?\s*range?\s*/i, "").trim(), low, high, rest: text.replace(new RegExp(labelled[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), " ").replace(/\s{2,}/g, " ").trim() };
  }
  return null;
}

function matchExponentToken(token) {
  // "10^3", "10³", "10^9", "x10^3", "×10^6"
  const m = String(token).match(/^(?:x|×)?10\s*(\^)?\s*([0-9³²¹]+)$/i) || String(token).match(/^10([³²¹])$/);
  if (!m) return null;
  let digits = m[2] || m[1] || "";
  if (/[³²¹]/.test(digits)) digits = digits.replace(/[³²¹]/g, (c) => ({ 3: "3", 2: "2", 1: "1" }[c]));
  const exp = parseInt(digits, 10);
  if (!Number.isFinite(exp)) return null;
  return Math.pow(10, exp);
}

function looksLikeUnitToken(token) {
  return /^[\/a-zµμ%³²¹0-9.*,\-]+$/i.test(token) && /[a-zµμ%]/.test(token) && !/^[\d.,]+$/.test(token);
}

function parseLabLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const refMatch = matchReferenceRange(trimmed);
  const rest = refMatch ? refMatch.rest : trimmed;
  const tokens = rest.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return null;

  // ---- find test name: longest leading prefix followed by a numeric or
  // qualitative value token ----
  let nameIdx = -1;
  for (let i = tokens.length - 1; i >= 1; i--) {
    const prefix = tokens.slice(0, i).join(" ");
    const next = tokens[i];
    if (
      /^[a-zA-Z]/.test(prefix.trim()) &&
      (/^[<>=~]?\-?[\d.]/.test(next) || QUALITATIVE_VALUE.test(next)) &&
      /^[a-zA-Z]/.test(prefix)
    ) {
      nameIdx = i;
      break;
    }
  }
  if (nameIdx === -1) return null;

  let nameRaw = tokens.slice(0, nameIdx).join(" ");
  nameRaw = nameRaw.replace(/\s*[:=]\s*$/, "").trim();
  if (!/[a-zA-Z]/.test(nameRaw)) return null;

  const normal = normalizeTestName(nameRaw);
  if (!normal) return null; // ignored header

  // ---- value + unit ----
  let i = nameIdx;
  let valueToken = tokens[i];

  // Dates must never be treated as laboratory values.
  if (DATE_VALUE.test(valueToken)) return null;
  let qualifier = "";
  // value token may be split e.g. "< 0.5" or "approx 4"
  const prelim = parseNumericValue(valueToken);
  if (prelim.num == null && prelim.qualifier && !prelim.qualifier.includes("~")) {
    // symbol only, e.g. "<" or ">"; consume next token too
    qualifier += prelim.qualifier;
    i += 1;
    if (i < tokens.length) valueToken = tokens[i];
  }
  const parsedValue = parseNumericValue(valueToken);
  qualifier = qualifier || parsedValue.qualifier;
  i += 1;

  // exponent marker: e.g. "x 10^3" or "10^3" following the value
  let multiplier = 1;
  if (tokens[i] === "x" || tokens[i] === "x" || tokens[i] === "X") {
    const expValue = matchExponentToken(tokens[i + 1]);
    if (expValue != null) {
      multiplier = expValue;
      i += 2;
    } else if (/^10/.test(tokens[i + 1] || "")) {
      i += 1;
    } else {
      i += 1;
    }
  } else {
    const expValue = matchExponentToken(tokens[i]);
    if (expValue != null) {
      multiplier = expValue;
      i += 1;
    }
  }

  // unit: next 1-2 tokens while they look like unit tokens
  const unitParts = [];
  while (i < tokens.length && unitParts.length < 2 && looksLikeUnitToken(tokens[i])) {
    unitParts.push(tokens[i]);
    i += 1;
  }
  let unit = unitParts.join(" ");

  // ---- classification ----
  const numericValue = parsedValue.num != null && multiplier ? parsedValue.num * multiplier : null;
  const isQualitative =
    numericValue == null &&
    (QUALITATIVE_VALUE_HINTS.test(valueToken) || /^[+-]$/.test(valueToken) || /^(neg|pos|nil|present|absent|reactive|trace)/i.test(valueToken));

  const ref = refMatch ? { low: refMatch.low, high: refMatch.high, text: refMatch.rawRange } : { low: null, high: null, text: "" };

  const knownTest = normal.matchedAlias != null;
  const confidence =
    !numericValue
      ? "low"
      : knownTest && (unit || ref.text)
        ? "high"
        : knownTest
          ? "medium"
          : "medium";
  const reviewRequired =
    confidence === "low" || qualifier.includes("<") || qualifier.includes(">") || qualifier.includes("~");

  const status = deriveStatus(numericValue, ref.low, ref.high, "");

  return {
    testName: nameRaw,
    normalizedName: normal.key,
    canonicalName: normal.canonicalName,
    family: normal.family,
    value: qualifier ? `${qualifier}${valueToken}` : valueToken,
    numericValue,
    qualifier,
    unit,
    referenceRange: ref.text,
    referenceLow: ref.low,
    referenceHigh: ref.high,
    flag: "",
    status,
    isNumeric: numericValue != null,
    isQualitative,
    confidence,
    reviewRequired,
    rawLine: trimmed.slice(0, 400),
    page: null,
  };
}

/**
 * Extract structured laboratory results from report text.
 * Deterministic only; anything ambiguous is flagged, never coerced.
 */
export function extractLabResults(text) {
  const warnings = [];
  const results = [];
  const lines = String(text || "").split(/\r?\n/);

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    if (!line || !line.trim()) continue;
    try {
      const parsed = parseLabLine(line);
      if (parsed) results.push(parsed);
    } catch (err) {
      warnings.push(`line ${idx + 1}: ${err.message}`);
    }
  }

  // De-duplicate by normalized test name (keep first occurrence).
  const unique = [];
  const seen = new Set();
  for (const r of results) {
    if (seen.has(r.normalizedName)) {
      warnings.push(`Duplicate test "${r.testName}" ignored (first occurrence kept).`);
      continue;
    }
    seen.add(r.normalizedName);
    unique.push(r);
  }

  return {
    method: "deterministic",
    results: unique,
    warnings,
    totalLines: lines.length,
    parsedLines: unique.length,
    generatedAt: new Date().toISOString(),
  };
}

function canonicalizeDate(value) {
  if (!value) return null;
  const m = String(value).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!m) return null;
  let [, a, b, year] = m;
  let day = parseInt(a, 10);
  let month = parseInt(b, 10);
  if (year.length === 2) year = `20${year}`;
  if (day > 12 && month <= 12) {
    // DD-MM-YYYY
  } else if (month > 12 && day <= 12) {
    const t = day; day = month; month = t;
  } else {
    // ambiguous; assume DD-MM-YYYY (Indian/UK lab conventions)
  }
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Best-effort detection of report/collection dates from report text. */
export function extractReportDates(text) {
  const src = String(text || "");
  const out = { reportDate: null, collectionDate: null };

  const find = (labels) => {
    for (const lbl of labels) {
      const re = new RegExp(`${lbl}\\s*[:=\\-]?\\s*(\\d{1,2}[/\\-]\\d{1,2}[/\\-]\\d{2,4})`, "i");
      const m = src.match(re);
      if (m) return canonicalizeDate(m[1]);
    }
    return null;
  };

  out.reportDate = find([
    "date of report", "reported date", "report date", "reporting date",
    "date reported", "date of issuance", "date of issue",
  ]);
  out.collectionDate = find([
    "specimen collected on", "collection date", "date of collection",
    "collected on", "sample collection date", "sample collected on",
    "date of sample collection", "specimen collection date",
  ]);

  if (!out.reportDate) {
    const any = src.match(/\b(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})\b/);
    if (any) out.reportDate = canonicalizeDate(any[1]);
  }
  return out;
}

export const META = { ALIASES, IGNORED_NAMES, FAMILY_CONVERSIONS };