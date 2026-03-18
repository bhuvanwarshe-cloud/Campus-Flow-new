/**
 * Role Requests Controller
 * Handles the secure role approval workflow:
 * - Users submit role requests (student or teacher only)
 * - Admins approve / reject requests
 * - Approval creates profile entries and enrollments
 */

import { supabase, supabaseAdmin } from "../config/supabase.js";
import supabaseService from "../services/supabase.service.js";
import { AppError, asyncHandler } from "../utils/errorHandler.js";
import { sendUserNotification } from "../utils/notifications.js";

// ─── USER: Submit a role request ────────────────────────────────────────────
/**
 * POST /api/role-requests
 * Body: { requested_role, class_id?, notes?, branch?, degree?,
 *         registration_number?, admission_year?,
 *         subjects?, department?, qualification?, years_of_experience? }
 */
export const submitRoleRequest = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const {
        requested_role,
        class_id,
        class_ids,
        notes,
        // Student fields
        branch,
        degree,
        registration_number,
        admission_year,
        // Teacher fields
        subjects,
        department,
        qualification,
        years_of_experience,
    } = req.body;

    // Security: block admin role requests
    if (!requested_role || requested_role === "admin") {
        throw new AppError(
            "Invalid role request. Only 'student' or 'teacher' roles can be requested.",
            400
        );
    }

    if (!["student", "teacher"].includes(requested_role)) {
        throw new AppError("requested_role must be 'student' or 'teacher'", 400);
    }

    // Validate class selection
    let classesToUse = [];
    if (requested_role === "student") {
        // Students select a single class
        if (!class_id) {
            throw new AppError("Class selection is required for students.", 400);
        }
        classesToUse = [class_id];
    } else if (requested_role === "teacher") {
        // Teachers can select multiple classes
        classesToUse = Array.isArray(class_ids) && class_ids.length > 0 
            ? class_ids 
            : (class_id ? [class_id] : []);
        
        if (classesToUse.length === 0) {
            throw new AppError("At least one class must be selected for teacher role.", 400);
        }
    }

    // Confirm user is pending
    const currentRole = await supabaseService.getUserRole(userId);
    if (currentRole && currentRole !== "pending") {
        throw new AppError(
            `You already have a role (${currentRole}). Role requests are only for pending users.`,
            409
        );
    }

    // Check for existing pending/approved request
    const { data: existing } = await supabaseAdmin
        .from("role_requests")
        .select("id, status")
        .eq("user_id", userId)
        .in("status", ["pending", "approved"])
        .maybeSingle();

    if (existing) {
        throw new AppError(
            `You already have a ${existing.status} role request. Please wait for admin review.`,
            409
        );
    }

    // Build metadata for the request
    const metadata = {};
    if (requested_role === "student") {
        if (branch) metadata.branch = branch;
        if (degree) metadata.degree = degree;
        if (registration_number) metadata.registration_number = registration_number;
        if (admission_year) metadata.admission_year = admission_year;
    } else if (requested_role === "teacher") {
        if (subjects) metadata.subjects = subjects;
        if (department) metadata.department = department;
        if (qualification) metadata.qualification = qualification;
        if (years_of_experience) metadata.years_of_experience = years_of_experience;
        // Store all selected class IDs for teacher
        metadata.class_ids = classesToUse;
    }

    const { data, error } = await supabaseAdmin
        .from("role_requests")
        .insert([{
            user_id: userId,
            requested_role,
            class_id: classesToUse[0] || null,  // Keep first class for backwards compatibility
            notes: notes || null,
            metadata,
            status: "pending",
        }])
        .select()
        .single();

    if (error) throw new AppError(error.message, 500);

    res.status(201).json({
        success: true,
        data,
        message: "Role request submitted. Awaiting admin approval.",
    });
});

// ─── USER: Get my current role request ──────────────────────────────────────
/**
 * GET /api/role-requests/me
 */
export const getMyRoleRequest = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // First check teacher requests
    const { data: teacherReq, error: tError } = await supabaseAdmin
        .from("teacher_requests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (tError) throw new AppError(tError.message, 500);

    if (teacherReq) {
        return res.status(200).json({
            success: true,
            data: {
                ...teacherReq,
                requested_role: "teacher"
            },
        });
    }

    // Then check student join requests
    const { data: studentReq, error: sError } = await supabaseAdmin
        .from("student_join_requests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (sError) throw new AppError(sError.message, 500);

    if (studentReq) {
         return res.status(200).json({
            success: true,
            data: {
                ...studentReq,
                requested_role: "student"
            },
        });
    }

    // If neither exists, could be a very old one or none
    res.status(200).json({
        success: true,
        data: null,
    });
});

// ─── ADMIN: List all pending requests ────────────────────────────────────────
/**
 * GET /api/admin/role-requests?status=pending
 */
export const listRoleRequests = asyncHandler(async (req, res) => {
    const { status = "pending" } = req.query;

    const { data, error } = await supabaseAdmin
        .from("role_requests")
        .select("*")
        .eq("status", status)
        .eq("requested_role", "teacher")
        .order("created_at", { ascending: false });

    if (error) throw new AppError(error.message, 500);

    const { data: classesData } = await supabaseAdmin.from("classes").select("id, name");
    const classMap = {};
    if (classesData) {
        classesData.forEach(c => classMap[c.id] = c.name);
    }

    // Fetch profiles manually
    const userIds = [...new Set((data || []).map(r => r.user_id))];
    const profileMap = {};
    if (userIds.length > 0) {
        const { data: profilesData } = await supabaseAdmin
            .from("profiles")
            .select("id, first_name, last_name, email")
            .in("id", userIds);

        if (profilesData) {
            profilesData.forEach(p => profileMap[p.id] = p);
        }
    }

    // Flatten for easy frontend use
    const requests = (data || []).map(r => {
        const prof = profileMap[r.user_id] || {};
        return {
            id: r.id,
            user_id: r.user_id,
            requested_role: r.requested_role,
            class_id: r.class_id,
            class_name: r.class_id ? classMap[r.class_id] : null,
            status: r.status,
            notes: r.notes,
            metadata: r.metadata,
            created_at: r.created_at,
            reviewed_at: r.reviewed_at,
            first_name: prof.first_name || null,
            last_name: prof.last_name || null,
            email: prof.email || null,
        };
    });

    res.status(200).json({
        success: true,
        data: requests,
        count: requests.length,
    });
});

// ─── ADMIN: Approve a role request ───────────────────────────────────────────
/**
 * PATCH /api/admin/role-requests/:id/approve
 */
export const approveRoleRequest = asyncHandler(async (req, res) => {
    const adminId = req.user.id;
    const { id } = req.params;

    // Fetch the request
    const { data: request, error: fetchError } = await supabaseAdmin
        .from("role_requests")
        .select("*")
        .eq("id", id)
        .single();

    if (fetchError || !request) throw new AppError("Role request not found", 404);
    if (request.status !== "pending") throw new AppError("Request is not pending", 400);

    // Security: admins cannot approve their own request
    if (request.user_id === adminId) {
        throw new AppError("You cannot approve your own role request", 403);
    }

    const userId = request.user_id;
    const role = request.requested_role;

    // 1. Update roles table
    const { error: roleError } = await supabaseAdmin
        .from("roles")
        .insert({ user_id: userId, role });

    // Ignore duplicate key errors (user already has a role)
    if (roleError && roleError.code !== '23505') {
        throw new AppError(`Failed to update role: ${roleError.message}`, 500);
    }

    // 2. Create role-specific profile + enrollment
    const meta = request.metadata || {};

    if (role === "student") {
        // Insert student_profiles with only valid fields
        const { error: profileError } = await supabaseAdmin.from("student_profiles").insert({
            user_id: userId,
            admission_year: meta.admission_year ? parseInt(meta.admission_year) : null,
        });
        
        // Ignore duplicate key errors (profile already exists)
        if (profileError && profileError.code !== '23505') {
            console.error("Failed to create student profile:", profileError);
        }

        // Insert legacy students table
        const { data: prof } = await supabaseAdmin
            .from("profiles")
            .select("first_name, last_name")
            .eq("id", userId)
            .single();

        const { error: studentError } = await supabaseAdmin.from("students").insert({
            id: userId,
            user_id: userId,
            name: prof ? `${prof.first_name || ""} ${prof.last_name || ""}`.trim() : "Unknown",
        });
        
        // Ignore duplicate key errors (student already exists)
        if (studentError && studentError.code !== '23505') {
            console.error("Failed to create student record:", studentError);
        }

        // Create enrollment if class_id provided
        if (request.class_id) {
            const { error: enrollError } = await supabaseAdmin.from("enrollments").insert({
                student_id: userId,
                class_id: request.class_id,
            });
            
            // Ignore duplicate key errors (enrollment already exists)
            if (enrollError && enrollError.code !== '23505') {
                console.error("Failed to create enrollment:", enrollError);
            }
        }

    } else if (role === "teacher") {
        // Insert teacher_profiles with only valid fields
        const { error: profileError } = await supabaseAdmin.from("teacher_profiles").insert({
            user_id: userId,
            department: meta.department || null,
            qualification: meta.qualification || null,
            experience_years: meta.years_of_experience ? parseInt(meta.years_of_experience) : null,
            subjects_taught: [],  // Empty array for subjects
        });
        
        // Ignore duplicate key errors (profile already exists)
        if (profileError && profileError.code !== '23505') {
            console.error("Failed to create teacher profile:", profileError);
        }

        // Map teacher to all selected classes in teacher_classes (not as class teacher yet)
        // Get all class IDs from metadata or fall back to single class_id
        const classIds = Array.isArray(meta.class_ids) && meta.class_ids.length > 0 
            ? meta.class_ids 
            : (request.class_id ? [request.class_id] : []);

        // Create teacher_classes entries for each selected class
        if (classIds.length > 0) {
            for (const classId of classIds) {
                const { error: insertError } = await supabaseAdmin
                    .from("teacher_classes")
                    .insert({
                        teacher_id: userId,
                        class_id: classId,
                        is_class_teacher: false
                    });
                
                // Ignore duplicate key errors (teacher already assigned to class)
                if (insertError && insertError.code !== '23505') {
                    console.error("Failed to assign teacher to class:", insertError);
                }
            }
        }
    }

    // 3. Mark request as approved
    const { error: updateError } = await supabaseAdmin
        .from("role_requests")
        .update({
            status: "approved",
            reviewed_at: new Date().toISOString(),
            reviewed_by: adminId,
        })
        .eq("id", id);

    if (updateError) throw new AppError(updateError.message, 500);

    // 4. Notify user
    await sendUserNotification(userId, {
        title: "🎉 Role Approved!",
        message: `Your request to become a ${role} has been approved. You can now log in.`,
        type: "success",
        link: "/dashboard",
    });

    res.status(200).json({
        success: true,
        message: `User approved as ${role}.`,
    });
});

// ─── ADMIN: Reject a role request ────────────────────────────────────────────
/**
 * PATCH /api/admin/role-requests/:id/reject
 * Body: { reason? }
 */
export const rejectRoleRequest = asyncHandler(async (req, res) => {
    const adminId = req.user.id;
    const { id } = req.params;
    const { reason } = req.body;

    const { data: request, error: fetchError } = await supabaseAdmin
        .from("role_requests")
        .select("*")
        .eq("id", id)
        .single();

    if (fetchError || !request) throw new AppError("Role request not found", 404);
    if (request.status !== "pending") throw new AppError("Request is not pending", 400);

    if (request.user_id === adminId) {
        throw new AppError("You cannot reject your own role request", 403);
    }

    const { error } = await supabaseAdmin
        .from("role_requests")
        .update({
            status: "rejected",
            notes: reason || request.notes,
            reviewed_at: new Date().toISOString(),
            reviewed_by: adminId,
        })
        .eq("id", id);

    if (error) throw new AppError(error.message, 500);

    // Notify user
    await sendUserNotification(request.user_id, {
        title: "Role Request Rejected",
        message: reason
            ? `Your role request was rejected: ${reason}`
            : "Your role request was rejected. Please resubmit with correct information.",
        type: "error",
        link: "/role-request",
    });

    res.status(200).json({
        success: true,
        message: "Role request rejected.",
    });
});

// ─── ADMIN: Count pending requests ───────────────────────────────────────────
/**
 * GET /api/admin/role-requests/count
 */
export const countPendingRequests = asyncHandler(async (req, res) => {
    const { count, error } = await supabaseAdmin
        .from("role_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

    if (error) throw new AppError(error.message, 500);

    res.status(200).json({ success: true, count: count || 0 });
});

// ─── TEACHER: List pending requests for their assigned classes ────────────────
/**
 * GET /api/teacher/role-requests
 */
export const getTeacherRoleRequests = asyncHandler(async (req, res) => {
    const teacherId = req.user.id;

    // We only want role requests where class_id is in teacher_classes that this teacher owns.
    const { data: teacherClasses } = await supabaseAdmin
        .from("teacher_classes")
        .select("class_id")
        .eq("teacher_id", teacherId)
        .eq("is_class_teacher", true);

    const classIds = teacherClasses?.map(tc => tc.class_id) || [];

    if (classIds.length === 0) {
        return res.status(200).json({ success: true, data: [], count: 0 });
    }

    const { data, error } = await supabaseAdmin
        .from("role_requests")
        .select("*")
        .eq("status", "pending")
        .eq("requested_role", "student")
        .in("class_id", classIds)
        .order("created_at", { ascending: false });

    if (error) throw new AppError(error.message, 500);

    const { data: classesData } = await supabaseAdmin.from("classes").select("id, name");
    const classMap = {};
    if (classesData) {
        classesData.forEach(c => classMap[c.id] = c.name);
    }

    const userIds = [...new Set((data || []).map(r => r.user_id))];
    const profileMap = {};
    if (userIds.length > 0) {
        const { data: profilesData } = await supabaseAdmin
            .from("profiles")
            .select("id, first_name, last_name, email")
            .in("id", userIds);

        if (profilesData) {
            profilesData.forEach(p => profileMap[p.id] = p);
        }
    }

    const requests = (data || []).map(r => {
        const prof = profileMap[r.user_id] || {};
        return {
            id: r.id,
            user_id: r.user_id,
            requested_role: r.requested_role,
            class_id: r.class_id,
            class_name: r.class_id ? classMap[r.class_id] : null,
            status: r.status,
            notes: r.notes,
            metadata: r.metadata,
            created_at: r.created_at,
            first_name: prof.first_name || null,
            last_name: prof.last_name || null,
            email: prof.email || null,
        };
    });

    res.status(200).json({
        success: true,
        data: requests,
        count: requests.length,
    });
});

// ─── TEACHER: Approve a student request ────────────────────────────────────
/**
 * PATCH /api/teacher/role-requests/:id/approve
 */
export const approveStudentRequestAsTeacher = asyncHandler(async (req, res) => {
    const teacherId = req.user.id;
    const { id: requestId } = req.params;

    // Call internal function similar to admin approval, but verifying class ownership
    const { data: request, error: fetchError } = await supabaseAdmin
        .from("role_requests")
        .select("*")
        .eq("id", requestId)
        .single();

    if (fetchError || !request) throw new AppError("Role request not found", 404);
    if (request.status !== "pending") throw new AppError("Request is not pending", 400);
    if (request.requested_role !== "student") throw new AppError("Teachers can only approve student requests", 400);

    // Verify this teacher is the class teacher
    const { data: tcAuth } = await supabaseAdmin
        .from("teacher_classes")
        .select("id")
        .eq("class_id", request.class_id)
        .eq("teacher_id", teacherId)
        .eq("is_class_teacher", true)
        .maybeSingle();

    if (!tcAuth) throw new AppError("You are not authorized to approve requests for this class.", 403);

    // Same approval logic as Admin
    const userId = request.user_id;
    const role = "student";

    const { error: roleError } = await supabaseAdmin
        .from("roles")
        .insert({ user_id: userId, role });

    // Ignore duplicate key errors (user already has a role)
    if (roleError && roleError.code !== '23505') {
        throw new AppError(`Failed to update role: ${roleError.message}`, 500);
    }

    const meta = request.metadata || {};

    // Insert student_profiles with only valid fields
    const { error: profileError } = await supabaseAdmin.from("student_profiles").insert({
        user_id: userId,
        admission_year: meta.admission_year ? parseInt(meta.admission_year) : null,
    });
    
    // Ignore duplicate key errors (profile already exists)
    if (profileError && profileError.code !== '23505') {
        console.error("Failed to create student profile:", profileError);
    }

    // Insert legacy students table
    const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", userId)
        .single();

    const { error: studentError } = await supabaseAdmin.from("students").insert({
        id: userId,
        user_id: userId,
        name: prof ? `${prof.first_name || ""} ${prof.last_name || ""}`.trim() : "Unknown",
    });
    
    // Ignore duplicate key errors (student already exists)
    if (studentError && studentError.code !== '23505') {
        console.error("Failed to create student record:", studentError);
    }

    // Create enrollment
    if (request.class_id) {
        const { error: enrollError } = await supabaseAdmin.from("enrollments").insert({
            student_id: userId,
            class_id: request.class_id,
        });
        
        // Ignore duplicate key errors (enrollment already exists)
        if (enrollError && enrollError.code !== '23505') {
            console.error("Failed to create enrollment:", enrollError);
        }
    }

    // Mark request as approved
    const { error: updateError } = await supabaseAdmin
        .from("role_requests")
        .update({
            status: "approved",
            reviewed_at: new Date().toISOString(),
            reviewed_by: teacherId,
        })
        .eq("id", requestId);

    if (updateError) throw new AppError(updateError.message, 500);

    // Notify user
    await sendUserNotification(userId, {
        title: "🎉 Enrollment Approved!",
        message: `Your request to join ${request.classes?.name || 'the class'} has been approved by your class teacher.`,
        type: "success",
        link: "/dashboard",
    });

    res.status(200).json({ success: true, message: `Student approved for class.` });
});

// ─── TEACHER: Reject a student request ────────────────────────────────────
/**
 * PATCH /api/teacher/role-requests/:id/reject
 */
export const rejectStudentRequestAsTeacher = asyncHandler(async (req, res) => {
    const teacherId = req.user.id;
    const { id: requestId } = req.params;
    const { reason } = req.body;

    const { data: request, error: fetchError } = await supabaseAdmin
        .from("role_requests")
        .select("*")
        .eq("id", requestId)
        .single();

    if (fetchError || !request) throw new AppError("Role request not found", 404);
    if (request.status !== "pending") throw new AppError("Request is not pending", 400);

    // Verify this teacher is the class teacher
    const { data: tcAuth } = await supabaseAdmin
        .from("teacher_classes")
        .select("id")
        .eq("class_id", request.class_id)
        .eq("teacher_id", teacherId)
        .eq("is_class_teacher", true)
        .maybeSingle();

    if (!tcAuth) throw new AppError("You are not authorized to reject requests for this class.", 403);

    const { error } = await supabaseAdmin
        .from("role_requests")
        .update({
            status: "rejected",
            notes: reason || request.notes,
            reviewed_at: new Date().toISOString(),
            reviewed_by: teacherId,
        })
        .eq("id", requestId);

    if (error) throw new AppError(error.message, 500);

    // Notify user
    await sendUserNotification(request.user_id, {
        title: "Class Request Rejected",
        message: reason
            ? `Your class join request was rejected: ${reason}`
            : "Your class join request was rejected by the class teacher.",
        type: "error",
        link: "/role-request",
    });

    res.status(200).json({ success: true, message: "Student request rejected." });
});
