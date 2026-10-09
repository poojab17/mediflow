import Doctor from "../models/doctor.js";
import { analyzeSymptoms } from "../services/aiService.js";
import redisClient from "../config/redis.js";
import { classifySafety } from "../services/CuraShield/safetyService.js";

export const chatbotReply = async (req, res) => {
  try {
    const { message } = req.body;
    const sessionId = req.ip;
    const oldMessages = await redisClient.get(sessionId);

    const history = oldMessages
      ? JSON.parse(oldMessages)
      : [];

    console.log("CHAT HISTORY:", history);
    history.push({
      role: "user",
      content: message,
    });

    console.log("CALLING analyzeSymptoms...");
    console.log("MESSAGE:", message);

    const aiResponse = await analyzeSymptoms(
      message,
      history
    );

    console.log("AI RESPONSE:", aiResponse);

    console.log(
      "CALLING CURASHIELD..."
    );

    const safety =
      await classifySafety(

        message,

        `
    Specialist:
    ${aiResponse.specialization}

    Severity:
    ${aiResponse.severity}

    Advice:
    ${aiResponse.advice}
    `
      );

    console.log(
      "CURASHIELD:",
      safety
    );

    history.push({
      role: "assistant",
      content: JSON.stringify(aiResponse),
    });

    console.log("SAVING TO REDIS...");

    await redisClient.set(
      sessionId,
      JSON.stringify(history),
      "EX",
      3600
    );

    console.log("REDIS SAVED");

    const specialization =
      aiResponse.specialization;

    if (!specialization) {

      return res.json({

        reply:
          "Unable to determine specialist.",

        doctors: []
      });
    }

    console.log(
      "SPECIALIZATION:",
      specialization
    );

    const doctors =
      await Doctor.find({

        specialization,

        availability:
          "Available",

      }).lean();

    console.log(
      "DOCTORS FOUND:",
      doctors
    );

    const today =
      new Date()
        .toISOString()
        .split("T")[0];

    console.log(
      "TODAY:",
      today
    );

    console.log(
      "MAPPING DOCTOR SLOTS..."
    );

    const availableDoctors = doctors
      .map((doc) => {
        const slots =
          doc.schedule?.[today] ||
          doc.schedule?.get?.(today) ||
          [];

        return {
          _id: doc._id,
          name: doc.name,
          specialization: doc.specialization,
          fee: doc.fee,
          availableSlots: slots,
        };
      })
      .filter(
        doc =>
          doc.availableSlots.length > 0
      );


    if (availableDoctors.length > 0) {
      return res.json({
        type: "available",

        reply: `
🏥 Recommended Specialist:
${specialization}

⚠️ Severity: ${aiResponse.severity}

💡 Advice:
${aiResponse.advice}
`,

        doctors:
          availableDoctors,

        safety
      });
    }


    return res.json({
      type: "no-slots",

      reply: `
🏥 Recommended Specialist:
${specialization}

⚠️ Severity: ${aiResponse.severity}

💡 Advice:
${aiResponse.advice}

❌ No slots available today.

📅 Showing doctors for later booking.
`,

      doctors,

      safety
    });
  } catch (err) {

    console.log(
      "CHATBOT ERROR:",
      err
    );

    res.status(500).json({
      message: err.message
    });
  }
};