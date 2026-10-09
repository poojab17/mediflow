import Doctor from "../models/doctor.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utilities/cloudinary.js";
import jwt from "jsonwebtoken";
import Appointment from "../models/Appointment.js";

/* =========================
   HELPER FUNCTIONS
========================= */

// Convert 12hr time to minutes
const parseTimeToMinutes = (t = "") => {
  const [time = "0:00", ampm = ""] = (t || "").split(" ");
  const [hh = 0, mm = 0] = time.split(":").map(Number);
  let h = hh % 12;
  if (ampm.toUpperCase() === "PM") h += 12;
  return h * 60 + (mm || 0);
};

function dedupeAndSortSchedule(schedule = {}) {
  const out = {};
  Object.entries(schedule).forEach(([date, slots]) => {
    if (!Array.isArray(slots)) return;
    const uniq = Array.from(new Set(slots));
    uniq.sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));
    out[date] = uniq;
  });
  return out;
}

function parseScheduleInput(s) {
  if (!s) return {};
  if (typeof s === "string") {
    try {
      s = JSON.parse(s);
    } catch {
      return {};
    }
  }
  return dedupeAndSortSchedule(s || {});
}

function normalizeDocForClient(raw = {}) {
  const doc = { ...raw };

  if (doc.schedule && typeof doc.schedule.forEach === "function") {
    const obj = {};
    doc.schedule.forEach((val, key) => {
      obj[key] = Array.isArray(val) ? val : [];
    });
    doc.schedule = obj;
  }

  doc.availability = doc.availability ?? "Available";
  doc.patients = doc.patients ?? "";
  doc.rating = doc.rating ?? 0;
  doc.fee = doc.fee ?? 0;

  return doc;
}

/* =========================
   CREATE DOCTOR
========================= */

export async function createDoctor(req, res) {
  try {
    const body = req.body || {};

    if (!body.name || !body.email || !body.password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required."
      });
    }

    const emailLC = body.email.toLowerCase();

    if (await Doctor.findOne({ email: emailLC })) {
      return res.status(409).json({
        success: false,
        message: "Email already in use."
      });
    }

    let imageUrl = null;
    let imagePublicId = null;

    if (req.file?.path) {
      const uploaded = await uploadToCloudinary(req.file.path, "doctors");
      imageUrl = uploaded?.secure_url || null;
      imagePublicId = uploaded?.public_id || null;
    }

    const doc = new Doctor({
      name: body.name,
      email: emailLC,
      password: body.password,
      specialization: body.specialization || "",
      imageUrl,
      imagePublicId,
      availability: body.availability || "Available",
      experience: body.experience || "",
      qualifications: body.qualifications || "",
      location: body.location || "",
      about: body.about || "",
      fee: body.fee ? Number(body.fee) : 0,
      schedule: parseScheduleInput(body.schedule),
      patients: body.patients || "",
      rating: body.rating ? Number(body.rating) : 0,
    });

    await doc.save();

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({
        success: false,
        message: "Server Misconfigured"
      });
    }

    const token = jwt.sign(
      { id: doc._id.toString(), email: doc.email, role: "doctor" },
      secret,
      { expiresIn: "7d" }
    );

    const out = normalizeDocForClient(doc.toObject());
    delete out.password;

    return res.status(201).json({
      success: true,
      data: out,
      token
    });

  } catch (err) {
    console.error("CreateDoctor error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

/* =========================
   GET ALL DOCTORS
========================= */

export const getDoctors = async (req, res) => {
  try {
    const docs = await Doctor.find().select("-password").lean();

    const doctorsWithEarnings = await Promise.all(
      docs.map(async (doc) => {

        const earningsAgg = await Appointment.aggregate([
          {
            $match: {
              doctorId: doc._id,
              "payment.status": "Paid"
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$fees" }
            }
          }
        ]);

        return {
          ...doc,
          earnings: earningsAgg[0]?.total || 0
        };
      })
    );

    const normalized = doctorsWithEarnings.map(d =>
      normalizeDocForClient(d)
    );

    return res.json({
      success: true,
      data: normalized
    });

  } catch (err) {
    console.error("getDoctors error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* =========================
   GET DOCTOR BY ID
========================= */

export async function getDoctorById(req, res) {
  try {
    const { id } = req.params;
    const doc = await Doctor.findById(id).select("-password").lean();

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found"
      });
    }

    return res.json({
      success: true,
      data: normalizeDocForClient(doc)
    });

  } catch (err) {
    console.error("getDoctorById error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

/* =========================
   UPDATE DOCTOR
========================= */

export async function updateDoctor(req, res) {
  try {
    const { id } = req.params;

    console.log("BODY RECEIVED:", req.body); // 🔥 DEBUG

    const doc = await Doctor.findById(id);
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found"
      });
    }

    const body = req.body || {};

    // ✅ FIX: parse schedule if coming from FormData
    let parsedSchedule = {};
    if (body.schedule) {
      try {
        parsedSchedule =
          typeof body.schedule === "string"
            ? JSON.parse(body.schedule)
            : body.schedule;
      } catch {
        parsedSchedule = {};
      }
    }

    // ✅ SAFE FIELD UPDATES
    if (body.name !== undefined) doc.name = body.name;
    if (body.specialization !== undefined) doc.specialization = body.specialization;
    if (body.experience !== undefined) doc.experience = body.experience;
    if (body.qualifications !== undefined) doc.qualifications = body.qualifications;
    if (body.location !== undefined) doc.location = body.location;
    if (body.about !== undefined) doc.about = body.about;

    if (body.fee !== undefined) doc.fee = Number(body.fee);
    if (body.patients !== undefined) doc.patients = Number(body.patients);
    if (body.rating !== undefined) doc.rating = Number(body.rating);

    if (body.availability !== undefined) doc.availability = body.availability;

    if (body.schedule !== undefined) {
      doc.schedule = parsedSchedule;
    }

    // ✅ HANDLE IMAGE (no break)
    if (req.file?.path) {
      const uploaded = await uploadToCloudinary(req.file.path, "doctors");
      doc.imageUrl = uploaded?.secure_url || doc.imageUrl;
      doc.imagePublicId = uploaded?.public_id || doc.imagePublicId;
    }

    await doc.save();

    const out = normalizeDocForClient(doc.toObject());
    delete out.password;

    return res.json({
      success: true,
      data: out
    });

  } catch (err) {
    console.error("updateDoctor error:", err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
}
/* =========================
   DELETE DOCTOR
========================= */

export async function deleteDoctor(req, res) {
  try {
    const { id } = req.params;
    const doc = await Doctor.findById(id);

    if (!doc) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    if (doc.imagePublicId) {
      await deleteFromCloudinary(doc.imagePublicId);
    }

    await Doctor.findByIdAndDelete(id);

    return res.json({ success: true, message: "Doctor Removed" });

  } catch (err) {
    console.error("deleteDoctor error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

/* =========================
   TOGGLE AVAILABILITY
========================= */

export async function toggleAvailability(req, res) {
  try {
    const { id } = req.params;
    const doc = await Doctor.findById(id);

    if (!doc) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    doc.availability =
      doc.availability === "Available" ? "Unavailable" : "Available";

    await doc.save();

    return res.json({ success: true, data: doc });

  } catch (err) {
    console.error("toggleAvailability error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

/* =========================
   LOGIN DOCTOR
========================= */

export async function doctorLogin(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and Password are required"
      });
    }

    const doc = await Doctor.findOne({ email: email.toLowerCase() }).select("+password");

    if (!doc || doc.password !== password) {
      return res.status(401).json({
        success: false,
        message: "Invalid Credentials"
      });
    }

    const secret = process.env.JWT_SECRET;

    const token = jwt.sign(
      { id: doc._id.toString(), email: doc.email, role: "doctor" },
      secret,
      { expiresIn: "7d" }
    );

    const out = doc.toObject();
    delete out.password;

    return res.json({ success: true, token, data: out });

  } catch (err) {
    console.error("doctorLogin error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}