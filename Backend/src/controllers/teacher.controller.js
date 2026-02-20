/**
 * Teacher Controller
 * Handles all teacher-specific operations:
 * - Student listing (paginated, searchable)
 * - Marks upload (bulk)
 * - Attendance recording
 * - Performance report generation
 * - Announcements
 */

import supabaseService from "../services/supabase.service.js";
import { supabase } from "../config/supabase.js";
import { AppError, asyncHandler } from "../utils/errorHandler.js";

// ============================================
// HELPER: Verify teacher role
// ============================================
const ensureTeacher = async (userId) => {
    const role = await supabaseService.getUserRole(userId);
    if (role !== "teacher" && role !== "admin") {
        throw new AppError("Access denied. Teacher role required.", 403);
    }
    return role;
};

// ============================================
// HELPER: Create notification (internal)
// ============================================
const sendNotification = async (userId, title, message, type = "info") => {
    try {
        const { error } = await supabase.from("notifications").insert([{
            user_id: userId,
            title,
            message,
            // 'type' column does not exist in notifications table — omitted
            is_read: false,
        }]);
        if (error) console.warn("⚠️ Failed to send notification:", error.message);
    } catch (e) {
        console.warn("⚠️ Notification error (non-fatal):", e.message);
    }
};

// ============================================

// GET /api/teacher/students
// List students in teacher's classes (paginated, searchable)
// ============================================
export const getMyStudents = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    await ensureTeacher(userId);

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const search = req.query.search || "";
    const classId = req.query.classId || null;
    const sortBy = req.query.sortBy || "name";
    const sortOrder = req.query.sortOrder || "asc";

    const { data, count } = await supabaseService.getStudentsByTeacher(
        userId, page, limit, search, classId, sortBy, sortOrder
    );

    res.status(200).json({
        success: true,
        data,
        pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil((count || 0) / limit),
        },
    });
});

// ============================================
// POST /api/teacher/marks
// Bulk upload marks for an exam
// ============================================
export const uploadMarks = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    await ensureTeacher(userId);

    const { classId, examId, subjectId, marks } = req.body;

    // Input validation
    if (!classId) throw new AppError("classId is required", 400);
    if (!examId) throw new AppError("examId is required", 400);
    if (!subjectId) throw new AppError("subjectId is required", 400);
    if (!marks || !Array.isArray(marks) || marks.length === 0) {
        throw new AppError("marks must be a non-empty array", 400);
    }

    // Validate each mark entry
    for (const m of marks) {
        if (!m.studentId) throw new AppError("Each mark entry must have studentId", 400);
        if (m.marksObtained === undefined || m.marksObtained === null) {
            throw new AppError("Each mark entry must have marksObtained", 400);
        }
        if (typeof m.marksObtained !== "number" || m.marksObtained < 0) {
            throw new AppError("marksObtained must be a non-negative number", 400);
        }
    }

    // Verify teacher is assigned to this class
    const isAssigned = await supabaseService.isTeacherInClass(userId, classId);
    if (!isAssigned) {
        throw new AppError("You are not assigned to this class", 403);
    }

    // Format marks for DB
    const marksData = marks.map((m) => ({
        student_id: m.studentId,
        exam_id: examId,
        subject_id: subjectId,
        marks_obtained: m.marksObtained,
        uploaded_by: userId,
    }));

    const result = await supabaseService.uploadMarks(marksData);

    // Auto-notify each student about their marks (non-fatal)
    try {
        for (const m of marks) {
            try {
                const notifyUserId = m.studentId;
                await sendNotification(
                    notifyUserId,
                    "Marks Updated",
                    `Your marks have been uploaded for the latest exam.`,
                    "marks"
                );
            } catch (notifErr) {
                console.warn("⚠️ Non-fatal notification error for student:", m.studentId, notifErr.message);
            }
        }
    } catch (outerErr) {
        console.warn("⚠️ Non-fatal notification loop error:", outerErr.message);
    }


    res.status(201).json({
        success: true,
        data: result,
        message: `Marks uploaded for ${result.length} students`,
    });
});

// ============================================
// POST /api/teacher/attendance
// Record attendance for a class
// ============================================
export const recordAttendance = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    await ensureTeacher(userId);

    const { classId, date, attendance } = req.body;

    // Input validation
    if (!classId) throw new AppError("classId is required", 400);
    if (!attendance || !Array.isArray(attendance) || attendance.length === 0) {
        throw new AppError("attendance must be a non-empty array", 400);
    }

    const validStatuses = ["present", "absent", "late"];
    for (const a of attendance) {
        if (!a.studentId) throw new AppError("Each attendance entry must have studentId", 400);
        if (!validStatuses.includes(a.status)) {
            throw new AppError(`status must be one of: ${validStatuses.join(", ")}`, 400);
        }
    }

    // Verify teacher is assigned to this class
    const isAssigned = await supabaseService.isTeacherInClass(userId, classId);
    if (!isAssigned) {
        throw new AppError("You are not assigned to this class", 403);
    }

    const attendanceDate = date || new Date().toISOString().split("T")[0];

    // Format records
    const records = attendance.map((a) => ({
        class_id: classId,
        student_id: a.studentId,
        date: attendanceDate,
        status: a.status,
        marked_by: userId,
    }));

    const result = await supabaseService.createAttendance(records);

    // Notify absent students
    const absentStudents = attendance.filter((a) => a.status === "absent");
    for (const a of absentStudents) {
        await sendNotification(
            a.studentId,
            "Attendance Marked",
            `You were marked absent on ${attendanceDate}.`,
            "attendance"
        );
    }

    res.status(201).json({
        success: true,
        data: result,
        message: `Attendance recorded for ${records.length} students on ${attendanceDate}`,
    });
});

// ============================================
// POST /api/teacher/announcement
// Create an announcement for a class
// ============================================
export const createAnnouncement = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    await ensureTeacher(userId);

    const { classId, title, body } = req.body;

    // Input validation
    if (!classId) throw new AppError("classId is required", 400);
    if (!title || title.trim().length === 0) throw new AppError("title is required", 400);
    if (!body || body.trim().length === 0) throw new AppError("body is required", 400);
    if (title.length > 200) throw new AppError("title must be under 200 characters", 400);

    // Verify teacher is assigned to this class
    const isAssigned = await supabaseService.isTeacherInClass(userId, classId);
    if (!isAssigned) {
        throw new AppError("You are not assigned to this class", 403);
    }

    const announcement = await supabaseService.createAnnouncement({
        class_id: classId,
        title: title.trim(),
        body: body.trim(),
        created_by: userId,
    });

    // Get all enrolled students and notify them
    const { data: enrollments } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("class_id", classId);

    if (enrollments && enrollments.length > 0) {
        for (const enrollment of enrollments) {
            await sendNotification(
                enrollment.student_id,
                `📢 New Announcement`,
                title.trim(),
                "announcement"
            );
        }
    }

    res.status(201).json({
        success: true,
        data: announcement,
        message: "Announcement created successfully",
    });
});

// ============================================
// GET /api/teacher/announcements/:classId
// Get announcements for a class
// ============================================
export const getClassAnnouncements = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    await ensureTeacher(userId);

    const { classId } = req.params;
    if (!classId) throw new AppError("classId is required", 400);

    const data = await supabaseService.getAnnouncementsByClass(classId);

    res.status(200).json({
        success: true,
        data,
        count: data.length,
    });
});

// ============================================
// POST /api/teacher/performance
// Generate a performance report for a student
// ============================================
export const createPerformanceReport = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    await ensureTeacher(userId);

    const { studentId, classId, period, avgMarks, attendancePct, totalExams, totalPresent, totalAbsent, remarks } = req.body;

    // Input validation
    if (!studentId) throw new AppError("studentId is required", 400);
    if (!classId) throw new AppError("classId is required", 400);
    if (!period) throw new AppError("period is required (e.g. '2024-Q1')", 400);

    // Verify teacher is assigned to this class
    const isAssigned = await supabaseService.isTeacherInClass(userId, classId);
    if (!isAssigned) {
        throw new AppError("You are not assigned to this class", 403);
    }

    const report = await supabaseService.createPerformanceReport({
        student_id: studentId,
        class_id: classId,
        period,
        avg_marks: avgMarks || 0,
        attendance_pct: attendancePct || 0,
        total_exams: totalExams || 0,
        total_present: totalPresent || 0,
        total_absent: totalAbsent || 0,
        remarks: remarks || null,
        created_by: userId,
    });

    // Notify student
    await sendNotification(
        studentId,
        "Performance Report Available",
        `Your performance report for ${period} has been generated.`,
        "performance"
    );

    res.status(201).json({
        success: true,
        data: report,
        message: "Performance report created successfully",
    });
});

// ============================================
// GET /api/teacher/subjects/:classId
// Get subjects for a class
// ============================================
export const getSubjects = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    await ensureTeacher(userId);

    const { classId } = req.params;
    const data = await supabaseService.getSubjectsByClass(classId);

    res.status(200).json({ success: true, data });
});

// ============================================
// POST /api/teacher/subjects
// Create a subject for a class
// ============================================
export const createSubject = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    await ensureTeacher(userId);

    const { classId, name } = req.body;
    if (!classId) throw new AppError("classId is required", 400);
    if (!name || name.trim().length === 0) throw new AppError("name is required", 400);

    const data = await supabaseService.createSubject({ class_id: classId, name: name.trim() });

    res.status(201).json({ success: true, data });
});

// ============================================
// GET /api/teacher/exams/:classId
// Get exams for a class
// ============================================
export const getExams = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    await ensureTeacher(userId);

    const { classId } = req.params;
    const data = await supabaseService.getExamsByClass(classId);

    res.status(200).json({ success: true, data });
});

// ============================================
// POST /api/teacher/exams
// Create an exam for a class
// ============================================
export const createExam = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    await ensureTeacher(userId);

    const { classId, name, maxMarks } = req.body;
    if (!classId) throw new AppError("classId is required", 400);
    if (!name || name.trim().length === 0) throw new AppError("name is required", 400);
    if (!maxMarks || maxMarks <= 0) throw new AppError("maxMarks must be a positive number", 400);

    const data = await supabaseService.createExam({
        class_id: classId,
        name: name.trim(),
        max_marks: maxMarks,
    });

    res.status(201).json({ success: true, data });
});

// ============================================
// GET /api/teacher/stats
// Dashboard stats: total assigned students, total classes
// ============================================
export const getTeacherStats = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    await ensureTeacher(userId);

    // Get teacher's classes
    const { data: teacherClasses, error: tcError } = await supabase
        .from("teacher_classes")
        .select("class_id")
        .eq("teacher_id", userId);

    if (tcError) {
        console.error("❌ Error fetching teacher classes:", tcError);
        throw new AppError("Failed to fetch teacher stats", 500);
    }

    const classIds = (teacherClasses || []).map((tc) => tc.class_id);
    const totalClasses = classIds.length;

    // Count distinct students enrolled in those classes
    let totalStudents = 0;
    if (classIds.length > 0) {
        const { data: enrollments, error: enError } = await supabase
            .from("enrollments")
            .select("student_id")
            .in("class_id", classIds);

        if (!enError && enrollments) {
            const uniqueStudents = new Set(enrollments.map((e) => e.student_id));
            totalStudents = uniqueStudents.size;
        }
    }

    res.status(200).json({
        success: true,
        data: {
            totalClasses,
            totalStudents,
        },
    });
});
