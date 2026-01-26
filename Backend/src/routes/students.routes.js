/**
 * Students Routes
 */

import express from "express";
import * as studentsController from "../controllers/students.controller.js";

const router = express.Router();

// POST /students - Create a new student
router.post("/", studentsController.createStudent);

// GET /students - List all students
router.get("/", studentsController.getStudents);

// GET /students/:id - Get student by ID
router.get("/:id", studentsController.getStudentById);

// PUT /students/:id - Update student
router.put("/:id", studentsController.updateStudent);

// DELETE /students/:id - Delete student
router.delete("/:id", studentsController.deleteStudent);

export default router;
