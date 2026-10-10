import axios from "axios";

/**
 * AI-assisted comparison summary.
 *
 * The payload sent to the AI service is a structured JSON built ONLY from
 * extracted, source-supported values (test, value, unit, reference range,
 * status, report date). Free-form report text is never sent to this LLM
 * endpoint, and report text is never treated as instructions.
 *
 * If the AI service is unavailable / times out / returns malformed JSON, a
 * fully deterministic summary is produced instead. Every summary is clearly
 * labelled as informational decision support.
 */

const SUMMARY_URL = "http://localhost:8001/compare-summary";
const AI_TIMEOUT_MS = 20000;

export const DISCLAIMER =
  "This comparison is informational decision support and requires clinician review. " +
  "It is not a diagnosis, and it does not recommend medication changes. " +
  "Only a clinician can determine whether a change is clinically significant.";

const fmtDate = (d) => d || "date not recorded";

/** Build traceable findings from the comparison result. */
export function buildFindings(comparison) {
  const findings = [];
  const push = (testName, entryForReport, finding) => {
    findings.push({ testName, finding, ...entryForReport });
  };

  for (const row of comparison.rows) {
    for (const entry of row.entries) {
      if (entry.status === "HIGH" || entry.status === "LOW") {
        push(row.canonicalName, { reportId: entry.reportId, reportDate: fmtDate(entry.reportDate) },
          `Result ${entry.value}${entry.unit ? ` ${entry.unit}` : ""} is ${entry.status} relative to the stated reference range${entry.referenceRange ? ` (${entry.referenceRange})` : ""}.`);
      }
    }
    for (const change of row.changes) {
      const fromEntry = row.entries.find((e) => e.index === change.fromIndex);
      const toEntry = row.entries.find((e) => e.index === change.toIndex);
      if (!fromEntry || !toEntry) continue;
      if (change.comparable && change.direction !== "unchanged") {
        const valOf = (e) =>
          e.canonical ? `${e.canonical.value} ${e.canonical.unit}` : `${e.value}${e.unit ? ` ${e.unit}` : ""}`;
        push(row.canonicalName, { reportId: toEntry.reportId, reportDate: fmtDate(toEntry.reportDate) },
          `Value ${change.direction} from ${valOf(fromEntry)} to ${valOf(toEntry)}` +
          (change.percentageChange != null ? ` (${change.percentageChange > 0 ? "+" : ""}${change.percentageChange}%)` : "") +
          ` between ${fmtDate(fromEntry.reportDate)} and ${fmtDate(toEntry.reportDate)}.`);
      } else if (!change.comparable) {
        push(row.canonicalName, { reportId: toEntry.reportId, reportDate: fmtDate(toEntry.reportDate) },
          `Cannot be reliably compared: ${change.reason}.`);
      }
    }
    if (row.missingAtReportIndexes && row.entries.length > 0) {
      const latest = comparison.reports[comparison.reports.length - 1];
      const latestIndex = latest.index;
      if (row.missingAtReportIndexes.includes(latestIndex)) {
        const fromEntry = row.entries[row.entries.length - 1];
        push(row.canonicalName, { reportId: fromEntry.reportId, reportDate: fmtDate(fromEntry.reportDate) },
          `Present in earlier report${row.entries.length > 1 ? "s" : ""} but absent from the latest report (${fmtDate(latest.reportDate)}).`);
      }
      const earliest = comparison.reports[0];
      if (row.missingAtReportIndexes.includes(earliest.index)) {
        const toEntry = row.entries[0];
        push(row.canonicalName, { reportId: toEntry.reportId, reportDate: fmtDate(latest.reportDate) },
          `First appeared in report dated ${fmtDate(toEntry.reportDate)} and was not present in the earliest report.`);
      }
    }
  }
  return findings.slice(0, 40);
}

/** Deterministic fallback summary (AI independent). */
export function deterministicSummary(comparison, findings) {
  const lines = [];
  const stats = comparison.summaryStats;
  lines.push(`Compared ${comparison.reportCount} report(s) covering ${stats.totalTests} laboratory test(s) across the selected dates.`);
  if (stats.sharedTests) lines.push(`${stats.sharedTests} test(s) were present in every compared report.`);
  if (stats.newTests) lines.push(`${stats.newTests} test(s) first appeared only in the latest report.`);
  if (stats.missingTests) lines.push(`${stats.missingTests} test(s) were present earlier but absent from the latest report.`);
  if (stats.outOfRangeCount) lines.push(`${stats.outOfRangeCount} result(s) fall outside the reference range stated by their laboratory.`);
  if (stats.incomparablePairCount) lines.push(`${stats.incomparablePairCount} result pair(s) could not be reliably compared (e.g. different units, qualitative results, or values at detection limits).`);

  const changed = findings.filter((f) => /Value (increased|decreased)/.test(f.finding));
  const outside = findings.filter((f) => /is (HIGH|LOW) relative/.test(f.finding));
  const unreliable = findings.filter((f) => f.finding.startsWith("Cannot be reliably compared"));

  if (changed.length) {
    lines.push("Results that changed between reports:");
    changed.forEach((f) => lines.push(`- ${f.testName}: ${f.finding} (report ${fmtDate(f.reportDate)})`));
  }
  if (outside.length) {
    lines.push("Results outside the stated reference range:");
    outside.forEach((f) => lines.push(`- ${f.testName} (report ${fmtDate(f.reportDate)}): ${f.finding}`));
  }
  if (unreliable.length) {
    lines.push("Results that could not be reliably compared:");
    unreliable.forEach((f) => lines.push(`- ${f.testName}: ${f.finding}`));
  }
  if (!changed.length && !outside.length && !unreliable.length) {
    lines.push("No out-of-range results or meaningful differences were detected from the extracted values.");
  }

  lines.push(`However: ${DISCLAIMER}`);
  return lines.join("\n");
}

/** Convert comparison into a minimal structured payload for the AI service. */
function buildAiPayload(comparison, findings) {
  return {
    reportsMeta: comparison.reports.map((r) => ({ reportDate: r.reportDate, count: r.resultCount })),
    rows: comparison.rows.map((row) => ({
      testName: row.canonicalName,
      entries: row.entries.map((e) => ({
        reportDate: e.reportDate,
        value: e.value,
        unit: e.unit,
        referenceRange: e.referenceRange,
        status: e.status,
      })),
      changes: row.changes.map((c) => ({
        comparable: c.comparable,
        direction: c.direction || null,
        absoluteChange: c.absoluteChange ?? null,
        percentageChange: c.percentageChange ?? null,
        unit: c.unit || null,
        reason: c.reason || null,
      })),
      missingAtReportIndexes: row.missingAtReportIndexes,
    })),
    findings,
  };
}

export async function generateComparisonSummary(comparison) {
  const findings = buildFindings(comparison);

  try {
    const response = await axios.post(SUMMARY_URL, buildAiPayload(comparison, findings), {
      timeout: AI_TIMEOUT_MS,
      headers: { "Content-Type": "application/json" },
    });
    const data = response?.data || {};
    const text = typeof data.summary === "string" && data.summary.trim() ? data.summary.trim() : null;
    if (!text) throw new Error("AI summary empty or non-string");

    return {
      summary: text,
      findings,
      method: "ai",
      isInformational: true,
      disclaimer: DISCLAIMER,
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      summary: deterministicSummary(comparison, findings),
      findings,
      method: "deterministic",
      isInformational: true,
      disclaimer: DISCLAIMER,
      generatedAt: new Date().toISOString(),
    };
  }
}