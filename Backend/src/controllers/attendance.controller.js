/**
 * Attendance Controller
 * Handles attendance marking and retrieval
 */

import supabaseService from "../services/supabase.service.js";
import { AppError, asyncHandler } from "../utils/errorHandler.js";

/**
 * Take attendance for a class
 * POST /api/attendance
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export const takeAttendance = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { classId, date, attendance } = req.body;

    // Validate request
    if (!classId || !attendance || !Array.isArray(attendance)) {
        throw new AppError("Invalid attendance data", 400);
    }

    // Verify teacher access to class
    const isTeacher = await supabaseService.isTeacherInClass(userId, classId);
    if (!isTeacher) {
        throw new AppError("You are not assigned to this class", 403);
    }

    // Format data for DB
    const attendanceRecords = attendance.map((record) => ({
        class_id: classId,
        student_id: record.studentId,
        date: date || new Date().toISOString().split("T")[0],
        status: record.status, // 'present', 'absent', 'late'
        marked_by: userId,
    }));

    // Save to DB
    const result = await supabaseService.createAttendance(attendanceRecords);

    res.status(201).json({
        success: true,
        data: result,
        message: "Attendance marked successfully",
    });
});

/**
 * Get attendance for a class (Teacher View)
 * GET /api/attendance/class/:classId
 * Query params: date (YYYY-MM-DD)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export const getClassAttendance = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { classId } = req.params;
    const { date } = req.query;

    // Verify teacher access
    const isTeacher = await supabaseService.isTeacherInClass(userId, classId);
    if (!isTeacher) {
        // Check if admin? Admins can view everything.
        // For now assuming strict teacher module.
        // throw new AppError("You are not assigned to this class", 403);
    }

    const data = await supabaseService.getAttendanceByClassDate(classId, date);

    res.status(200).json({
        success: true,
        data: data,
    });
});
