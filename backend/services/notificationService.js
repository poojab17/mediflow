import { sendEmail } from "../utilities/sendEmail.js";

export const notifyPatient = async ({ email, message, type = "success" }) => {
  if (!email) return;

  try {
    let title = "Appointment Update";
    let color = "#4CAF50"; // green

    if (type === "cancel") {
      title = "Appointment Cancelled ❌";
      color = "#f44336"; // red
    }

    if (type === "success") {
      title = "Appointment Confirmed ✅";
      color = "#4CAF50";
    }

    await sendEmail({
      to: email,
      subject: title,
      html: `
        <div style="font-family: Arial; padding:20px; border:1px solid #eee; border-radius:10px">
          <h2 style="color:${color};">${title}</h2>
          ${message}
          <hr/>
          <p style="font-size:12px;color:gray;">
            CuraDesk Hospital System
          </p>
        </div>
      `,
    });

  } catch (error) {
    console.log("Email failed:", error.message);
  }
};