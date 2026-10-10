/**
 * Patient health timeline — a single chronological view of:
 *  - patient-uploaded medical reports
 *  - appointments (scheduled / completed / cancelled)
 *  - clinician-entered diagnoses and medications
 *
 * Everything rendered here is fetched from the patient-scoped API; nothing is
 * invented client-side. Missing dates display as "Not recorded".
 */
import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useAuth, useClerk } from "@clerk/clerk-react";
import {
  FileText,
  CalendarClock,
  Stethoscope,
  Pill,
  RefreshCw,
  X,
  ShieldCheck,
  User,
  ClipboardList,
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const API_BASE = "http://localhost:4000";
const PAGE_LIMIT = 10;

const TYPE_META = {
  report: { label: "Report", icon: FileText, color: "bg-blue-50 text-blue-600 border-blue-100" },
  appointment: { label: "Appointment", icon: CalendarClock, color: "bg-amber-50 text-amber-600 border-amber-100" },
  diagnosis: { label: "Diagnosis", icon: Stethoscope, color: "bg-rose-50 text-rose-600 border-rose-100" },
  medication: { label: "Medication", icon: Pill, color: "bg-violet-50 text-violet-600 border-violet-100" },
};

const fmt = (v) => (v == null || v === "" ? "Not recorded" : String(v));

const EventDetailRows = ({ event }) => {
  const { type, meta } = event;
  const rows = [];
  if (type === "report") {
    rows.push(["Report file", meta.fileName]);
    rows.push(["Report date", meta.reportDate]);
    rows.push(["Collection date", meta.collectionDate]);
    rows.push(["Extracted lab results", meta.resultsCount != null ? `${meta.resultsCount}` : "Not extracted yet"]);
  } else if (type === "appointment") {
    rows.push(["Doctor", meta.doctorName]);
    rows.push(["Speciality", meta.speciality]);
    rows.push(["Time", meta.time]);
    rows.push(["Status", meta.status]);
    rows.push(["Rescheduled to", meta.rescheduledTo]);
    rows.push(["Payment", meta.paymentStatus]);
    rows.push(["Fees", meta.fees != null ? `₹${meta.fees}` : null]);
  } else if (type === "diagnosis") {
    rows.push(["Diagnosis", event.title]);
    rows.push(["Diagnosis code", meta.details?.code]);
    rows.push(["Recorded by", meta.clinician]);
    rows.push(["Linked appointment", meta.appointmentId ? "Yes" : "Not recorded"]);
    rows.push(["Clinician notes", meta.details?.notes]);
  } else if (type === "medication") {
    rows.push(["Medication", event.title]);
    rows.push(["Dose", meta.details?.dose]);
    rows.push(["Frequency", meta.details?.frequency]);
    rows.push(["Route", meta.details?.route]);
    rows.push(["Start date", meta.details?.startDate]);
    rows.push(["End date", meta.details?.endDate]);
    rows.push(["Status", meta.details?.status]);
    rows.push(["Prescribed by", meta.clinician]);
    rows.push(["Linked appointment", meta.appointmentId ? "Yes" : "Not recorded"]);
  }
  rows.push(["Notes", meta.notes]);
  rows.push(["Recorded on", event.recordedAt ? new Date(event.recordedAt).toLocaleDateString() : "Not recorded"]);

  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
      {rows.map(([label, value]) => (
        <div key={label} className="border-b border-slate-100 pb-2">
          <dt className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">{label}</dt>
          <dd className={`text-sm mt-0.5 ${value == null || value === "" ? "text-slate-400 italic" : "text-slate-700 font-medium"}`}>
            {fmt(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
};

const HealthTimeline = () => {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const clerk = useClerk();

  const [state, setState] = useState({ events: [], total: 0, page: 1, pages: 1, hasMore: false });
  const [filters, setFilters] = useState({ types: [], from: "", to: "" });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const buildUrl = useCallback(
    () => {
      const params = { page, limit: PAGE_LIMIT };
      if (filters.types.length) params.type = filters.types.join(",");
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      return { url: `${API_BASE}/api/patient/timeline`, params };
    },
    [filters, page]
  );

  const loadTimeline = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      const { url, params } = buildUrl();
      const res = await axios.get(url, { params, headers: { Authorization: `Bearer ${token}` } });
      setState(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load the timeline. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, getToken, buildUrl]);

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  const toggleType = (t) => {
    setPage(1);
    setFilters((f) => ({
      ...f,
      types: f.types.includes(t) ? f.types.filter((x) => x !== t) : [...f.types, t],
    }));
  };

  const setRange = (key, value) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  };

  const clearFilters = () => {
    setPage(1);
    setFilters({ types: [], from: "", to: "" });
  };

  const openDetail = async (eventId) => {
    setSelected(null);
    setDetailLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(`${API_BASE}/api/patient/timeline/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelected(res.data.event);
    } catch {
      setSelected(null);
    } finally {
      setDetailLoading(false);
    }
  };

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
            <ClipboardList className="mx-auto text-blue-600" size={36} />
            <h1 className="text-xl font-bold text-slate-900 mt-4">My Health Timeline</h1>
            <p className="text-sm text-slate-500 mt-2">
              Sign in to view your reports, appointments and clinician records in one chronological timeline.
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">My Health Timeline</h1>
            <p className="text-sm text-slate-500 mt-1">
              {state.total
                ? `${state.total} event${state.total === 1 ? "" : "s"} recorded across your care.`
                : "A chronological view of your care."}
            </p>
          </div>
          <a
            href="/reports/comparison"
            className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-xl text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-100"
          >
            Compare reports
          </a>
        </div>

        {/* Filters */}
        <div className="mt-6 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 mr-1">Type</span>
            {Object.entries(TYPE_META).map(([key, meta]) => {
              const Icon = meta.icon;
              const active = filters.types.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleType(key)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 ${
                    active ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={14} />
                  {meta.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="block text-[11px] uppercase tracking-wide text-slate-400 font-semibold mb-1">From</span>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => setRange("from", e.target.value)}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </label>
            <label className="block">
              <span className="block text-[11px] uppercase tracking-wide text-slate-400 font-semibold mb-1">To</span>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setRange("to", e.target.value)}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </label>
            {(filters.types.length > 0 || filters.from || filters.to) && (
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 border border-slate-200 hover:bg-slate-50"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="mt-6">
          {loading && (
            <div className="space-y-3" aria-label="Loading timeline events">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 animate-pulse h-20" />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="bg-white border border-rose-200 rounded-2xl p-6 text-center">
              <p className="text-sm text-rose-700">{error}</p>
              <button
                onClick={loadTimeline}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw size={15} /> Retry
              </button>
            </div>
          )}

          {!loading && !error && state.events.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
              <ClipboardList className="mx-auto text-slate-300" size={38} />
              <p className="text-slate-600 font-medium mt-3">No timeline events yet</p>
              <p className="text-sm text-slate-400 mt-1">
                {filters.types.length || filters.from || filters.to
                  ? "No events match the current filters."
                  : "Upload a medical report or book an appointment to get started."}
              </p>
              {filters.types.length || filters.from || filters.to ? (
                <button onClick={clearFilters} className="mt-4 text-sm font-semibold text-blue-600 hover:underline">
                  Clear filters
                </button>
              ) : null}
            </div>
          )}

          {!loading && !error && state.events.length > 0 && (
            <>
              <ol className="relative border-l border-slate-200 ml-3">
                {state.events.map((event) => {
                  const meta = TYPE_META[event.type] || TYPE_META.report;
                  const Icon = meta.icon;
                  return (
                    <li key={event.id} className="mb-4 ml-5">
                      <span
                        className={`absolute -ml-[30px] mt-1 inline-flex items-center justify-center w-8 h-8 rounded-full border ${meta.color}`}
                        aria-hidden="true"
                      >
                        <Icon size={15} />
                      </span>
                      <button
                        onClick={() => openDetail(event.id)}
                        className="w-full text-left bg-white border border-slate-200 rounded-2xl p-4 hover:border-blue-300 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-300"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            {meta.label}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                              event.source === "clinician"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-50 text-slate-600 border-slate-200"
                            }`}
                          >
                            {event.source === "clinician" ? <ShieldCheck size={12} /> : <User size={12} />}
                            {event.source === "clinician" ? "Clinician verified" : event.source === "patient-requested" ? "Patient requested" : "Patient upload"}
                          </span>
                        </div>
                        <p className="text-slate-800 font-semibold mt-1.5">{event.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Date: {event.dateLabel}
                          {event.meta?.status ? ` · Status: ${event.meta.status}` : ""}
                          {event.meta?.details?.status ? ` · ${event.meta.details.status}` : ""}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ol>

              {/* Pagination */}
              {state.pages > 1 && (
                <nav className="flex items-center justify-center gap-3 mt-6" aria-label="Timeline pagination">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-slate-500">
                    Page {state.page} of {state.pages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(state.pages, p + 1))}
                    disabled={!state.hasMore}
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50"
                  >
                    Next
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
      </div>

      {/* Detail modal */}
      {(selected || detailLoading) && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Timeline event details"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading && <p className="text-sm text-slate-500 text-center py-6">Loading details…</p>}
            {!detailLoading && selected && (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {TYPE_META[selected.type]?.label || selected.type}
                    </p>
                    <h2 className="text-lg font-bold text-slate-900">{selected.title}</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Date: {selected.dateLabel}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Source:{" "}
                      {selected.source === "clinician"
                        ? "Clinician record (verified)"
                        : selected.source === "patient-requested"
                          ? "Patient requested"
                          : "Patient uploaded report"}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    aria-label="Close details"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="mt-5">
                  <EventDetailRows event={selected} />
                </div>
              </>
            )}
            {!detailLoading && !selected && (
              <p className="text-sm text-slate-500 text-center py-6">Details could not be loaded.</p>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default HealthTimeline;
