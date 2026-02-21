import express from "express";
import * as assignmentsController from "../controllers/assignments.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Teacher Routes
router.post("/teacher", assignmentsController.createAssignment);
router.get("/teacher", assignmentsController.getTeacherAssignments);
router.get("/teacher/:id/submissions", assignmentsController.getAssignmentSubmissions);

// Student Routes
router.get("/student", assignmentsController.getStudentAssignments);
router.post("/student/:id/submit", upload.single("file"), assignmentsController.submitAssignment);

export default router;
