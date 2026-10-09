import mongoose from "mongoose";

const reportSchema =
  new mongoose.Schema({

    userId: {
      type: String,
      default: "guest",
    },

    reportName: String,

    fileHash: {
      type: String,
      unique: true,
    },

    chromaChunkIds: [String],

    reportType: String,

  }, {
    timestamps: true,
  });

const Report =
  mongoose.model(
    "Report",
    reportSchema
  );

export default Report;