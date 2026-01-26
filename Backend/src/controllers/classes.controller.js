/**
 * Classes Controller
 * Handles class CRUD operations
 */

import * as supabaseService from "../services/supabase.service.js";
import { AppError, asyncHandler } from "../utils/errorHandler.js";

/**
 * POST /classes/**
 * Get current teacher's classes
 * GET /api/classes/teacher
 */
export const getMyClasses = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Ensure user is a teacher
  const role = await supabaseService.getUserRole(userId);
  if (role !== 'teacher') {
    throw new AppError("Only teachers can access this", 403);
  }

  const classes = await supabaseService.getTeacherClasses(userId);

  res.status(200).json({
    success: true,
    data: classes,
  });
});

/**
 * POST /classes
 * Create a new class
 * Body: { name }
 */
export const createClass = asyncHandler(async (req, res) => {
  const { name } = req.body;

  // Validate required fields
  if (!name) {
    throw new AppError("Class name is required", 400);
  }

  const classData = {
    name,
    created_by: req.user.id,
  };

  const newClass = await supabaseService.createClass(classData);

  console.log(`✅ Class created: ${newClass.id}`);

  res.status(201).json({
    success: true,
    data: newClass,
  });
});

/**
 * GET /classes
 * List all classes
 */
export const getClasses = asyncHandler(async (req, res) => {
  const filters = {};

  // Optional: filter by creator
  if (req.query.createdBy) {
    filters.createdBy = req.query.createdBy;
  }

  const classes = await supabaseService.getClasses(filters);

  res.json({
    success: true,
    data: classes,
    count: classes.length,
  });
});

/**
 * GET /classes/:id
 * Get a specific class by ID
 */
export const getClassById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const classData = await supabaseService.getClassById(id);

  res.json({
    success: true,
    data: classData,
  });
});

/**
 * DELETE /classes/:id
 * Delete a class
 */
export const deleteClass = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await supabaseService.deleteClass(id);

  console.log(`✅ Class deleted: ${id}`);

  res.json({
    success: true,
    message: "Class deleted successfully",
  });
});

export default {
  createClass,
  getClasses,
  getClassById,
  deleteClass,
};
