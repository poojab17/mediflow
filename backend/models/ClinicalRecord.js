import mongoose from "mongoose";

/**
 * Clinician-entered health record (diagnosis or prescription) attached to a
 * patient's Clerk account. Patients can only ever read their own records;
 * records are created only through the authenticated clinician (doctorAuth)
 * endpoint, so the source of truth is always a verified clinician.
 */
const clinicalRecordSchema = new mongoose.Schema(
  {
    // Clerk userId of the patient this record belongs to.
    patientUserId: { type: String, required: true, index: true },

    type: {
      type: String,
      enum: ["diagnosis", "medication"],
      required: true,
    },

    // Clinical date shown on the timeline. When absent the record is placed
    // at the end of the timeline as "Not recorded".
    date: { type: Date, default: null, index: true },

    // Provenance: always clinician-entered for this model.
    source: {
      type: String,
      enum: ["clinician"],
      default: "clinician",
    },
    verifiedByClinician: { type: Boolean, default: true },

    clinician: {
      doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Doctor",
        default: null,
      },
      doctorName: { type: String, default: "" },
    },

    // Records may be tied back to the appointment where the care was given.
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },

    diagnosis: {
      name: { type: String, default: "" },
      code: { type: String, default: "" },
      notes: { type: String, default: "" },
    },

    medication: {
      name: { type: String, default: "" },
      dose: { type: String, default: "" },
      frequency: { type: String, default: "" },
      route: { type: String, default: "" },
      startDate: { type: Date, default: null },
      endDate: { type: Date, default: null },
      status: {
        type: String,
        enum: ["active", "completed", "paused", "stopped"],
        default: "active",
      },
    },

    notes: { type: String, default: "" },

    recordedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Timeline-friendly lookups.
clinicalRecordSchema.index({ patientUserId: 1, date: -1 });

const ClinicalRecord =
  mongoose.models.ClinicalRecord ||
  mongoose.model("ClinicalRecord", clinicalRecordSchema);

export default ClinicalRecord;