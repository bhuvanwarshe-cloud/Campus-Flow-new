import { supabase as supabaseAdmin } from "../config/supabase.js";
import { AppError, asyncHandler } from "../utils/errorHandler.js";
import supabaseService from "../services/supabase.service.js";
import { getSupabaseClient } from "../utils/supabase.client.js";
import { sendClassNotification } from "../utils/notifications.js";

// ============================================
// HELPERS
// ============================================

const ensureTeacher = async (userId) => {
    const role = await supabaseService.getUserRole(userId);
    if (role !== "teacher" && role !== "admin") {
        throw new AppError(`Access denied. Teacher or Admin role required. (Current role: ${role || 'None'})`, 403);
    }
    return role;
};

const resolveStudent = async (req) => {
    const userId = req.user.id;
    const userEmail = req.user.email?.trim();
    const supabase = getSupabaseClient(req.user.token);

    const role = await supabaseService.getUserRole(userId);
    // Allow admin to bypass student role check for viewing, 
    // but they still need to exist in the students table for some logic.
    if (role !== "student" && role !== "admin") {
        throw new AppError(`Access denied. Student role required. (Current role: ${role || 'None'})`, 403);
    }

    const { data: students, error } = await supabase
        .from("students")
        .select("id, email")
        .ilike("email", userEmail)
        .limit(1);

    if (error) throw new AppError(`Failed to resolve student: ${error.message}`, 500);
    if (!students || students.length === 0) {
        throw new AppError("Student record not found.", 404);
    }

    return { studentId: students[0].id, email: students[0].email };
};

// ============================================
// TEACHER ACTIONS
// ============================================

/**
 * Create a new assignment
 * POST /api/teacher/assignments
 */
export const createAssignment = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    await ensureTeacher(userId);

    const { title, description, classId, deadline, createdBy } = req.body;

    // Phase 2: Defense validation - ensure createdBy (if provided) matches req.user.id
    if (createdBy && createdBy !== userId) {
        throw new AppError("Security Violation: You can only create assignments as yourself.", 403);
    }

    if (!title || !classId || !deadline) {
        throw new AppError("Title, classId, and deadline are required", 400);
    }

    // Phase 3: Use token-based client for RLS enforcement
    const supabase = getSupabaseClient(req.user.token);

    const { data, error } = await supabase
        .from("assignments")
        .insert([{
            title,
            description,
            class_id: classId,
            deadline,
            created_by: userId // Explicitly set created_by
        }])
        .select()
        .single();

    if (error) {
        if (error.code === "42501" || error.message.includes("row-level security")) {
            throw new AppError("Forbidden: RLS Policy Violation. You may not have permission for this operation.", 403);
        }
        throw new AppError(error.message, 500);
    }

    // Notify students of the new assignment
    const { data: enrollments } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("class_id", classId);

    if (enrollments && enrollments.length > 0) {
        for (const enrollment of enrollments) {
            await supabase.from("notifications").insert([{
                user_id: enrollment.student_id,
                title: "New Assignment",
                message: `Task: ${title}`,
                is_read: false
            }]);
        }
    }

    res.status(201).json({
        success: true,
        data,
        message: "Assignment created successfully"
    });
});

/**
 * Get assignments created by the teacher
 * GET /api/teacher/assignments
 */
export const getTeacherAssignments = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    await ensureTeacher(userId);

    const supabase = getSupabaseClient(req.user.token);

    const { data, error } = await supabase
        .from("assignments")
        .select(`
            *,
            classes (name)
        `)
        .eq("created_by", userId)
        .order("created_at", { ascending: false });

    if (error) {
        if (error.code === "42501") throw new AppError("Access Denied (RLS)", 403);
        throw new AppError(error.message, 500);
    }

    res.status(200).json({
        success: true,
        data
    });
});

/**
 * Get submissions for a specific assignment
 * GET /api/teacher/assignments/:id/submissions
 */
export const getAssignmentSubmissions = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    await ensureTeacher(userId);

    const { id } = req.params;
    const supabase = getSupabaseClient(req.user.token);

    const { data, error } = await supabase
        .from("assignment_submissions")
        .select(`
            *,
            students (name, email)
        `)
        .eq("assignment_id", id)
        .order("submitted_at", { ascending: false });

    if (error) {
        if (error.code === "42501") throw new AppError("Access Denied (RLS)", 403);
        throw new AppError(error.message, 500);
    }

    res.status(200).json({
        success: true,
        data
    });
});

// ============================================
// STUDENT ACTIONS
// ============================================

/**
 * Get assignments for current student
 * GET /api/student/assignments
 */
export const getStudentAssignments = asyncHandler(async (req, res) => {
    const { studentId, token } = await resolveStudent(req);
    const supabase = getSupabaseClient(req.user.token);

    // Get classes student is enrolled in
    const { data: enrollments } = await supabase
        .from("enrollments")
        .select("class_id")
        .eq("student_id", studentId);

    const classIds = enrollments?.map(e => e.class_id) || [];

    if (classIds.length === 0) {
        return res.status(200).json({ success: true, data: [] });
    }

    // Get assignments for those classes, including submission status
    const { data, error } = await supabase
        .from("assignments")
        .select(`
            *,
            classes (name),
            assignment_submissions (id, submitted_at, status, student_id)
        `)
        .in("class_id", classIds)
        .order("deadline", { ascending: true });

    if (error) {
        if (error.code === "42501") throw new AppError("Access Denied (RLS)", 403);
        throw new AppError(error.message, 500);
    }

    // Filter submissions to only show the one for this student
    const result = data.map(assignment => {
        const submission = assignment.assignment_submissions.find(s => s.student_id === studentId);
        const { assignment_submissions, ...rest } = assignment;
        return {
            ...rest,
            submission: submission || null
        };
    });

    res.status(200).json({
        success: true,
        data: result
    });
});

/**
 * Submit an assignment
 * POST /api/student/assignments/:id/submit
 */
export const submitAssignment = asyncHandler(async (req, res) => {
    const { studentId, email } = await resolveStudent(req);
    const { id } = req.params;
    const supabase = getSupabaseClient(req.user.token);

    if (!req.file) throw new AppError("File is required for submission", 400);

    // Get assignment details to check deadline
    const { data: assignment, error: assignmentError } = await supabase
        .from("assignments")
        .select("deadline, title")
        .eq("id", id)
        .single();

    if (assignmentError || !assignment) throw new AppError("Assignment not found", 404);

    const now = new Date();
    const deadline = new Date(assignment.deadline);
    const status = now > deadline ? "late" : "on-time";

    // Upload file to Supabase Storage
    const fileName = `assignments/${id}/${studentId}_${Date.now()}_${req.file.originalname}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from("campusflow-assets")
        .upload(fileName, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: true
        });

    if (uploadError) throw new AppError(`Upload failed: ${uploadError.message}`, 500);

    const { data: { publicUrl } } = supabase.storage
        .from("campusflow-assets")
        .getPublicUrl(fileName);

    // Save submission record
    const { data, error } = await supabase
        .from("assignment_submissions")
        .upsert([{
            assignment_id: id,
            student_id: studentId,
            file_url: publicUrl,
            status,
            submitted_at: now.toISOString()
        }])
        .select()
        .single();

    if (error) {
        if (error.code === "42501") throw new AppError("Access Denied (RLS)", 403);
        throw new AppError(error.message, 500);
    }

    // Notify teacher
    const { data: assignmentOwner } = await supabase
        .from("assignments")
        .select("created_by")
        .eq("id", id)
        .single();

    if (assignmentOwner) {
        await supabaseAdmin.from("notifications").insert([{
            user_id: assignmentOwner.created_by,
            title: "New Submission",
            message: `Student submitted assignment: ${assignment.title}`,
            is_read: false
        }]);
    }

    res.status(201).json({
        success: true,
        data,
        message: status === "late" ? "Submitted late" : "Submitted successfully"
    });
});
