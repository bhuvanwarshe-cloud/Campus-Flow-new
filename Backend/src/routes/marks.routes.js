/**
 * Marks Routes
 * Endpoints for mark upload, retrieval, and management
 */

import express from "express";
import * as marksController from "../controllers/marks.controller.js";

import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// Protect all routes
router.use(authMiddleware);

// POST /marks - Upload marks (teacher only)
router.post("/", marksController.uploadMarks);

// PUT /marks/:id - Update marks (uploader or admin only)
router.put("/:id", marksController.updateMarks);

// GET /marks/me - Get current student's marks
router.get("/me", marksController.getMyMarks);

// GET /marks/class/:classId - Get all marks for a class (teacher/admin)
router.get("/class/:classId", marksController.getClassMarks);

// GET /marks/exam/:examId - Get all marks for an exam (teacher/admin)
router.get("/exam/:examId", marksController.getExamMarks);

export default router;
