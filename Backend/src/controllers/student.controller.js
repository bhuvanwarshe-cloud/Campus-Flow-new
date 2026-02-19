/**
 * Student Controller
 * Handles all student-specific data access.
 * Students can ONLY access their own data — enforced via auth.uid() matching.
 */

import supabaseService from "../services/supabase.service.js";
import { supabase } from "../config/supabase.js";
import { AppError, asyncHandler } from "../utils/errorHandler.js";

// ============================================
// HELPER: Resolve student record from auth user
// Returns { studentId, email }
// ============================================
const resolveStudent = async (req) => {
    const userId = req.user.id;
    const userEmail = req.user.email?.trim();

    // Verify role
    const role = await supabaseService.getUserRole(userId);
    if (role !== "student") {
        throw new AppError("Access denied. Student role required.", 403);
    }

    // Find student record by email (case-insensitive)
    const { data: students, error } = await supabase
        .from("students")
        .select("id, email")
        .ilike("email", userEmail)
        .limit(1);

    if (error) {
        throw new AppError(`Failed to resolve student: ${error.message}`, 500);
    }

    if (!students || students.length === 0) {
        throw new AppError("Student record not found. Please contact your administrator.", 404);
    }

    return { studentId: students[0].id, email: students[0].email };
};

// ============================================
// GET /api/student/marks
// Get current student's marks
// ============================================
export const getMyMarks = asyncHandler(async (req, res) => {
    const { studentId } = await resolveStudent(req);

    const marks = await supabaseService.getMarksByStudent(studentId);

    // Compute summary stats
    const totalMarks = marks.length;
    const avgScore = totalMarks > 0
        ? marks.reduce((sum, m) => sum + (m.marks_obtained || 0), 0) / totalMarks
        : 0;

    res.status(200).json({
        success: true,
        data: marks,
        summary: {
            total: totalMarks,
            average: Math.round(avgScore * 100) / 100,
        },
    });
});

// ============================================
// GET /api/student/attendance
// Get current student's attendance records
// ============================================
export const getMyAttendance = asyncHandler(async (req, res) => {
    const { studentId } = await resolveStudent(req);

    const records = await supabaseService.getStudentAttendance(studentId);

    // Compute attendance percentage
    const total = records.length;
    const present = records.filter((r) => r.status === "present").length;
    const late = records.filter((r) => r.status === "late").length;
    const absent = records.filter((r) => r.status === "absent").length;
    const attendancePct = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    res.status(200).json({
        success: true,
        data: records,
        summary: {
            total,
            present,
            late,
            absent,
            attendancePct,
        },
    });
});

// ============================================
// GET /api/student/performance
// Get current student's performance reports
// ============================================
export const getMyPerformance = asyncHandler(async (req, res) => {
    const { studentId } = await resolveStudent(req);

    const reports = await supabaseService.getPerformanceByStudent(studentId);

    res.status(200).json({
        success: true,
        data: reports,
        count: reports.length,
    });
});

// ============================================
// GET /api/student/announcements
// Get announcements for student's enrolled classes
// ============================================
export const getMyAnnouncements = asyncHandler(async (req, res) => {
    const { studentId } = await resolveStudent(req);

    const announcements = await supabaseService.getStudentAnnouncements(studentId);

    res.status(200).json({
        success: true,
        data: announcements,
        count: announcements.length,
    });
});
