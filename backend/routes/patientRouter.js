import express from "express";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import doctorAuth from "../middlewares/doctorAuth.js";
import {
  getPatientTimeline,
  getTimelineEvent,
  createClinicalRecord,
} from "../controllers/patientTimelineController.js";

const patientRouter = express.Router();

// Patient-facing routes: identity always comes from the verified Clerk session.
patientRouter.get("/timeline", clerkMiddleware(), requireAuth(), getPatientTimeline);
patientRouter.get("/timeline/:eventId", clerkMiddleware(), requireAuth(), getTimelineEvent);

// Clinician-facing route: JWT-issued doctor token (existing doctorAuth).
patientRouter.post("/clinical-records", doctorAuth, createClinicalRecord);

export default patientRouter;