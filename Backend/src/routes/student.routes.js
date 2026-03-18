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

// GET /api/student/attendance/summary
router.get("/attendance/summary", studentController.getAttendanceSummary);

// GET /api/student/notifications
router.get("/notifications", studentController.getMyNotifications);

// GET /api/student/progress
router.get("/progress", studentController.getMyProgress);

// GET /api/student/performance
router.get("/performance", studentController.getMyPerformance);

// GET /api/student/announcements
router.get("/announcements", studentController.getMyAnnouncements);

// ── Role Requests (Student Joins) ─────────────────────────────────────────────
// Note: This route specifically drops auth checks for the `student` role natively
// so that a pending user can call it successfully but still be auth'ed via JWT
// We create a new sub-router that only requires authentication.
const pendingRouter = express.Router();
pendingRouter.use(authMiddleware);
pendingRouter.post("/join-request", studentController.submitJoinRequest);

const mainRouter = express.Router();
mainRouter.use("/api/student", pendingRouter); // Usually this mounts on root, but since this file is exported as the router
export { pendingRouter as joinRequestRouter };
export default router;
