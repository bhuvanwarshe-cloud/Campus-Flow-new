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
// HELPER: Attendance comment based on percentage
// ============================================
const getAttendanceComment = (pct) => {
    if (pct >= 90) return "Excellent Attendance";
    if (pct >= 75) return "Good, Keep Improving";
    if (pct >= 60) return "Warning Zone";
    return "Critical, Improve Immediately";
};

// ============================================
// GET /api/student/marks
// Get current student's marks (with teacher name)
// ============================================
export const getMyMarks = asyncHandler(async (req, res) => {
    const { studentId } = await resolveStudent(req);

    const marks = await supabaseService.getMarksByStudent(studentId);

    // Batch-lookup teacher names from profiles
    const uploaderIds = [...new Set(marks.filter(m => m.uploaded_by).map(m => m.uploaded_by))];
    let teacherMap = {};
    if (uploaderIds.length > 0) {
        try {
            const { data: profiles } = await supabase
                .from("profiles")
                .select("id, full_name")
                .in("id", uploaderIds);
            if (profiles) {
                teacherMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name]));
            }
        } catch { /* non-fatal */ }
    }

    const enrichedMarks = marks.map((m) => ({
        ...m,
        teacher_name: teacherMap[m.uploaded_by] || "Unknown Teacher",
    }));

    // Compute summary stats
    const totalMarks = enrichedMarks.length;
    const avgScore = totalMarks > 0
        ? enrichedMarks.reduce((sum, m) => sum + (m.marks_obtained || 0), 0) / totalMarks
        : 0;

    res.status(200).json({
        success: true,
        data: enrichedMarks,
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
// GET /api/student/attendance/summary
// Attendance summary with comment
// ============================================
export const getAttendanceSummary = asyncHandler(async (req, res) => {
    const { studentId } = await resolveStudent(req);

    const records = await supabaseService.getStudentAttendance(studentId);

    const total = records.length;
    const present = records.filter((r) => r.status === "present" || r.status === "late").length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    const comment = getAttendanceComment(percentage);

    res.status(200).json({
        success: true,
        data: {
            present,
            total,
            percentage,
            comment,
        },
    });
});

// ============================================
// GET /api/student/notifications
// Combined notifications + announcements feed
// ============================================
export const getMyNotifications = asyncHandler(async (req, res) => {
    const { studentId } = await resolveStudent(req);
    const userId = req.user.id;

    // Fetch personal notifications
    let notifications = [];
    try {
        const { data, error } = await supabase
            .from("notifications")
            .select("id, title, message, type, is_read, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(50);
        if (!error && data) {
            notifications = data.map((n) => ({
                ...n,
                source: "notification",
            }));
        }
    } catch { /* non-fatal */ }

    // Fetch class announcements
    let announcements = [];
    try {
        const announcementData = await supabaseService.getStudentAnnouncements(studentId);
        announcements = (announcementData || []).map((a) => ({
            id: a.id,
            title: a.title,
            message: a.body || a.message || "",
            type: "announcement",
            is_read: true, // Announcements have no read state
            created_at: a.created_at,
            source: "announcement",
            class_name: a.classes?.name || null,
        }));
    } catch { /* non-fatal */ }

    // Combine and sort by date
    const combined = [...notifications, ...announcements]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 50);

    const unreadCount = combined.filter((n) => !n.is_read).length;

    res.status(200).json({
        success: true,
        data: combined,
        count: combined.length,
        unreadCount,
    });
});

// ============================================
// GET /api/student/progress
// Progress summary: avg marks, attendance %, standing, rank
// ============================================
export const getMyProgress = asyncHandler(async (req, res) => {
    const { studentId } = await resolveStudent(req);

    // Fetch marks
    const marks = await supabaseService.getMarksByStudent(studentId);
    const totalMarks = marks.length;
    const avgMarks = totalMarks > 0
        ? Math.round(marks.reduce((s, m) => s + (m.marks_obtained || 0), 0) / totalMarks * 100) / 100
        : 0;

    // Fetch attendance
    const records = await supabaseService.getStudentAttendance(studentId);
    const totalDays = records.length;
    const presentDays = records.filter((r) => r.status === "present" || r.status === "late").length;
    const attendancePct = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    // Standing based on combined score (60% marks + 40% attendance)
    const combinedScore = Math.round(avgMarks * 0.6 + attendancePct * 0.4);
    let standing;
    if (combinedScore >= 85) standing = "Excellent";
    else if (combinedScore >= 70) standing = "Good";
    else if (combinedScore >= 50) standing = "Average";
    else standing = "Needs Improvement";

    // Basic rank estimate — count students with lower avg marks
    let rankEstimate = null;
    try {
        const { data: allMarks, error } = await supabase
            .from("marks")
            .select("student_id, marks_obtained");
        if (!error && allMarks && allMarks.length > 0) {
            // Group by student and compute averages
            const studentAvgs = {};
            for (const m of allMarks) {
                if (!studentAvgs[m.student_id]) studentAvgs[m.student_id] = { sum: 0, count: 0 };
                studentAvgs[m.student_id].sum += m.marks_obtained || 0;
                studentAvgs[m.student_id].count++;
            }
            const avgs = Object.entries(studentAvgs).map(([sid, v]) => ({
                studentId: sid,
                avg: v.sum / v.count,
            }));
            avgs.sort((a, b) => b.avg - a.avg);
            const myRank = avgs.findIndex((a) => a.studentId === studentId) + 1;
            const totalStudents = avgs.length;
            if (myRank > 0) {
                const percentile = Math.round(((totalStudents - myRank) / totalStudents) * 100);
                rankEstimate = {
                    rank: myRank,
                    totalStudents,
                    percentile,
                };
            }
        }
    } catch { /* non-fatal */ }

    res.status(200).json({
        success: true,
        data: {
            avgMarks,
            attendancePct,
            standing,
            combinedScore,
            rankEstimate,
            totalExams: totalMarks,
            totalClassDays: totalDays,
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
