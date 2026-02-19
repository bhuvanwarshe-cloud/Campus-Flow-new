/**
 * Marks Controller
 * Handles marks upload, retrieval, and authorization
 * Rules:
 * - Only teacher/admin can upload marks
 * - Teacher can upload marks only for their assigned class
 * - Student can view only their own marks
 * - Admin can view all marks
 */

import * as supabaseService from "../services/supabase.service.js";
import { supabase } from "../config/supabase.js";
import { AppError, asyncHandler } from "../utils/errorHandler.js";
import { formatPaginatedResponse } from "../utils/pagination.js";

/**
 * POST /marks
 * Upload marks for a student
 * Body: { student_id, subject_id, exam_id, marks_obtained }
 * Only teacher/admin authorized
 */
export const uploadMarks = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { student_id, subject_id, exam_id, marks_obtained } = req.body;

  // Validate required fields
  if (!student_id || !subject_id || !exam_id || marks_obtained === undefined) {
    throw new AppError(
      "student_id, subject_id, exam_id, and marks_obtained are required",
      400
    );
  }

  // Validate marks_obtained is a non-negative integer
  if (!Number.isInteger(marks_obtained) || marks_obtained < 0) {
    throw new AppError("marks_obtained must be a non-negative integer", 400);
  }

  // Get user role
  const role = await supabaseService.getUserRole(userId);
  if (role !== "teacher" && role !== "admin") {
    throw new AppError("Only teachers and admins can upload marks", 403);
  }

  // Verify student exists
  await supabaseService.getStudentById(student_id);

  // Verify subject exists
  const subject = await supabaseService.getSubjectById(subject_id);

  // Verify exam exists
  const exam = await supabaseService.getExamById(exam_id);

  // Validate marks_obtained doesn't exceed max_marks
  if (marks_obtained > exam.max_marks) {
    throw new AppError(
      `Marks obtained (${marks_obtained}) cannot exceed max marks (${exam.max_marks})`,
      400
    );
  }

  // For teachers: verify they are assigned to the class
  if (role === "teacher") {
    const isAssigned = await supabaseService.isTeacherInClass(
      userId,
      subject.class_id
    );
    if (!isAssigned) {
      throw new AppError(
        "You are not authorized to upload marks for this class",
        403
      );
    }
  }

  // Create mark
  const markData = {
    student_id,
    subject_id,
    exam_id,
    marks_obtained,
    uploaded_by: userId,
  };

  const mark = await supabaseService.createMark(markData);

  console.log(
    `✅ Marks uploaded: Student ${student_id}, Subject ${subject_id}, Exam ${exam_id}`
  );

  res.status(201).json({
    success: true,
    data: mark,
  });
});

/**
 * PUT /marks/:id
 * Update marks for a mark record
 * Only uploader or admin authorized
 */
export const updateMarks = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { marks_obtained } = req.body;

  // Validate marks_obtained
  if (marks_obtained === undefined) {
    throw new AppError("marks_obtained is required", 400);
  }

  if (!Number.isInteger(marks_obtained) || marks_obtained < 0) {
    throw new AppError("marks_obtained must be a non-negative integer", 400);
  }

  // Get existing mark
  const existingMark = await supabaseService.getMarkById(id);

  // Get user role
  const role = await supabaseService.getUserRole(userId);

  // Authorization: only uploader or admin can update
  if (existingMark.uploaded_by !== userId && role !== "admin") {
    throw new AppError(
      "You are not authorized to update this mark record",
      403
    );
  }

  // Validate marks don't exceed max_marks
  const exam = existingMark.exam;
  if (marks_obtained > exam.max_marks) {
    throw new AppError(
      `Marks obtained (${marks_obtained}) cannot exceed max marks (${exam.max_marks})`,
      400
    );
  }

  // Update mark
  const updatedMark = await supabaseService.updateMark(id, { marks_obtained });

  console.log(`✅ Marks updated: ${id}`);

  res.json({
    success: true,
    data: updatedMark,
  });
});

/**
 * GET /marks/me
 * Get current user's marks (for students)
 * Students see only their own marks with subject and exam details
 */
export const getMyMarks = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  console.log(`🔍 getMyMarks called for user: ${userId}`);

  // Get user role
  const role = await supabaseService.getUserRole(userId);
  console.log(`   User role: ${role}`);

  // Only students can use this endpoint
  if (role !== "student") {
    console.warn(`   ⛔ Access denied: Role is ${role}, expected 'student'`);
    throw new AppError("Only students can view their own marks", 403);
  }

  // Get student ID by email (case-insensitive)
  const userEmail = req.user.email.trim();
  console.log(`   Fetching student record for email (ilike): ${userEmail}`);

  const { data: studentsData, error: studentError } = await supabase
    .from("students")
    .select("id, email")
    .ilike("email", userEmail)
    .limit(1);

  if (studentError) {
    console.error(`   ❌ Error fetching student ID:`, studentError);
    throw new AppError(`Failed to fetch student profile: ${studentError.message}`, 500);
  }

  if (!studentsData || studentsData.length === 0) {
    console.warn(`   ⚠️ Student record not found for email: ${req.user.email}`);
    throw new AppError("Student record not found", 404);
  }

  const studentId = studentsData[0].id;
  console.log(`   Found student ID: ${studentId}`);

  // Get marks for this student
  console.log(`   Fetching marks for student ID: ${studentId}`);
  const marks = await supabaseService.getMarksByStudent(studentId);

  console.log(`✅ Fetched ${marks.length} marks for student ${studentId}`);

  res.json({
    success: true,
    data: marks,
    count: marks.length,
  });
});

/**
 * GET /marks/class/:classId
 * Get marks for a class
 * Only teacher assigned to class or admin authorized
 */
export const getClassMarks = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { classId } = req.params;

  // Verify class exists
  await supabaseService.getClassById(classId);

  // Get user role
  const role = await supabaseService.getUserRole(userId);

  // Authorization: only teacher assigned to class or admin
  if (role === "teacher") {
    const isAssigned = await supabaseService.isTeacherInClass(userId, classId);
    if (!isAssigned) {
      throw new AppError(
        "You are not authorized to view marks for this class",
        403
      );
    }
  } else if (role !== "admin") {
    throw new AppError(
      "Only teachers and admins can view class marks",
      403
    );
  }

  // ... existing code ...

  // ... existing code ...

  // Get marks by class
  const { page, limit } = req.query;
  const { data, count } = await supabaseService.getMarksByClass(classId, page, limit);

  res.json({
    success: true,
    ...formatPaginatedResponse(data, count, page, limit),
  });
});

/**
 * GET /marks/exam/:examId
 * Get marks for a specific exam
 * Only admin or teacher of the class authorized
 */
export const getExamMarks = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { examId } = req.params;

  // Verify exam exists
  const exam = await supabaseService.getExamById(examId);

  // Get user role
  const role = await supabaseService.getUserRole(userId);

  // Authorization: only teacher of class or admin
  if (role === "teacher") {
    const isAssigned = await supabaseService.isTeacherInClass(
      userId,
      exam.class_id
    );
    if (!isAssigned) {
      throw new AppError(
        "You are not authorized to view marks for this exam",
        403
      );
    }
  } else if (role !== "admin") {
    throw new AppError(
      "Only teachers and admins can view exam marks",
      403
    );
  }

  // Get marks by exam
  const marks = await supabaseService.getMarksByExam(examId);

  res.json({
    success: true,
    data: marks,
    count: marks.length,
  });
});

export default {
  uploadMarks,
  updateMarks,
  getMyMarks,
  getClassMarks,
  getExamMarks,
};
