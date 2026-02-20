/**
 * Teacher Routes
 * All routes require authentication + teacher role (enforced in controller)
 */

import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import * as teacherController from "../controllers/teacher.controller.js";

const router = express.Router();

// Apply auth middleware to all teacher routes
router.use(authMiddleware);

// ── Students ──────────────────────────────────────────────────────────────────
// GET /api/teacher/students?page=1&limit=20&search=john
router.get("/students", teacherController.getMyStudents);

// ── Marks ─────────────────────────────────────────────────────────────────────
// POST /api/teacher/marks  { classId, examId, subjectId, marks: [{studentId, marksObtained}] }
router.post("/marks", teacherController.uploadMarks);

// ── Attendance ────────────────────────────────────────────────────────────────
// POST /api/teacher/attendance  { classId, date, attendance: [{studentId, status}] }
router.post("/attendance", teacherController.recordAttendance);

// ── Announcements ─────────────────────────────────────────────────────────────
// POST /api/teacher/announcement  { classId, title, body }
router.post("/announcement", teacherController.createAnnouncement);
// GET  /api/teacher/announcements/:classId
router.get("/announcements/:classId", teacherController.getClassAnnouncements);

// ── Performance Reports ───────────────────────────────────────────────────────
// POST /api/teacher/performance  { studentId, classId, period, avgMarks, ... }
router.post("/performance", teacherController.createPerformanceReport);

// ── Subjects ──────────────────────────────────────────────────────────────────
// GET  /api/teacher/subjects/:classId
router.get("/subjects/:classId", teacherController.getSubjects);
// POST /api/teacher/subjects  { classId, name }
router.post("/subjects", teacherController.createSubject);

// ── Exams ─────────────────────────────────────────────────────────────────────
// GET  /api/teacher/exams/:classId
router.get("/exams/:classId", teacherController.getExams);
// POST /api/teacher/exams  { classId, name, maxMarks }
router.post("/exams", teacherController.createExam);

// ── Stats ─────────────────────────────────────────────────────────────────────
// GET /api/teacher/stats
router.get("/stats", teacherController.getTeacherStats);

export default router;
