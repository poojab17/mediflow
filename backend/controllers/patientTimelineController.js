import mongoose from "mongoose";
import Report from "../models/reportModel.js";
import Appointment from "../models/Appointment.js";
import ClinicalRecord from "../models/ClinicalRecord.js";
import { buildTimelineEvents, queryTimeline, findEvent } from "../services/timelineService.js";

function getUserId(req) {
  const auth = req.auth && typeof req.auth === "function" ? req.auth() : req.auth;
  return auth?.userId || null;
}

const parseOptionalInt = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const getPatientTimeline = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Authentication required" });

    const types = String(req.query.type || "")
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    const from = req.query.from || null;
    const to = req.query.to || null;
    const page = parseOptionalInt(req.query.page, 1);
    const limit = Math.min(50, parseOptionalInt(req.query.limit, 10));

    const [reports, appointments, clinicalRecords] = await Promise.all([
      Report.find({ userId }).sort({ createdAt: -1 }),
      Appointment.find({ $or: [{ owner: userId }, { createdBy: userId }] }).sort({ createdAt: -1 }),
      ClinicalRecord.find({ patientUserId: userId }).sort({ recordedAt: -1 }),
    ]);

    const events = buildTimelineEvents({ reports, appointments, clinicalRecords });
    const result = queryTimeline(events, { types, from, to, page, limit });

    return res.json({
      ...result,
      filters: { types, from, to },
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load patient timeline" });
  }
};

export const getTimelineEvent = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Authentication required" });

    const { eventId } = req.params;
    if (!eventId || !/^(report|appointment|clinical):[0-9a-fA-F]{24}$/.test(eventId)) {
      return res.status(400).json({ message: "Invalid event id" });
    }

    const [type, rawId] = eventId.split(":");
    let doc = null;
    if (type === "report") {
      doc = await Report.findOne({ _id: rawId, userId });
    } else if (type === "appointment") {
      doc = await Appointment.findOne({
        _id: rawId,
        $or: [{ owner: userId }, { createdBy: userId }],
      });
    } else if (type === "clinical") {
      doc = await ClinicalRecord.findOne({ _id: rawId, patientUserId: userId });
    }

    if (!doc) return res.status(404).json({ message: "Event not found" });

    const events = buildTimelineEvents({ reports: type === "report" ? [doc] : [], appointments: type === "appointment" ? [doc] : [], clinicalRecords: type === "clinical" ? [doc] : [] });
    const event = findEvent(events, eventId);

    return res.json({ event });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load event" });
  }
};

/**
 * Clinician-only endpoint (doctorAuth JWT) that records a diagnosis or
 * prescription for a patient. The patient identity is resolved server-side
 * from the linked appointment when possible, so arbitrary client-supplied
 * patient ids are never trusted as the source of truth.
 */
export const createClinicalRecord = async (req, res) => {
  try {
    const doctor = req.doctor;
    if (!doctor) return res.status(401).json({ message: "Clinician authentication required" });

    const { type, appointmentId, patientUserId, diagnosis, medication, date, notes } = req.body || {};

    if (!type || !["diagnosis", "medication"].includes(type)) {
      return res.status(400).json({ message: "type must be 'diagnosis' or 'medication'" });
    }

    let recordPatientUserId = String(patientUserId || "").trim();

    if (appointmentId) {
      if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
        return res.status(400).json({ message: "Invalid appointment id" });
      }
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) return res.status(404).json({ message: "Appointment not found" });
      recordPatientUserId = appointment.createdBy || appointment.owner || "";
    }

    if (!recordPatientUserId) {
      return res.status(400).json({
        message: "The appointment is not linked to a patient account; provide patientUserId instead",
      });
    }

    if (type === "diagnosis" && (!diagnosis || !String(diagnosis.name || "").trim())) {
      return res.status(400).json({ message: "diagnosis.name is required" });
    }
    if (type === "medication" && (!medication || !String(medication.name || "").trim())) {
      return res.status(400).json({ message: "medication.name is required" });
    }

    let clinicalDate = null;
    if (date) {
      const parsed = new Date(date);
      if (!Number.isNaN(parsed.getTime())) clinicalDate = parsed;
    }

    const record = await ClinicalRecord.create({
      patientUserId: recordPatientUserId,
      type,
      date: clinicalDate || (type === "medication" && medication?.startDate ? new Date(medication.startDate) : new Date()),
      source: "clinician",
      verifiedByClinician: true,
      clinician: {
        doctorId: doctor._id,
        doctorName: doctor.name || "Clinician",
      },
      appointmentId: appointmentId && mongoose.Types.ObjectId.isValid(appointmentId) ? appointmentId : null,
      diagnosis: type === "diagnosis" ? {
        name: String(diagnosis.name).trim(),
        code: String(diagnosis.code || "").trim(),
        notes: String(diagnosis.notes || "").trim(),
      } : undefined,
      medication: type === "medication" ? {
        name: String(medication.name).trim(),
        dose: String(medication.dose || "").trim(),
        frequency: String(medication.frequency || "").trim(),
        route: String(medication.route || "").trim(),
        startDate: medication.startDate ? new Date(medication.startDate) : null,
        endDate: medication.endDate ? new Date(medication.endDate) : null,
        status: ["active", "completed", "paused", "stopped"].includes(medication.status) ? medication.status : "active",
      } : undefined,
      notes: notes ? String(notes).trim() : "",
    });

    return res.status(201).json({ record });
  } catch (err) {
    console.error("createClinicalRecord error:", err.message);
    return res.status(500).json({ message: "Failed to create clinical record" });
  }
};