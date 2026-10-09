import express from "express";
import { clerkMiddleware, requireAuth } from "@clerk/express";

import {
  cancelServiceAppointment,
  confirmServicePayment,
  createServiceAppointment,
  getServiceAppointments,
  getServiceAppointmentStats,
  getServiceAppointmentsByPatient,
  getServiceAppointmentById,
  updateServiceAppointment,
} from "../controllers/serviceAppointmentController.js";

const serviceAppointmentRouter = express.Router();

// Get all service appointments
serviceAppointmentRouter.get("/", getServiceAppointments);

// Confirm payment
serviceAppointmentRouter.get("/confirm", confirmServicePayment);

// Get appointment stats
serviceAppointmentRouter.get("/stats/summary", getServiceAppointmentStats);

// Create new service appointment (Protected)
serviceAppointmentRouter.post(
  "/",
  clerkMiddleware(),
  requireAuth(),
  createServiceAppointment
);

// Get logged-in patient's appointments (Protected)
serviceAppointmentRouter.get(
  "/me",
  clerkMiddleware(),
  requireAuth(),
  getServiceAppointmentsByPatient
);

// Get single appointment by ID
serviceAppointmentRouter.get("/:id", getServiceAppointmentById);

// Update appointment
serviceAppointmentRouter.put("/:id", updateServiceAppointment);

// Cancel appointment
serviceAppointmentRouter.post("/:id/cancel", cancelServiceAppointment);

export default serviceAppointmentRouter;