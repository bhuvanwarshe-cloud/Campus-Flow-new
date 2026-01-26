/**
 * Attendance Routes
 */

import express from "express";
import * as attendanceController from "../controllers/attendance.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware);

// POST /attendance - Take attendance
router.post("/", attendanceController.takeAttendance);

// GET /attendance/class/:classId - Get attendance for a class
router.get("/class/:classId", attendanceController.getClassAttendance);

export default router;
