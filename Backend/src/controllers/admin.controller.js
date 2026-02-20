/**
 * Admin Controller
 * Handles admin-specific operations like viewing all users
 */

import * as supabaseService from "../services/supabase.service.js";
import { AppError, asyncHandler } from "../utils/errorHandler.js";

// ============================================
// GET /api/admin/overview
// High-level admin dashboard metrics
// ============================================
export const getOverview = asyncHandler(async (req, res) => {
  // ensureAdmin middleware already enforces admin role

  const overview = await supabaseService.getAdminOverview();

  res.status(200).json({
    success: true,
    data: overview,
  });
});

// ============================================
// GET /api/admin/users
// Paginated + searchable user listing
// ============================================
export const getAllUsers = asyncHandler(async (req, res) => {
  // Middleware has already validated admin access

  const page = Number.parseInt(req.query.page, 10) || 1;
  const limit = Number.parseInt(req.query.limit, 10) || 20;
  const search = (req.query.search || "").toString();

  if (page <= 0) {
    throw new AppError("page must be a positive integer", 400);
  }

  if (limit <= 0 || limit > 100) {
    throw new AppError("limit must be between 1 and 100", 400);
  }

  const result = await supabaseService.getAdminUsers({
    page,
    limit,
    search,
  });

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

// ============================================
// GET /api/admin/users/students
// Legacy endpoint: all students with profile info
// ============================================
export const getAllStudents = asyncHandler(async (req, res) => {
  // Double-check admin role even though middleware already ran
  if (req.user.role !== "admin") {
    throw new AppError("Access denied. Admin only.", 403);
  }

  const students = await supabaseService.getAllStudents();

  res.status(200).json({
    success: true,
    count: students.length,
    data: students,
  });
});

// ============================================
// GET /api/admin/users/teachers
// Legacy endpoint: all teachers with profile info
// ============================================
export const getAllTeachers = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    throw new AppError("Access denied. Admin only.", 403);
  }

  const teachers = await supabaseService.getAllTeachers();

  res.status(200).json({
    success: true,
    count: teachers.length,
    data: teachers,
  });
});

// ============================================
// PATCH /api/admin/users/:id/role
// Update a user's role with validation & self-protection
// ============================================
export const updateUserRole = asyncHandler(async (req, res) => {
  const targetUserId = req.params.id;
  const { role } = req.body || {};

  if (!targetUserId) {
    throw new AppError("User id parameter is required", 400);
  }

  if (!role || typeof role !== "string") {
    throw new AppError("role is required and must be a string", 400);
  }

  const normalizedRole = role.toLowerCase().trim();

  // Prevent admin from demoting themselves to a non-admin role
  if (req.user.id === targetUserId && normalizedRole !== "admin") {
    throw new AppError("You cannot change your own role to non-admin", 403);
  }

  const result = await supabaseService.updateUserRole(targetUserId, normalizedRole);

  res.status(200).json({
    success: true,
    message: "User role updated successfully",
    data: result,
  });
});

// ============================================
// PATCH /api/admin/users/:id/status
// Enable / disable a user
// ============================================
export const updateUserStatus = asyncHandler(async (req, res) => {
  const targetUserId = req.params.id;
  const { isActive } = req.body || {};

  if (!targetUserId) {
    throw new AppError("User id parameter is required", 400);
  }

  if (typeof isActive !== "boolean") {
    throw new AppError("isActive is required and must be a boolean", 400);
  }

  const result = await supabaseService.updateUserStatus(targetUserId, isActive);

  res.status(200).json({
    success: true,
    message: `User has been ${result.is_active ? "enabled" : "disabled"}`,
    data: result,
  });
});

// ============================================
// GET /api/admin/classes
// List classes with teacher info and enrollment counts
// ============================================
export const getAdminClasses = asyncHandler(async (req, res) => {
  const classes = await supabaseService.getAdminClasses();

  res.status(200).json({
    success: true,
    count: classes.length,
    data: classes,
  });
});

// ============================================
// GET /api/admin/academics
// Academics overview: weak classes, low attendance, teacher workload
// ============================================
export const getAcademicsOverview = asyncHandler(async (req, res) => {
  const weakThresholdRaw = req.query.weakThreshold;
  const attendanceThresholdRaw = req.query.attendanceThreshold;

  let weakThreshold;
  let attendanceThreshold;

  if (weakThresholdRaw !== undefined) {
    const parsed = Number.parseFloat(weakThresholdRaw);
    if (Number.isNaN(parsed) || parsed < 0) {
      throw new AppError("weakThreshold must be a non-negative number", 400);
    }
    weakThreshold = parsed;
  }

  if (attendanceThresholdRaw !== undefined) {
    const parsed = Number.parseFloat(attendanceThresholdRaw);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
      throw new AppError("attendanceThreshold must be between 0 and 100", 400);
    }
    attendanceThreshold = parsed;
  }

  const overview = await supabaseService.getAdminAcademics({
    weakThreshold,
    attendanceThreshold,
  });

  res.status(200).json({
    success: true,
    data: overview,
  });
});
