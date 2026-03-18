/**
 * Admin Controller
 * Handles admin-specific operations like viewing all users
 */

import * as supabaseService from "../services/supabase.service.js";
import { AppError, asyncHandler } from "../utils/errorHandler.js";
import { sendUserNotification } from "../utils/notifications.js";
import * as teacherInvitesService from "../services/teacherInvites.service.js";
import * as emailService from "../services/email.service.js";
import { config } from "../config/env.js";

// ============================================
// GET /api/admin/overview
// High-level admin dashboard metrics
// ============================================
export const getOverview = asyncHandler(async (req, res) => {
  // ensureAdmin middleware already enforces admin role

  const overview = await supabaseService.getAdminOverview();

  res.status(200).json({
    success: true,
    data: overview,
  });
});

// ============================================
// GET /api/admin/users
// Paginated + searchable user listing
// ============================================
export const getAllUsers = asyncHandler(async (req, res) => {
  // Middleware has already validated admin access

  const page = Number.parseInt(req.query.page, 10) || 1;
  const limit = Number.parseInt(req.query.limit, 10) || 20;
  const search = (req.query.search || "").toString();

  if (page <= 0) {
    throw new AppError("page must be a positive integer", 400);
  }

  if (limit <= 0 || limit > 100) {
    throw new AppError("limit must be between 1 and 100", 400);
  }

  const result = await supabaseService.getAdminUsers({
    page,
    limit,
    search,
  });

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

// ============================================
// GET /api/admin/users/students
// Legacy endpoint: all students with profile info
// ============================================
export const getAllStudents = asyncHandler(async (req, res) => {
  // Double-check admin role even though middleware already ran
  if (req.user.role !== "admin") {
    throw new AppError("Access denied. Admin only.", 403);
  }

  const students = await supabaseService.getAllStudents();

  res.status(200).json({
    success: true,
    count: students.length,
    data: students,
  });
});

// ============================================
// GET /api/admin/users/teachers
// Legacy endpoint: all teachers with profile info
// ============================================
export const getAllTeachers = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    throw new AppError("Access denied. Admin only.", 403);
  }

  const teachers = await supabaseService.getAllTeachers();

  res.status(200).json({
    success: true,
    count: teachers.length,
    data: teachers,
  });
});

// ============================================
// PATCH /api/admin/users/:id/role
// Update a user's role with validation & self-protection
// ============================================
export const updateUserRole = asyncHandler(async (req, res) => {
  const targetUserId = req.params.id;
  const { role } = req.body || {};

  if (!targetUserId) {
    throw new AppError("User id parameter is required", 400);
  }

  if (!role || typeof role !== "string") {
    throw new AppError("role is required and must be a string", 400);
  }

  const normalizedRole = role.toLowerCase().trim();

  // Prevent admin from demoting themselves to a non-admin role
  if (req.user.id === targetUserId && normalizedRole !== "admin") {
    throw new AppError("You cannot change your own role to non-admin", 403);
  }

  const result = await supabaseService.updateUserRole(targetUserId, normalizedRole);

  res.status(200).json({
    success: true,
    message: "User role updated successfully",
    data: result,
  });
});

// ============================================
// PATCH /api/admin/users/:id/status
// Enable / disable a user
// ============================================
export const updateUserStatus = asyncHandler(async (req, res) => {
  const targetUserId = req.params.id;
  const { isActive } = req.body || {};

  if (!targetUserId) {
    throw new AppError("User id parameter is required", 400);
  }

  if (typeof isActive !== "boolean") {
    throw new AppError("isActive is required and must be a boolean", 400);
  }

  const result = await supabaseService.updateUserStatus(targetUserId, isActive);

  res.status(200).json({
    success: true,
    message: `User has been ${result.is_active ? "enabled" : "disabled"}`,
    data: result,
  });
});

// ============================================
// GET /api/admin/classes
// List classes with teacher info and enrollment counts
// ============================================
export const getAdminClasses = asyncHandler(async (req, res) => {
  const classes = await supabaseService.getAdminClasses();

  res.status(200).json({
    success: true,
    count: classes.length,
    data: classes,
  });
});

// ============================================
// PATCH /api/admin/classes/:class_id/assign-teacher
// Assigns a teacher as the class teacher for a class
// ============================================
export const assignClassTeacher = asyncHandler(async (req, res) => {
  const { class_id } = req.params;
  const { teacher_id } = req.body;

  if (!class_id) throw new AppError("class_id parameter is required", 400);
  if (!teacher_id) throw new AppError("teacher_id is required in body", 400);

  // Validate that the user is actually a teacher natively 
  const role = await supabaseService.getUserRole(teacher_id);
  if (role !== "teacher") {
    throw new AppError("Assigned user must have the 'teacher' role", 400);
  }

  const result = await supabaseService.assignClassTeacher(class_id, teacher_id);

  res.status(200).json({
    success: true,
    message: "Class teacher assigned successfully",
    data: result,
  });
});

// ============================================
// GET /api/admin/academics
// Academics overview: weak classes, low attendance, teacher workload
// ============================================
export const getAcademicsOverview = asyncHandler(async (req, res) => {
  const weakThresholdRaw = req.query.weakThreshold;
  const attendanceThresholdRaw = req.query.attendanceThreshold;

  let weakThreshold;
  let attendanceThreshold;

  if (weakThresholdRaw !== undefined) {
    const parsed = Number.parseFloat(weakThresholdRaw);
    if (Number.isNaN(parsed) || parsed < 0) {
      throw new AppError("weakThreshold must be a non-negative number", 400);
    }
    weakThreshold = parsed;
  }

  if (attendanceThresholdRaw !== undefined) {
    const parsed = Number.parseFloat(attendanceThresholdRaw);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
      throw new AppError("attendanceThreshold must be between 0 and 100", 400);
    }
    attendanceThreshold = parsed;
  }

  const overview = await supabaseService.getAdminAcademics({
    weakThreshold,
    attendanceThreshold,
  });

  res.status(200).json({
    success: true,
    data: overview,
  });
});

// ============================================
// GET /api/admin/teacher-requests
// List pending teacher requests
// ============================================
export const getTeacherRequests = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseService.supabase
    .from("teacher_requests")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw new AppError(error.message, 500);

  // Fetch classes
  const { data: classesData } = await supabaseService.supabase
    .from("classes")
    .select("id, name");
  
  const classMap = {};
  if (classesData) {
    classesData.forEach(c => classMap[c.id] = c.name);
  }

  // Fetch profiles manually
  const userIds = [...new Set((data || []).map(r => r.user_id))];
  const profileMap = {};
  if (userIds.length > 0) {
    const { data: profilesData } = await supabaseService.supabase
      .from("profiles")
      .select("user_id, first_name, last_name, email, full_name")
      .in("user_id", userIds);

    if (profilesData) {
      profilesData.forEach(p => profileMap[p.user_id] = p);
    }
  }

  // Format response
  const formattedData = (data || []).map(req => {
    const prof = profileMap[req.user_id] || {};
    return {
      id: req.id,
      user_id: req.user_id,
      class_id: req.class_id,
      status: req.status,
      notes: req.notes,
      metadata: req.metadata,
      created_at: req.created_at,
      class_name: classMap[req.class_id] || null,
      first_name: prof.first_name || prof.full_name?.split(" ")[0] || "",
      last_name: prof.last_name || prof.full_name?.split(" ").slice(1).join(" ") || "",
      email: prof.email || ""
    };
  });

  res.status(200).json({
    success: true,
    count: formattedData.length,
    data: formattedData,
  });
});

// ============================================
// PATCH /api/admin/teacher-requests/:id/approve
// Approve a teacher request
// ============================================
export const approveTeacherRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const adminId = req.user.id;

  // Fetch the request to get metadata with class_ids
  const { data: requestData, error: fetchError } = await supabaseService.supabase
    .from("teacher_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !requestData) {
    throw new AppError("Teacher request not found", 404);
  }

  // If already approved, return success (idempotent)
  if (requestData.status === "approved") {
    return res.status(200).json({
      success: true,
      message: "Teacher request is already approved.",
    });
  }

  if (requestData.status !== "pending") {
    throw new AppError("Request is not pending", 400);
  }

  // Utilize the transactional RPC function created in the migration
  const { error } = await supabaseService.supabase.rpc("approve_teacher_request", {
    p_request_id: id,
    p_admin_id: adminId
  });

  if (error) {
    if (error.message.includes('not found')) {
      throw new AppError("Pending teacher request not found", 404);
    }
    throw new AppError(error.message, 500);
  }

  // Assign teacher to all selected classes from metadata
  const metadata = requestData.metadata || {};
  const classIds = Array.isArray(metadata.class_ids) && metadata.class_ids.length > 0
    ? metadata.class_ids
    : (requestData.class_id ? [requestData.class_id] : []);

  if (classIds.length > 0) {
    for (const classId of classIds) {
      const { error: insertError } = await supabaseService.supabase
        .from("teacher_classes")
        .insert({
          teacher_id: requestData.user_id,
          class_id: classId,
          is_class_teacher: false
        });
      
      // Ignore duplicate key errors (teacher already assigned to class)
      if (insertError && insertError.code !== '23505') {
        throw new AppError(`Failed to assign teacher to class: ${insertError.message}`, 500);
      }
    }
  }

  // Get user_id to send a notification
  if (requestData?.user_id) {
    await sendUserNotification(requestData.user_id, {
      title: "🎉 Role Approved!",
      message: "Your request to become a teacher has been approved.",
      type: "success",
      link: "/dashboard",
    });
  }

  res.status(200).json({
    success: true,
    message: "Teacher request approved successfully.",
  });
});

// ============================================
// PATCH /api/admin/teacher-requests/:id/reject
// Reject a teacher request
// ============================================
export const rejectTeacherRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const adminId = req.user.id;
  const { reason } = req.body;

  const { data: request, error: fetchError } = await supabaseService.supabase
    .from("teacher_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !request) throw new AppError("Pending teacher request not found", 404);
  
  // If already rejected, return success (idempotent)
  if (request.status === "rejected") {
    return res.status(200).json({
      success: true,
      message: "Teacher request is already rejected.",
    });
  }
  
  if (request.status !== "pending") throw new AppError("Request is not pending", 400);

  const { error } = await supabaseService.supabase
    .from("teacher_requests")
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
    message: reason ? `Your role request was rejected: ${reason}` : "Your request was rejected.",
    type: "error",
    link: "/role-request",
  });

  res.status(200).json({
    success: true,
    message: "Teacher request rejected.",
  });
});

// ============================================
// POST /api/admin/invite-teacher
// Invite a teacher via email
// ============================================
export const inviteTeacher = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const adminId = req.user.id;

  if (!email) {
    throw new AppError("Email is required", 400);
  }

  // Create invite in database
  const invite = await teacherInvitesService.createTeacherInvite(email, adminId);

  // Generate invite link
  const inviteLink = `${config.appUrl}/teacher-invite?token=${invite.token}`;

  // Send email invitation
  try {
    await emailService.sendTeacherInviteEmail({
      email,
      token: invite.token,
      inviteLink,
    });
  } catch (emailError) {
    console.error("Email sending failed:", emailError);
    // Don't fail the request - invite is created but email delivery failed
    // Admin can try to resend
    return res.status(200).json({
      success: true,
      data: {
        id: invite.id,
        email: invite.email,
        token: invite.token,
        expiresAt: invite.expiresAt,
      },
      warning: "Invite created but email delivery may have failed. Please check your email service configuration.",
    });
  }

  res.status(201).json({
    success: true,
    message: "Teacher invitation sent successfully",
    data: {
      id: invite.id,
      email: invite.email,
      expiresAt: invite.expiresAt,
    },
  });
});

// ============================================
// GET /api/admin/invites
// List all pending teacher invites
// ============================================
export const listTeacherInvites = asyncHandler(async (req, res) => {
  const invites = await teacherInvitesService.getPendingInvites();

  res.status(200).json({
    success: true,
    count: invites.length,
    data: invites,
  });
});

// ============================================
// POST /api/admin/invites/:id/resend
// Resend an existing invite
// ============================================
export const resendTeacherInvite = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const adminId = req.user.id;

  const invite = await teacherInvitesService.resendInvite(id, adminId);

  // Generate invite link
  const inviteLink = `${config.appUrl}/teacher-invite?token=${invite.token}`;

  // Send email
  try {
    await emailService.sendTeacherInviteEmail({
      email: invite.email,
      token: invite.token,
      inviteLink,
    });
  } catch (emailError) {
    console.error("Email resend failed:", emailError);
    return res.status(200).json({
      success: true,
      data: {
        id: invite.id,
        email: invite.email,
        token: invite.token,
      },
      warning: "Invite created but email delivery may have failed.",
    });
  }

  res.status(200).json({
    success: true,
    message: "Teacher invitation resent successfully",
    data: {
      id: invite.id,
      email: invite.email,
      expiresAt: invite.expiresAt,
    },
  });
});
