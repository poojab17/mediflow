import express from "express";
import nodemailer from "nodemailer";
import Newsletter from "../models/Newsletter.js";

const router = express.Router();

router.post("/subscribe", async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.json({ success: false, message: "Email required" });
    }

    // ✅ check duplicate
    const existing = await Newsletter.findOne({ email });

    if (existing) {
      return res.json({
        success: false,
        message: "Already subscribed",
      });
    }

    // ✅ setup transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // ✅ send email FIRST
    await transporter.sendMail({
      from: `"CuraDesk Healthcare" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Subscription Successful 🎉",
      html: `
        <h2>Welcome to CuraDesk Healthcare</h2>
        <p>You are successfully subscribed.</p>
      `,
    });

    // ✅ ONLY SAVE AFTER EMAIL SUCCESS
    await Newsletter.create({ email });

    return res.json({ success: true });

  } catch (error) {
    console.log("EMAIL ERROR:", error.message);
    return res.json({ success: false, message: "Server error" });
  }
});

export default router;