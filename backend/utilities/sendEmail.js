import nodemailer from "nodemailer";

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const finalHTML = `
      <div style="font-family: Arial; padding:20px; border:1px solid #eee; border-radius:10px">
        <h2 style="color:#4CAF50;">Appointment Confirmation ✅</h2>
        ${html}
        <hr/>
        <p style="font-size:12px;color:gray;">
          CuraDesk Hospital System
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
    });

  } catch (error) {
    throw new Error("Email failed");
  }
};