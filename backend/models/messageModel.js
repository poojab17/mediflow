import mongoose from "mongoose";

const messageSchema =
  new mongoose.Schema(

    {

      chatSessionId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "ChatSession",
        required: true,
      },

      role: {
        type: String,
        enum: [
          "user",
          "assistant",
        ],
        required: true,
      },

      text: {
        type: String,
        required: true,
      },

      doctors: {
        type: Array,
        default: [],
      },

      safety: {

        riskLevel: String,

        severityScore: Number,

        requiresUrgentCare: Boolean,

        recommendedAction: String,

        reason: String
      }

    },

    {
      timestamps: true,
    }
  );

const Message =
  mongoose.model(
    "Message",
    messageSchema
  );

export default Message;