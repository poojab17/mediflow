import mongoose from "mongoose";

// Structured laboratory result extracted from a report.
// Keeps the raw, source-supported values together with parsed numeric
// equivalents so that every comparison stays traceable to the report.
const labResultSchema = new mongoose.Schema(
  {
    testName: { type: String, default: "" },
    normalizedName: { type: String, default: "" },
    canonicalName: { type: String, default: "" },
    family: { type: String, default: null },
    // Raw value exactly as printed in the report.
    value: { type: String, default: "" },
    numericValue: { type: Number, default: null },
    qualifier: { type: String, default: "" },
    unit: { type: String, default: "" },
    status: { type: String, default: "" },
    referenceRange: { type: String, default: "" },
    referenceLow: { type: Number, default: null },
    referenceHigh: { type: Number, default: null },
    // Flag printed on the report itself (e.g. H / L).
    flag: { type: String, default: "" },
    isNumeric: { type: Boolean, default: false },
    isQualitative: { type: Boolean, default: false },
    confidence: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
    },
    reviewRequired: { type: Boolean, default: false },
    // Source line the result was extracted from (traceability).
    rawLine: { type: String, default: "" },
    page: { type: Number, default: null },
  },
  { _id: false }
);

const reportSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      default: "guest",
      index: true,
    },
    reportName: String,
    fileOriginalName: String,

    fileHash: {
      type: String,
      unique: true,
    },

    chromaChunkIds: [String],

    reportType: String,

    // ---------------- structured long-form storage ----------------
    // Stored at upload time for new reports; backfilled lazily for
    // older reports from ChromaDB text (never re-embedded).
    extractedText: String,
    pages: [{ page: Number, text: String, _id: false }],

    reportDate: String,
    collectionDate: String,

    labResults: [labResultSchema],
    labMethod: {
      type: String,
      enum: ["none", "deterministic", "ai"],
      default: "none",
    },
    labExtractedAt: Date,
  },
  {
    timestamps: true,
  }
);

const Report =
  mongoose.models.Report ||
  mongoose.model("Report", reportSchema);

export default Report;