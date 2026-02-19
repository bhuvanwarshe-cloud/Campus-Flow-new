/**
 * Classes Controller
 * Handles class CRUD operations
 */

import * as supabaseService from "../services/supabase.service.js";
import { AppError, asyncHandler } from "../utils/errorHandler.js";
import { formatPaginatedResponse } from "../utils/pagination.js";

/**
 * POST /classes/**
 * Get current teacher's classes
 * GET /api/classes/teacher
 */
export const getMyClasses = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  console.log(`🔍 getMyClasses called for user: ${userId}`);

  // Ensure user is a teacher
  try {
    const role = await supabaseService.getUserRole(userId);
    console.log(`   User role: ${role}`);

    if (role !== 'teacher') {
      console.warn(`   ⛔ Access denied: Role is ${role}, expected 'teacher'`);
      throw new AppError("Only teachers can access this", 403);
    }

    console.log(`   Fetching teacher classes...`);
    const classes = await supabaseService.getTeacherClasses(userId);
    console.log(`   ✅ Found ${classes.length} classes`);

    res.status(200).json({
      success: true,
      data: classes,
    });
  } catch (error) {
    console.error("❌ Error in getMyClasses:", error);
    throw error; // Re-throw to be caught by asyncHandler
  }
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
  const { page, limit, createdBy } = req.query;
  const filters = {};

  // Optional: filter by creator
  if (createdBy) {
    filters.createdBy = createdBy;
  }

  const { data, count } = await supabaseService.getClasses(filters, page, limit);

  res.json({
    success: true,
    ...formatPaginatedResponse(data, count, page, limit),
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
