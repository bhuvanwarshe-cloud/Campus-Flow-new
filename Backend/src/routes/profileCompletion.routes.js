/**
 * Profile Completion Routes
 */

import express from "express";
import * as profileCompletionController from "../controllers/profileCompletion.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /api/profile-completion/status - Check status
router.get("/status", profileCompletionController.getProfileStatus);

// POST /api/profile-completion/student - Complete student profile
router.post("/student", profileCompletionController.completeStudentProfile);

// POST /api/profile-completion/teacher - Complete teacher profile
router.post("/teacher", profileCompletionController.completeTeacherProfile);

export default router;
