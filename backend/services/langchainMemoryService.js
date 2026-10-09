import Message from "../models/messageModel.js";

export const getChatHistory =
  async (
    chatSessionId
  ) => {

    const messages =
      await Message.find({
        chatSessionId,
      }).sort({
        createdAt: 1,
      });

    return messages
      .map(
        (msg) => {

          return `${

            msg.role ===
            "user"

              ? "User"

              : "Assistant"

          }: ${msg.text}`;
        }
      )
      .join("\n");
  };