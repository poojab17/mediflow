import {
  convertToCanonical,
  deriveStatus,
  normalizeTestName,
  normalizeUnit,
  unitsComparable,
} from "./labExtractionService.js";

const round = (n, dp = 1) => {
  if (!Number.isFinite(n)) return null;
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
};

/** Convert report date strings (YYYY-MM-DD or DD/MM/YYYY) to a sortable key. */
export function parseReportDateValue(value) {
  if (!value) return null;
  const s = String(value).trim();
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    if (parseInt(iso[2], 10) > 12 || parseInt(iso[3], 10) > 31) return null;
    return { iso: `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}` };
  }
  const dmy = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (!dmy) return null;
  let d = parseInt(dmy[1], 10);
  let m = parseInt(dmy[2], 10);
  let y = parseInt(dmy[3], 10);
  if (y < 100) y += 2000;
  if (d > 12 && m <= 12) {
    // DD-MM-YYYY
  } else if (m > 12 && d <= 12) {
    const t = d; d = m; m = t;
  } else {
    // ambiguous -> assume DD-MM (Indian/UK lab convention)
  }
  if (d < 1 || d > 31 || m < 1 || m > 12) return null;
  return { iso: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` };
}

function entryView(result, set) {
  const numeric = result.isNumeric && result.numericValue != null ? result.numericValue : null;
  const canonical = numeric != null ? convertToCanonical(numeric, result.unit, result.family) : null;
  const status = deriveStatus(numeric, result.referenceLow, result.referenceHigh, result.flag || "");
  return {
    reportId: String(set.reportId),
    reportName: set.reportName || "Report",
    reportDate: set.reportDate || null,
    value: result.value || "",
    numericValue: numeric,
    qualifier: result.qualifier || "",
    unit: result.unit || "",
    canonical: canonical ? { value: canonical.value, unit: canonical.unit } : null,
    status,
    referenceRange: result.referenceRange || "",
    isQualitative: !!result.isQualitative,
    isNumericValue: numeric != null,
    reviewRequired: !!result.reviewRequired,
    unitNormalized: normalizeUnit(result.unit),
  };
}

function pairComparability(a, b) {
  if (!a.isNumericValue || !b.isNumericValue) {
    return {
      comparable: false,
      reason: a.isQualitative || b.isQualitative
        ? "qualitative / non-numeric result (not comparable numerically)"
        : "missing numeric value",
    };
  }
  if (a.qualifier || b.qualifier) {
    return {
      comparable: false,
      reason: "value is approximate or at detection limit (not compared numerically)",
    };
  }
  if (a.canonical && b.canonical) {
    if (a.canonical.unit !== b.canonical.unit) {
      return { comparable: false, reason: `different units (${a.unit} vs ${b.unit}) cannot be compared` };
    }
    return { comparable: true, a: a.canonical.value, b: b.canonical.value, unit: a.canonical.unit };
  }
  if (unitsComparable(a.unit, b.unit, null) || (!a.unitNormalized && !b.unitNormalized)) {
    return { comparable: true, a: a.numericValue, b: b.numericValue, unit: a.unitNormalized || "" };
  }
  const reason = a.unitNormalized === b.unitNormalized
    ? "missing reference values"
    : `different units (${a.unit || "none"} vs ${b.unit || "none"}) not convertible for this test`;
  return { comparable: false, reason };
}

function buildRow(group, order) {
  const entries = [];
  const missingAtReportIndexes = [];
  order.forEach((set) => {
    const result = group.entries[set.__index];
    if (result) entries.push({ index: set.__index, ...entryView(result, set) });
    else missingAtReportIndexes.push(set.__index);
  });

  const changes = [];
  for (let k = 1; k < entries.length; k++) {
    const prev = entries[k - 1];
    const curr = entries[k];
    const cmp = pairComparability(prev, curr);
    if (!cmp.comparable) {
      changes.push({ fromIndex: prev.index, toIndex: curr.index, comparable: false, reason: cmp.reason });
      continue;
    }
    const absoluteChange = round(cmp.b - cmp.a);
    const pct = cmp.a === 0 ? null : round(((cmp.b - cmp.a) / Math.abs(cmp.a)) * 100, 1);
    const direction = absoluteChange === 0 ? "unchanged" : absoluteChange > 0 ? "increased" : "decreased";
    changes.push({
      fromIndex: prev.index,
      toIndex: curr.index,
      comparable: true,
      absoluteChange,
      percentageChange: pct === 0 ? 0 : pct,
      direction,
      unit: cmp.unit,
      statusFrom: prev.status,
      statusTo: curr.status,
    });
  }

  const firstEntry = entries.find((e) => e.index === order[0].__index) || entries[0];
  const lastEntry = entries[entries.length - 1] || null;

  return {
    testKey: group.testKey,
    canonicalName: group.canonicalName,
    entries,
    firstEntry,
    lastEntry,
    presentInAllReports: entries.length === order.length,
    missingAtReportIndexes,
    changes,
    unitConflicts: new Set(entries.map((e) => e.unit).filter(Boolean)).size > 1,
  };
}

/**
 * Compare structured lab results across two or more reports.
 *
 * `reportResultSets`: array of
 *   { reportId, reportName, reportDate, collectionDate, results: [...] }
 *
 * The output keeps every value attributable to its original report (id + date)
 * so the frontend only ever renders source-supported numbers.
 */
export function compareReports(reportResultSets) {
  const sets = reportResultSets.map((s, i) => ({
    ...s,
    __index: i,
    reportDateKey: parseReportDateValue(s.reportDate || s.collectionDate)?.iso || null,
  }));

  const order = sets
    .map((s) => s)
    .sort((a, b) => {
      if (a.reportDateKey && b.reportDateKey) return a.reportDateKey.localeCompare(b.reportDateKey);
      if (a.reportDateKey) return 1;
      if (b.reportDateKey) return -1;
      return a.__index - b.__index;
    });

  const byTest = new Map();
  sets.forEach((set) => {
    (set.results || []).forEach((r) => {
      const key = r.normalizedName || normalizeTestName(r.testName || "").key || "unknown";
      if (!byTest.has(key)) {
        byTest.set(key, { testKey: key, canonicalName: r.canonicalName || r.testName || key, entries: {} });
      }
      byTest.get(key).entries[set.__index] = r;
    });
  });

  const rows = [...byTest.values()].map((group) => buildRow(group, order));
  rows.sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));

  const latest = order[order.length - 1];
  const earliest = order[0];

  const newTests = rows.filter((r) => r.lastEntry && r.lastEntry.index === latest.__index && r.missingAtReportIndexes.includes(earliest.__index));
  const missingTests = rows.filter((r) => r.firstEntry && r.firstEntry.index === earliest.__index && r.missingAtReportIndexes.includes(latest.__index));

  let changedTests = 0;
  let incomparablePairs = 0;
  const incomparabilityReasons = new Map();
  rows.forEach((r) => {
    r.changes.forEach((c) => {
      if (!c.comparable) {
        incomparablePairs += 1;
        if (!incomparabilityReasons.has(c.reason)) incomparabilityReasons.set(c.reason, { reason: c.reason, tests: [] });
        incomparabilityReasons.get(c.reason).tests.push(r.canonicalName);
      } else if (c.direction !== "unchanged") {
        changedTests += 1;
      }
    });
  });

  let outOfRangeCount = 0;
  rows.forEach((r) => r.entries.forEach((e) => { if (e.status === "HIGH" || e.status === "LOW") outOfRangeCount += 1; }));

  return {
    generatedAt: new Date().toISOString(),
    reportCount: sets.length,
    // emitted in chronological order; `index` is the caller's original
    // position — the same index used by row.entries[].index and
    // row.changes[].fromIndex/toIndex — so clients can join reliably.
    reports: order.map((s, i) => ({
      index: s.__index,
      position: i,
      reportId: String(s.reportId),
      reportName: s.reportName || "Report",
      reportDate: s.reportDate || null,
      collectionDate: s.collectionDate || null,
      resultCount: (s.results || []).length,
    })),
    rows,
    summaryStats: {
      totalTests: rows.length,
      sharedTests: rows.filter((r) => r.presentInAllReports).length,
      newTests: newTests.length,
      missingTests: missingTests.length,
      changedPairCount: changedTests,
      incomparablePairCount: incomparablePairs,
      incomparabilityReasons: [...incomparabilityReasons.values()],
      outOfRangeCount,
    },
  };
}