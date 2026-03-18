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
import { supabase, supabaseAdmin } from "../config/supabase.js";
import { AppError, asyncHandler } from "../utils/errorHandler.js";
import { sendClassNotification, sendUserNotification } from "../utils/notifications.js";

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
                await sendUserNotification(notifyUserId, {
                    title: "Marks Updated",
                    message: "Your marks have been uploaded for the latest exam.",
                    type: "marks"
                });
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
        await sendUserNotification(a.studentId, {
            title: "Attendance Marked",
            message: `You were marked absent on ${attendanceDate}.`,
            type: "attendance"
        });
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
    await sendClassNotification({
        classId,
        title: `📢 New Announcement`,
        message: title.trim(),
        type: "announcement",
        link: "/student/notifications"
    });

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
    await sendUserNotification(studentId, {
        title: "Performance Report Available",
        message: `Your performance report for ${period} has been generated.`,
        type: "performance"
    });

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

// ============================================
// POST /api/teacher/request
// Submit a request to become a teacher
// ============================================
export const submitTeacherRequest = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    
    // Check if user is pending
    const currentRole = await supabaseService.getUserRole(userId);
    if (currentRole && currentRole !== "pending") {
        throw new AppError(`You already have a role (${currentRole}).`, 409);
    }

    const {
        class_id,
        class_ids,
        subjects,
        department,
        qualification,
        years_of_experience,
        notes
    } = req.body;

    // Accept either class_id (single) or class_ids (multiple)
    const classesToUse = Array.isArray(class_ids) && class_ids.length > 0 
        ? class_ids 
        : (class_id ? [class_id] : []);

    if (classesToUse.length === 0) {
        throw new AppError("At least one class must be selected", 400);
    }

    const metadata = {};
    if (subjects) metadata.subjects = subjects;
    if (department) metadata.department = department;
    if (qualification) metadata.qualification = qualification;
    if (years_of_experience) metadata.years_of_experience = years_of_experience;
    // Store all class IDs in metadata for reference
    metadata.class_ids = classesToUse;

    const { data, error } = await supabaseAdmin
        .from("teacher_requests")
        .insert([{
            user_id: userId,
            class_id: classesToUse[0],  // Keep first class for backwards compatibility
            status: "pending",
            notes: notes || null,
            metadata: metadata
        }])
        .select()
        .single();

    if (error) {
        // Handle unique constraint violation gracefully
        if (error.code === '23505' || error.message.includes('unique constraint')) {
            throw new AppError("You already have a pending teacher request.", 409);
        }
        throw new AppError(error.message, 500);
    }

    res.status(201).json({
        success: true,
        data,
        message: "Teacher request submitted. Awaiting admin approval.",
    });
});

// ============================================
// GET /api/teacher/student-requests
// List pending student join requests for classes where teacher is class teacher
// ============================================
export const getStudentRequests = asyncHandler(async (req, res) => {
    const teacherId = req.user.id;
    await ensureTeacher(teacherId);

    try {
        // STEP 1: Fetch classes where this teacher is the class teacher
        const { data: teacherClasses, error: tcError } = await supabaseAdmin
            .from("teacher_classes")
            .select("class_id")
            .eq("teacher_id", teacherId)
            .eq("is_class_teacher", true);

        if (tcError) {
            console.error("❌ Failed to fetch teacher_classes for student requests:", tcError);
            return res.status(500).json({ message: "Failed to load student requests" });
        }

        // STEP 2: Extract class IDs
        const classIds = teacherClasses?.map((tc) => tc.class_id) || [];
        console.log(`🔍 [Teacher ${teacherId}] Found ${classIds.length} classes where they are class teacher:`, classIds);

        // Handle empty class list safely
        if (classIds.length === 0) {
            return res.status(200).json({ success: true, data: [], count: 0 });
        }

        // STEP 3: Fetch student join requests (base data only)
        const { data: requests, error: reqError } = await supabaseAdmin
            .from("student_join_requests")
            .select("id, user_id, class_id, status, created_at")
            .eq("status", "pending")
            .in("class_id", classIds)
            .order("created_at", { ascending: false });

        if (reqError) {
            console.error("❌ Failed to fetch student_join_requests for teacher:", reqError);
            return res.status(500).json({ message: "Failed to load student requests" });
        }

        const baseRequests = requests || [];

        // If there are no pending requests, short‑circuit
        if (baseRequests.length === 0) {
            return res.status(200).json({ success: true, data: [], count: 0 });
        }

        // STEP 4: Join additional tables to get profile + class display data
        // Collect unique user and class IDs
        const userIds = [...new Set(baseRequests.map((r) => r.user_id))];
        const reqClassIds = [...new Set(baseRequests.map((r) => r.class_id))];

        // Fetch profiles
        let profileMap = {};
        if (userIds.length > 0) {
            const { data: profiles, error: profError } = await supabaseAdmin
                .from("profiles")
                .select("user_id, first_name, last_name, full_name, email")
                .in("user_id", userIds);

            if (profError) {
                console.error("⚠️ Failed to fetch profiles for student requests (non-fatal):", profError);
            } else if (profiles) {
                profileMap = Object.fromEntries(
                    profiles.map((p) => [p.user_id, p])
                );
            }
        }

        // Fetch classes
        let classMap = {};
        if (reqClassIds.length > 0) {
            const { data: classes, error: classError } = await supabaseAdmin
                .from("classes")
                .select("id, name")
                .in("id", reqClassIds);

            if (classError) {
                console.error("⚠️ Failed to fetch classes for student requests (non-fatal):", classError);
            } else if (classes) {
                classMap = Object.fromEntries(
                    classes.map((c) => [c.id, c.name])
                );
            }
        }

        // STEP 5: Format structured response expected by frontend
        const formattedData = baseRequests.map((req) => {
            const profile = profileMap[req.user_id] || {};
            const fullName =
                profile.full_name ||
                (profile.first_name
                    ? `${profile.first_name} ${profile.last_name || ""}`.trim()
                    : null);

            return {
                // Keep both the flat id (for frontend key) and request_id (for API clarity)
                id: req.id,
                request_id: req.id,
                first_name: profile.first_name || null,
                last_name: profile.last_name || null,
                student_name: fullName || "Unknown Student",
                student_email: profile.email || "N/A",
                email: profile.email || "N/A",
                class_name: classMap[req.class_id] || "Unknown Class",
                class_id: req.class_id,
                created_at: req.created_at,
            };
        });

        return res.status(200).json({
            success: true,
            data: formattedData,
            count: formattedData.length,
        });
    } catch (err) {
        console.error("❌ Unexpected error while loading student requests:", err);
        return res.status(500).json({ message: "Failed to load student requests" });
    }
});

// ============================================
// PATCH /api/teacher/student-requests/:id/approve
// Approve a student join request
// ============================================
export const approveStudentRequest = asyncHandler(async (req, res) => {
    const teacherId = req.user.id;
    const { id } = req.params;

    try {
        // STEP 1: Fetch the join request
        const { data: request, error: fetchError } = await supabaseAdmin
            .from("student_join_requests")
            .select("id, user_id, class_id, status, metadata")
            .eq("id", id)
            .single();

        if (fetchError || !request) throw new AppError("Student request not found", 404);
        if (request.status !== "pending") throw new AppError("Request is not pending", 400);

        const { user_id: studentId, class_id: classId, metadata } = request;

        // Verify teacher is authorized to approve this request
        const { data: tcAuth } = await supabaseAdmin
            .from("teacher_classes")
            .select("id")
            .eq("class_id", classId)
            .eq("teacher_id", teacherId)
            .eq("is_class_teacher", true)
            .maybeSingle();

        if (!tcAuth) throw new AppError("You are not authorized to approve requests for this class.", 403);

        // STEP 2: Mark the request as approved
        const { error: updateError } = await supabaseAdmin
            .from("student_join_requests")
            .update({
                status: "approved",
                reviewed_at: new Date().toISOString(),
                reviewed_by: teacherId,
            })
            .eq("id", id);

        if (updateError) throw new AppError(`Failed to update request: ${updateError.message}`, 500);

        // STEP 3: Ensure student_profiles exists
        const { data: existingProfile } = await supabaseAdmin
            .from("student_profiles")
            .select("id")
            .eq("user_id", studentId)
            .maybeSingle();

        if (!existingProfile) {
            const { error: profileError } = await supabaseAdmin
                .from("student_profiles")
                .insert({
                    user_id: studentId,
                    class_id: classId,
                    roll_no: metadata?.registration_number || null,
                    admission_year: metadata?.admission_year ? parseInt(metadata.admission_year) : null,
                });

            if (profileError && !profileError.message.includes("duplicate")) {
                console.error("Student profile error:", profileError);
            }
        }

        // STEP 4: Get user's full name from profiles table
        const { data: userProfile } = await supabaseAdmin
            .from("profiles")
            .select("full_name, first_name, last_name")
            .eq("user_id", studentId)
            .maybeSingle();

        const fullName = userProfile?.full_name || 
            (userProfile?.first_name ? `${userProfile.first_name} ${userProfile.last_name || ""}`.trim() : null) ||
            "Unknown Student";

        // STEP 5: Create student record with id = user_id (students.id represents the auth user)
        // Note: students.id is the user_id from auth - this links the student to the user account
        const { data: existingStudent } = await supabaseAdmin
            .from("students")
            .select("id")
            .eq("id", studentId)
            .maybeSingle();

        if (!existingStudent) {
            // Get user email from auth
            const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
            const userEmail = users?.find(u => u.id === studentId)?.email || `student_${studentId}@local`;

            const { error: studentError } = await supabaseAdmin
                .from("students")
                .insert({
                    id: studentId,  // Use user_id as the students.id
                    name: fullName,
                    email: userEmail,
                    created_by: teacherId,
                });

            if (studentError && !studentError.message.includes("duplicate")) {
                console.error("Student record error:", studentError);
            }
        }

        // STEP 6: Create enrollment record - THIS IS CRITICAL FOR CLASS ASSIGNMENT
        const { data: existingEnrollment } = await supabaseAdmin
            .from("enrollments")
            .select("id")
            .eq("student_id", studentId)
            .eq("class_id", classId)
            .maybeSingle();

        if (!existingEnrollment) {
            const { error: enrollmentError } = await supabaseAdmin
                .from("enrollments")
                .insert({
                    student_id: studentId,  // This is the students.id which equals user_id
                    class_id: classId,
                });

            if (enrollmentError && !enrollmentError.message.includes("duplicate")) {
                console.error("Enrollment error:", enrollmentError);
                throw new AppError(`Failed to create enrollment: ${enrollmentError.message}`, 500);
            }
        }

        // STEP 7: Update role to student
        const { data: existingRole } = await supabaseAdmin
            .from("roles")
            .select("id")
            .eq("user_id", studentId)
            .maybeSingle();

        if (existingRole) {
            const { error: roleError } = await supabaseAdmin
                .from("roles")
                .update({ role: "student" })
                .eq("user_id", studentId);

            if (roleError) console.error("Role update error:", roleError);
        } else {
            const { error: roleError } = await supabaseAdmin
                .from("roles")
                .insert({
                    user_id: studentId,
                    role: "student",
                });

            if (roleError && !roleError.message.includes("duplicate")) {
                console.error("Role creation error:", roleError);
            }
        }

        // STEP 8: Send notification to student
        const { data: classData } = await supabaseAdmin
            .from("classes")
            .select("name")
            .eq("id", classId)
            .single();

        await sendUserNotification(studentId, {
            title: "🎉 Enrollment Approved!",
            message: `Your request to join ${classData?.name || 'the class'} has been approved by your class teacher.`,
            type: "success",
            link: "/dashboard",
        });

        // STEP 9: Return success response with class info
        res.status(200).json({ 
            success: true, 
            message: "Student approved and added to class.",
            data: {
                studentId,
                classId,
                status: "approved"
            }
        });

    } catch (error) {
        console.error("Error approving student request:", error);
        throw new AppError(error.message || "Failed to approve student request", 500);
    }
});

// ============================================
// PATCH /api/teacher/student-requests/:id/reject
// Reject a student join request
// ============================================
export const rejectStudentRequest = asyncHandler(async (req, res) => {
    const teacherId = req.user.id;
    const { id } = req.params;
    const { reason } = req.body;

    const { data: request, error: fetchError } = await supabaseAdmin
        .from("student_join_requests")
        .select("user_id, class_id, status, notes")
        .eq("id", id)
        .single();

    if (fetchError || !request) throw new AppError("Student request not found", 404);
    if (request.status !== "pending") throw new AppError("Request is not pending", 400);

    const { data: tcAuth } = await supabaseAdmin
        .from("teacher_classes")
        .select("id")
        .eq("class_id", request.class_id)
        .eq("teacher_id", teacherId)
        .eq("is_class_teacher", true)
        .maybeSingle();

    if (!tcAuth) throw new AppError("You are not authorized to reject requests for this class.", 403);

    const { error } = await supabaseAdmin
        .from("student_join_requests")
        .update({
            status: "rejected",
            notes: reason || request.notes,
            reviewed_at: new Date().toISOString(),
            reviewed_by: teacherId,
        })
        .eq("id", id);

    if (error) throw new AppError(error.message, 500);

    await sendUserNotification(request.user_id, {
        title: "Class Request Rejected",
        message: reason ? `Your class join request was rejected: ${reason}` : "Your class join request was rejected by the class teacher.",
        type: "error",
        link: "/role-request",
    });

    res.status(200).json({ success: true, message: "Student request rejected." });
});
