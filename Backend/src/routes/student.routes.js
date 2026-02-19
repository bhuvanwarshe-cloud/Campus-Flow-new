/**
 * Student Routes
 * All routes require authentication + student role (enforced in controller)
 */

import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import * as studentController from "../controllers/student.controller.js";

const router = express.Router();

// Apply auth middleware to all student routes
router.use(authMiddleware);

// GET /api/student/marks
router.get("/marks", studentController.getMyMarks);

// GET /api/student/attendance
router.get("/attendance", studentController.getMyAttendance);

// GET /api/student/performance
router.get("/performance", studentController.getMyPerformance);

// GET /api/student/announcements
router.get("/announcements", studentController.getMyAnnouncements);

export default router;
