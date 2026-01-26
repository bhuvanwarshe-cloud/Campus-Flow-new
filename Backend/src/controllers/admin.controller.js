/**
 * Admin Controller
 * Handles admin-specific operations like viewing all users
 */

import * as supabaseService from "../services/supabase.service.js";
import { AppError, asyncHandler } from "../utils/errorHandler.js";

/**
 * GET /api/admin/users
 * Get all users (students and teachers)
 */
export const getAllUsers = asyncHandler(async (req, res) => {
    // Verify user is admin
    if (req.user.role !== 'admin') {
        throw new AppError("Access denied. Admin only.", 403);
    }

    const [students, teachers] = await Promise.all([
        supabaseService.getAllStudents(),
        supabaseService.getAllTeachers()
    ]);

    // Normalize and combine
    const allUsers = [
        ...students.map(s => ({ ...s, role: 'student', email: s.email || 'Email hidden' })), // Assuming profile has email or we mock it
        ...teachers.map(t => ({ ...t, role: 'teacher', email: t.email || 'Email hidden' }))
    ];

    res.json({
        success: true,
        count: allUsers.length,
        data: allUsers
    });
});

/**
 * GET /api/admin/users/students
 * Get all students with their profile information
 */
export const getAllStudents = asyncHandler(async (req, res) => {
    // Verify user is admin (middleware should handle this, but double-check)
    if (req.user.role !== 'admin') {
        throw new AppError("Access denied. Admin only.", 403);
    }

    const students = await supabaseService.getAllStudents();

    res.json({
        success: true,
        count: students.length,
        data: students
    });
});

/**
 * GET /api/admin/users/teachers
 * Get all teachers with their profile information
 */
export const getAllTeachers = asyncHandler(async (req, res) => {
    // Verify user is admin
    if (req.user.role !== 'admin') {
        throw new AppError("Access denied. Admin only.", 403);
    }

    const teachers = await supabaseService.getAllTeachers();

    res.json({
        success: true,
        count: teachers.length,
        data: teachers
    });
});
