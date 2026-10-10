/**
 * Chronological patient health timeline.
 * Aggregates patient-uploaded reports, appointments and clinician-verified
 * records into a neutral event stream with filtering + pagination.
 * Never invents dates, diagnoses or results: anything missing is "Not recorded".
 */

function toIsoDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const y = parseInt(iso[1], 10);
    const m = parseInt(iso[2], 10);
    const d = parseInt(iso[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return null;
  }
  const dmy = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (!dmy) return null;
  let d = parseInt(dmy[1], 10);
  let m = parseInt(dmy[2], 10);
  let y = parseInt(dmy[3], 10);
  if (y < 100) y += 2000;
  if (d > 12 && m <= 12) { /* DD-MM-YYYY */ }
  else if (m > 12 && d <= 12) { const t = d; d = m; m = t; }
  if (d < 1 || d > 31 || m < 1 || m > 12) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const fmt = (d) => {
  if (!d) return null;
  const p = String(d).split("-");
  if (p.length !== 3) return d;
  return p[2] && p[1] && p[0] ? `${p[2]}/${p[1]}/${p[0]}` : d;
};

function reportEvent(r) {
  const dateIso = toIsoDate(r.reportDate || r.collectionDate);
  return {
    id: `report:${String(r._id || r.id)}`,
    type: "report",
    title: r.reportName || r.fileOriginalName || "Uploaded medical report",
    dateIso,
    dateLabel: dateIso ? fmt(dateIso) : "Not recorded",
    recordedAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
    source: "patient-upload",
    verified: false,
    meta: {
      reportId: String(r._id || r.id),
      fileName: r.reportName || r.fileOriginalName || "",
      reportDate: r.reportDate || null,
      collectionDate: r.collectionDate || null,
      resultsCount: Array.isArray(r.labResults) ? r.labResults.length : null,
      labMethod: r.labMethod || null,
      reviewRequired: Array.isArray(r.labResults) ? r.labResults.some((x) => x.reviewRequired) : false,
    },
  };
}

function appointmentEvent(a) {
  const dateIso = toIsoDate(a.date);
  return {
    id: `appointment:${String(a._id)}`,
    type: "appointment",
    title: `${a.doctorName || "Doctor"} appointment`,
    dateIso,
    dateLabel: dateIso ? fmt(dateIso) : "Not recorded",
    recordedAt: a.createdAt ? new Date(a.createdAt).toISOString() : null,
    source: "patient-requested",
    verified: false,
    meta: {
      appointmentId: String(a._id),
      status: a.status || "Unknown",
      doctorName: a.doctorName || "",
      speciality: a.speciality || "",
      time: a.time || "",
      fees: a.fees ?? null,
      paymentStatus: a.payment?.status || "",
      rescheduledTo: a.rescheduledTo?.date ? `${a.rescheduledTo.date}${a.rescheduledTo.time ? ` ${a.rescheduledTo.time}` : ""}` : null,
    },
  };
}

function clinicalRecordEvent(c) {
  const isDiagnosis = c.type === "diagnosis";
  const name = isDiagnosis
    ? c.diagnosis?.name || ""
    : c.medication?.name || "";
  const dateIso = toIsoDate(c.date ? new Date(c.date).toISOString().slice(0, 10) : null);
  const details = isDiagnosis
    ? {
      code: c.diagnosis?.code || "",
      notes: c.diagnosis?.notes || "",
    }
    : {
      dose: c.medication?.dose || "",
      frequency: c.medication?.frequency || "",
      route: c.medication?.route || "",
      startDate: c.medication?.startDate ? new Date(c.medication.startDate).toISOString().slice(0, 10) : null,
      endDate: c.medication?.endDate ? new Date(c.medication.endDate).toISOString().slice(0, 10) : null,
      status: c.medication?.status || "",
    };

  return {
    id: `clinical:${String(c._id)}`,
    type: isDiagnosis ? "diagnosis" : "medication",
    title: name || "Clinical record",
    dateIso,
    dateLabel: dateIso ? fmt(dateIso) : "Not recorded",
    recordedAt: c.recordedAt ? new Date(c.recordedAt).toISOString() : c.createdAt ? new Date(c.createdAt).toISOString() : null,
    source: "clinician",
    verified: c.verifiedByClinician !== false,
    meta: {
      recordId: String(c._id),
      clinician: c.clinician?.doctorName || "Clinician (name not recorded)",
      doctorId: c.clinician?.doctorId ? String(c.clinician.doctorId) : null,
      appointmentId: c.appointmentId ? String(c.appointmentId) : null,
      details,
      notes: c.notes || "",
      recordedAt: c.recordedAt ? new Date(c.recordedAt).toISOString() : null,
    },
  };
}

/**
 * Build a neutral, chronological event list from the raw records.
 * Events without a usable date sort last and display "Not recorded".
 */
export function buildTimelineEvents({ reports = [], appointments = [], clinicalRecords = [] } = {}) {
  const events = [
    ...reports.map(reportEvent),
    ...appointments.map(appointmentEvent),
    ...clinicalRecords.map(clinicalRecordEvent),
  ];

  events.sort((a, b) => {
    // dated events always precede "Not recorded" events
    if (a.dateIso && !b.dateIso) return -1;
    if (!a.dateIso && b.dateIso) return 1;
    if (a.dateIso && b.dateIso) {
      const c = b.dateIso.localeCompare(a.dateIso);
      if (c !== 0) return c;
    }
    const ra = a.recordedAt || 0;
    const rb = b.recordedAt || 0;
    return String(rb).localeCompare(String(ra));
  });

  return events;
}

const VALID_TYPES = new Set(["report", "appointment", "diagnosis", "medication"]);

/**
 * Filter by event types / date range and paginate.
 * Returns { events, total, page, limit, pages, hasMore }.
 */
export function queryTimeline(events, { types, from, to, page = 1, limit = 10 } = {}) {
  const typeSet = Array.isArray(types)
    ? new Set(types.filter((t) => VALID_TYPES.has(t)))
    : null;

  let filtered = events;
  if (typeSet && typeSet.size > 0) filtered = filtered.filter((e) => typeSet.has(e.type));
  // Date-range filtering excludes "Not recorded" events: they cannot be
  // placed inside a range without inventing a date.
  if (from) filtered = filtered.filter((e) => e.dateIso && e.dateIso >= from);
  if (to) filtered = filtered.filter((e) => e.dateIso && e.dateIso <= to);

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / safeLimit));
  const start = (safePage - 1) * safeLimit;
  const pageEvents = filtered.slice(start, start + safeLimit);

  return {
    events: pageEvents,
    total,
    page: safePage,
    limit: safeLimit,
    pages,
    hasMore: start + safeLimit < total,
  };
}

export function findEvent(events, eventId) {
  if (!eventId) return null;
  return events.find((e) => e.id === String(eventId)) || null;
}