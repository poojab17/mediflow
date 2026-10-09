import mongoose from "mongoose";

const chatSessionSchema =
  new mongoose.Schema(

    {

      userId: {

        type: String,

        required: true,
      },

      reportHash: {

        type: String,

        default: null,
      },

      lastClearedAt: {

        type: Date,

        default: Date.now,
      },

    },

    {

      timestamps: true,
    }
  );

const ChatSession =

  mongoose.model(

    "ChatSession",

    chatSessionSchema
  );

export default ChatSession;