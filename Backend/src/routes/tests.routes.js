import express from "express";
import * as testsController from "../controllers/tests.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Teacher Routes
router.get("/teacher", testsController.getTeacherTests);
router.post("/teacher", testsController.createTest);
router.post("/teacher/:id/questions", testsController.addQuestions);
router.get("/teacher/:id/results", testsController.getTestResults);

// Student Routes
router.get("/student", testsController.getStudentTests);
router.get("/student/:id", testsController.getTestQuestions);
router.post("/student/:id/submit", testsController.submitTest);

export default router;
