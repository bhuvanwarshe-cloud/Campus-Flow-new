/**
 * Enrollments Routes
 */

import express from "express";
import * as enrollmentsController from "../controllers/enrollments.controller.js";

const router = express.Router();

// POST /enrollments - Create a new enrollment
router.post("/", enrollmentsController.createEnrollment);

// GET /enrollments/class/:classId - Get enrollments by class
router.get("/class/:classId", enrollmentsController.getEnrollmentsByClass);

// GET /enrollments/student/:studentId - Get enrollments by student
router.get("/student/:studentId", enrollmentsController.getEnrollmentsByStudent);

// DELETE /enrollments/:studentId/:classId - Delete enrollment
router.delete("/:studentId/:classId", enrollmentsController.deleteEnrollment);

export default router;
