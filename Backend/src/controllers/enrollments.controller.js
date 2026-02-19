/**
 * Enrollments Controller
 * Handles student-class enrollments
 */

import * as supabaseService from "../services/supabase.service.js";
import { AppError, asyncHandler } from "../utils/errorHandler.js";
import { formatPaginatedResponse } from "../utils/pagination.js";

/**
 * POST /enrollments
 * Create a new enrollment (enroll student in class)
 * Body: { studentId, classId }
 */
export const createEnrollment = asyncHandler(async (req, res) => {
  const { studentId, classId } = req.body;

  // Validate required fields
  if (!studentId || !classId) {
    throw new AppError("studentId and classId are required", 400);
  }

  // Verify student exists
  await supabaseService.getStudentById(studentId);

  // Verify class exists
  await supabaseService.getClassById(classId);

  // Check if already enrolled
  const alreadyEnrolled = await supabaseService.isEnrolled(studentId, classId);
  if (alreadyEnrolled) {
    throw new AppError("Student is already enrolled in this class", 409);
  }

  const enrollmentData = {
    student_id: studentId,
    class_id: classId,
  };

  const enrollment = await supabaseService.createEnrollment(enrollmentData);

  console.log(`✅ Enrollment created: ${studentId} -> ${classId}`);

  res.status(201).json({
    success: true,
    data: enrollment,
  });
});



/**
 * GET /enrollments/class/:classId
 * Get all enrollments for a specific class
 */
export const getEnrollmentsByClass = asyncHandler(async (req, res) => {
  const { classId } = req.params;
  const { page, limit } = req.query;

  // Verify class exists
  await supabaseService.getClassById(classId);

  const { data, count } = await supabaseService.getEnrollmentsByClass(classId, page, limit);

  res.json({
    success: true,
    ...formatPaginatedResponse(data, count, page, limit),
  });
});

/**
 * GET /enrollments/student/:studentId
 * Get all enrollments for a specific student
 */
export const getEnrollmentsByStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  // Verify student exists
  await supabaseService.getStudentById(studentId);

  const enrollments = await supabaseService.getEnrollmentsByStudent(studentId);

  res.json({
    success: true,
    data: enrollments,
    count: enrollments.length,
  });
});

/**
 * DELETE /enrollments/:studentId/:classId
 * Remove a student from a class
 */
export const deleteEnrollment = asyncHandler(async (req, res) => {
  const { studentId, classId } = req.params;

  await supabaseService.deleteEnrollment(studentId, classId);

  console.log(`✅ Enrollment deleted: ${studentId} -> ${classId}`);

  res.json({
    success: true,
    message: "Enrollment deleted successfully",
  });
});

export default {
  createEnrollment,
  getEnrollmentsByClass,
  getEnrollmentsByStudent,
  deleteEnrollment,
};
