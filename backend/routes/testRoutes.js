import express from "express";
import { analyzeSymptoms } from "../services/aiService.js";

const router = express.Router();

router.get("/", async (req, res) => {

  const response = await analyzeSymptoms(
    "I have chest pain and dizziness"
  );

  res.json({
    ai: response,
  });
});

export default router;