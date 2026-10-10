/**
 * Medical report comparison — pick 2-10 of your uploaded reports and see every
 * laboratory test side by side with:
 *  - source-supported values, units and reference ranges per report
 *  - change at a glance (direction handled with text + icon, never color alone)
 *  - a dependency-free trend chart with a text equivalent
 *  - an explicitly labelled, traceable AI-assisted summary (informational only)
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth, useClerk } from "@clerk/clerk-react";
import {
  FileText,
  FlaskConical,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CircleAlert,
  RefreshCw,
  Info,
  ShieldAlert,
  ArrowLeft,
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SimpleTrendChart from "../components/reports/SimpleTrendChart.jsx";

const API_BASE = "http://localhost:4000";
const MAX_SELECT = 10;
const MIN_SELECT = 2;

/* ---------------- small presentational helpers ---------------- */

const StatusBadge = ({ status }) => {
  const map = {
    HIGH: { label: "High", cls: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
    LOW: { label: "Low", cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
    NORMAL: { label: "In range", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  };
  if (!status || !map[status]) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  const m = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${m.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} aria-hidden="true" />
      {m.label}
    </span>
  );
};

const ChangeBadge = ({ change }) => {
  if (!change) return <span className="text-xs text-slate-400">—</span>;
  if (!change.comparable) {
    return (
      <span className="inline-flex items-start gap-1 text-[11px] text-slate-500">
        <CircleAlert size={13} className="mt-0.5 shrink-0 text-amber-500" />
        <span>Cannot compare — {change.reason}</span>
      </span>
    );
  }
  if (change.direction === "unchanged") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
        <Minus size={13} /> Unchanged
      </span>
    );
  }
  const dir = change.direction === "increased" ? "Increased" : "Decreased";
  const Icon = change.direction === "increased" ? ArrowUpRight : ArrowDownRight;
  const cls = change.direction === "increased" ? "text-rose-600" : "text-emerald-600";
  const pct = change.percentageChange != null ? ` (${change.percentageChange > 0 ? "+" : ""}${change.percentageChange}%)` : "";
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${cls}`}>
      <Icon size={13} />
      {dir} {Math.abs(change.absoluteChange)}{change.unit ? ` ${change.unit}` : ""}
      {pct}
    </span>
  );
};

const fmtDate = (d) => (d ? String(d).slice(0, 10) : null);

/* ---------------- page ---------------- */

const ReportComparison = () => {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const clerk = useClerk();

  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState([]); // selection order preserved
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState(null);
  const [result, setResult] = useState(null);
  const [chartTestKey, setChartTestKey] = useState(null);
  const [selectionNote, setSelectionNote] = useState("");

  const loadHistory = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      setLoadingHistory(true);
      setHistoryError(null);
      const token = await getToken();
      const res = await axios.get(`${API_BASE}/api/reports/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReports(res.data.reports || []);
    } catch (err) {
      setHistoryError(err?.response?.data?.message || "Unable to load your reports. Please try again.");
    } finally {
      setLoadingHistory(false);
    }
  }, [isSignedIn, getToken]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const toggleReport = (id) => {
    setSelectionNote("");
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SELECT) {
        setSelectionNote(`You can compare up to ${MAX_SELECT} reports at once.`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const runCompare = async () => {
    if (selected.length < MIN_SELECT || selected.length > MAX_SELECT) return;
    try {
      setComparing(true);
      setCompareError(null);
      setResult(null);
      const token = await getToken();
      const res = await axios.post(
        `${API_BASE}/api/reports/compare`,
        { reportIds: selected },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult(res.data);
    } catch (err) {
      setCompareError(err?.response?.data?.message || "Comparison failed. Please try again.");
    } finally {
      setComparing(false);
    }
  };

  const comparison = result?.comparison;
  const summary = result?.summary;
  const warnings = result?.warnings || [];

  const chartTests = useMemo(() => {
    if (!comparison) return [];
    return comparison.rows.filter(
      (row) => (row.entries || []).filter((e) => Number.isFinite(Number(e.value))).length >= 2
    );
  }, [comparison]);

  // auto-select first chartable test when a new comparison lands
  useEffect(() => {
    if (chartTests.length && !chartTests.some((t) => t.testKey === chartTestKey)) {
      setChartTestKey(chartTests[0].testKey);
    }
  }, [chartTests, chartTestKey]);

  const chartRow = comparison ? chartTests.find((t) => t.testKey === chartTestKey) : null;

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-slate-500">Loading…</div>
        <Footer />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
            <FlaskConical className="mx-auto text-blue-600" size={36} />
            <h1 className="text-xl font-bold text-slate-900 mt-4">Report Comparison</h1>
            <p className="text-sm text-slate-500 mt-2">
              Sign in to compare your laboratory reports and see changes over time.
            </p>
            <button
              onClick={() => clerk.openSignIn()}
              className="mt-6 w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Sign in
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Report Comparison</h1>
            <p className="text-sm text-slate-500 mt-1">
              Compare laboratory results across your reports and review changes over time.
            </p>
          </div>
          <a
            href="/timeline"
            className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-xl text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-100"
          >
            <ArrowLeft size={15} /> Back to timeline
          </a>
        </div>

        {/* Report picker */}
        <section className="mt-6 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm" aria-label="Choose reports to compare">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-700">
              Select reports <span className="text-slate-400 font-normal">({MIN_SELECT}-{MAX_SELECT})</span>
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                {selected.length} selected
              </span>
              <button
                onClick={runCompare}
                disabled={comparing || selected.length < MIN_SELECT || selected.length > MAX_SELECT}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {comparing ? "Comparing…" : `Compare (${selected.length})`}
              </button>
            </div>
          </div>

          {selectionNote && <p className="mt-2 text-xs text-amber-700">{selectionNote}</p>}
          {compareError && (
            <div className="mt-3 flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-sm text-rose-700">
              <ShieldAlert size={15} /> {compareError}
            </div>
          )}

          <div className="mt-4">
            {loadingHistory && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => <div key={i} className="border border-slate-100 rounded-xl p-3 animate-pulse h-24" />)}
              </div>
            )}
            {!loadingHistory && historyError && (
              <div className="text-center py-6">
                <p className="text-sm text-rose-700">{historyError}</p>
                <button
                  onClick={loadHistory}
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline"
                >
                  <RefreshCw size={14} /> Retry
                </button>
              </div>
            )}
            {!loadingHistory && !historyError && reports.length === 0 && (
              <div className="text-center py-8">
                <FileText className="mx-auto text-slate-300" size={34} />
                <p className="text-sm text-slate-500 mt-2 font-medium">No reports uploaded yet</p>
                <a href="/curadesk-workspace" className="mt-2 inline-block text-sm font-semibold text-blue-600 hover:underline">
                  Upload your first report →
                </a>
              </div>
            )}
            {!loadingHistory && !historyError && reports.length > 0 && (
              <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {reports.map((report) => {
                  const checked = selected.includes(report.id);
                  return (
                    <li key={report.id}>
                      <label
                        className={`block border rounded-xl p-3 cursor-pointer transition-all ${
                          checked ? "border-blue-400 bg-blue-50/60 ring-1 ring-blue-200" : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <span className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleReport(report.id)}
                            className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-300"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-slate-800 truncate">{report.reportName}</span>
                            <span className="block text-xs text-slate-500 mt-0.5">
                              Report date: {fmtDate(report.reportDate) || "Not recorded"}
                            </span>
                            <span className="flex flex-wrap gap-1.5 mt-1.5">
                              <span className={`text-[11px] px-1.5 py-0.5 rounded-full border ${
                                report.resultsCount ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200"
                              }`}>
                                {report.resultsCount != null ? `${report.resultsCount} results extracted` : "Results not extracted"}
                              </span>
                              {report.reviewRequiredCount > 0 && (
                                <span className="text-[11px] px-1.5 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                                  {report.reviewRequiredCount} need review
                                </span>
                              )}
                            </span>
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Results */}
        {result && comparison && (
          <section className="mt-6 space-y-6" aria-label="Comparison results">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { label: "Tests compared", value: comparison.summaryStats.totalTests },
                { label: "In all reports", value: comparison.summaryStats.sharedTests },
                { label: "New in latest", value: comparison.summaryStats.newTests },
                { label: "Missing from latest", value: comparison.summaryStats.missingTests },
                { label: "Out of range", value: comparison.summaryStats.outOfRangeCount },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4 text-center shadow-sm">
                  <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
                <p className="font-semibold mb-1">Extraction notes</p>
                <ul className="list-disc pl-5 space-y-0.5 text-xs">
                  {warnings.slice(0, 10).map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}

            {/* AI summary */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <Info size={16} className="text-blue-600" />
                <h2 className="text-sm font-bold text-slate-800">Comparison summary</h2>
                <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${
                  summary?.method === "ai" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-100 text-slate-600 border-slate-200"
                }`}>
                  {summary?.method === "ai" ? "AI-assisted" : "Automated (deterministic)"}
                </span>
              </div>
              {summary && (
                <>
                  <div className="mt-3 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{summary.summary}</div>
                  {summary.findings?.length > 0 && (
                    <div className="mt-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Traceable findings</p>
                      <ul className="space-y-1.5">
                        {summary.findings.slice(0, 20).map((f, i) => (
                          <li key={i} className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                            <span className="font-semibold text-slate-700">{f.testName}</span>
                            {f.reportDate ? <span className="text-slate-400"> · report {f.reportDate}</span> : null}
                            <span className="block mt-0.5 text-slate-500">{f.finding}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-800">
                    <ShieldAlert size={15} className="mt-0.5 shrink-0" />
                    <p>{summary.disclaimer || "Informational decision support. Requires clinician review. Not a diagnosis."}</p>
                  </div>
                </>
              )}
            </div>

            {/* Trend chart */}
            {chartTests.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-sm font-bold text-slate-800">Trend charts</h2>
                  <label className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium">Test</span>
                    <select
                      value={chartTestKey || ""}
                      onChange={(e) => setChartTestKey(e.target.value)}
                      className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    >
                      {chartTests.map((t) => (
                        <option key={t.testKey} value={t.testKey}>{t.canonicalName}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="mt-4 max-w-3xl">
                  {chartRow ? (
                    <>
                      <SimpleTrendChart
                        title={`${chartRow.canonicalName} across compared reports`}
                        unit={chartRow.entries.find((e) => e.unit)?.unit || ""}
                        refLow={chartRow.entries.find((e) => e.referenceLow != null)?.referenceLow ?? null}
                        refHigh={chartRow.entries.find((e) => e.referenceHigh != null)?.referenceHigh ?? null}
                        points={comparison.reports
                          .map((report) => {
                            const entry = chartRow.entries.find((e) => e.index === report.index);
                            return entry ? { label: fmtDate(entry.reportDate) || `Report ${report.position + 1}`, value: entry.value } : null;
                          })
                          .filter(Boolean)}
                      />
                      <p className="mt-2 text-xs text-slate-400">
                        The table below shows the same values for direct comparison.
                      </p>
                    </>
                  ) : null}
                </div>
              </div>
            )}

            {/* Comparison table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-800">Comparison table</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Values exactly as extracted from each report. Reference ranges are the ones stated by that report's laboratory.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th scope="col" className="text-left px-4 py-3 font-semibold text-slate-600">Test</th>
                      {comparison.reports.map((report) => (
                        <th key={report.reportId} scope="col" className="text-left px-4 py-3 min-w-[10rem]">
                          <p className="font-semibold text-slate-700 leading-tight">{report.reportName}</p>
                          <p className="text-[11px] font-normal text-slate-400">
                            {fmtDate(report.reportDate) || "Date not recorded"}
                          </p>
                        </th>
                      ))}
                      <th scope="col" className="text-left px-4 py-3 font-semibold text-slate-600">Change between reports</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.rows.map((row) => (
                      <tr key={row.testKey} className="border-b border-slate-100 align-top hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">{row.canonicalName}</p>
                          {row.unitConflicts && (
                            <p className="text-[10px] text-slate-400 mt-0.5">Units differ between labs</p>
                          )}
                        </td>
                        {comparison.reports.map((report) => {
                          const entry = row.entries.find((e) => e.index === report.index);
                          if (!entry) {
                            return (
                              <td key={report.reportId} className="px-4 py-3">
                                <span className="italic text-slate-400 text-xs">Not recorded</span>
                                {row.missingAtReportIndexes.includes(report.index) && (
                                  <p className="text-[10px] text-slate-400 mt-1">
                                    {report.index === comparison.reports[comparison.reports.length - 1].index
                                      ? "Absent from latest report"
                                      : "Not present in this report"}
                                  </p>
                                )}
                              </td>
                            );
                          }
                          return (
                            <td key={report.reportId} className="px-4 py-3">
                              <p className="font-medium text-slate-800">
                                {entry.value}
                                {entry.unit ? <span className="text-slate-500 font-normal"> {entry.unit}</span> : null}
                              </p>
                              {entry.referenceRange ? (
                                <p className="text-[11px] text-slate-400 mt-0.5">Ref: {entry.referenceRange}</p>
                              ) : null}
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                <StatusBadge status={entry.status} />
                                {(entry.reviewRequired || entry.isQualitative) && (
                                  <span className="text-[10px] text-amber-700 font-semibold">Review required</span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 min-w-[12rem]">
                          {comparison.reports.length === 2 ? (
                            <ChangeBadge change={row.changes[0]} />
                          ) : (
                            <ul className="space-y-1">
                              {comparison.reports.slice(1).map((report, idx) => {
                                const prev = comparison.reports[idx];
                                const change = row.changes.find((c) => c.fromIndex === prev.index && c.toIndex === report.index);
                                return change && change.comparable ? (
                                  <li key={report.reportId}>
                                    <span className="text-[10px] text-slate-400 mr-1">{(idx + 1)}→{(idx + 2)}:</span>
                                    <ChangeBadge change={change} />
                                  </li>
                                ) : null;
                              })}
                              {row.changes.some((c) => !c.comparable) && (
                                <li className="pt-1">
                                  <ChangeBadge change={row.changes.find((c) => !c.comparable)} />
                                </li>
                              )}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ReportComparison;