/**
 * Students Controller
 * Handles student CRUD operations
 */

import * as supabaseService from "../services/supabase.service.js";
import { AppError, asyncHandler } from "../utils/errorHandler.js";

/**
 * POST /students
 * Create a new student
 * Body: { name, email }
 */
export const createStudent = asyncHandler(async (req, res) => {
  const { name, email } = req.body;

  // Validate required fields
  if (!name || !email) {
    throw new AppError("Name and email are required", 400);
  }

  const studentData = {
    name,
    email,
    created_by: req.user.id,
  };

  const student = await supabaseService.createStudent(studentData);

  console.log(`✅ Student created: ${student.id}`);

  res.status(201).json({
    success: true,
    data: student,
  });
});

/**
 * GET /students
 * List all students (optionally filtered by creator)
 */
export const getStudents = asyncHandler(async (req, res) => {
  const filters = {};

  // Optional: filter by creator
  if (req.query.createdBy) {
    filters.createdBy = req.query.createdBy;
  }

  const students = await supabaseService.getStudents(filters);

  res.json({
    success: true,
    data: students,
    count: students.length,
  });
});

/**
 * GET /students/:id
 * Get a specific student by ID
 */
export const getStudentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const student = await supabaseService.getStudentById(id);

  res.json({
    success: true,
    data: student,
  });
});

/**
 * PUT /students/:id
 * Update a student
 * Body: { name, email }
 */
export const updateStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body;

  // Validate that at least one field is provided
  if (!name && !email) {
    throw new AppError("At least one field (name or email) is required", 400);
  }

  const updates = {};
  if (name) updates.name = name;
  if (email) updates.email = email;

  const student = await supabaseService.updateStudent(id, updates);

  console.log(`✅ Student updated: ${id}`);

  res.json({
    success: true,
    data: student,
  });
});

/**
 * DELETE /students/:id
 * Delete a student
 */
export const deleteStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await supabaseService.deleteStudent(id);

  console.log(`✅ Student deleted: ${id}`);

  res.json({
    success: true,
    message: "Student deleted successfully",
  });
});

export default {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
};
