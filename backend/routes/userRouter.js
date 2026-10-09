import express from "express";
import { requireAuth } from "@clerk/express";

const router = express.Router();

router.get("/me", requireAuth(), (req, res) => {

  const clerkId = req.auth.userId;

  if (clerkId === process.env.MAJOR_ADMIN_ID) {
    return res.json({ role: "admin" });
  } else {
    return res.json({ role: "patient" });
  }

});

export default router;