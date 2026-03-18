/**
 * Teacher Invites Controller
 * Handles teacher invitation verification and profile completion
 */

import * as teacherInvitesService from "../services/teacherInvites.service.js";
import { supabaseAdmin } from "../config/supabase.js";
import { AppError, asyncHandler } from "../utils/errorHandler.js";

/**
 * Verify invite token and get invite details
 * GET /api/teacher-invites/verify/:token
 */
export const verifyInviteToken = asyncHandler(async (req, res) => {
  const { token } = req.params;

  if (!token) {
    throw new AppError("Token is required", 400);
  }

  const invite = await teacherInvitesService.verifyInviteToken(token);

  res.status(200).json({
    success: true,
    data: {
      id: invite.id,
      email: invite.email,
      expiresAt: invite.expiresAt,
    },
  });
});

/**
 * Complete teacher profile from invite
 * POST /api/teacher-invites/complete
 * Body: {
 *   token: string,
 *   email: string,
 *   password: string,
 *   fullName: string,
 *   department: string,
 *   qualification: string,
 *   experienceYears: number
 * }
 */
export const completeTeacherProfile = asyncHandler(async (req, res) => {
  const {
    token,
    email,
    password,
    fullName,
    department,
    qualification,
    experienceYears,
  } = req.body;

  // Validate required fields
  if (!token || !email || !password || !fullName) {
    throw new AppError("Token, email, password, and fullName are required", 400);
  }

  // Verify invite token
  const invite = await teacherInvitesService.verifyInviteToken(token);

  // Ensure email matches
  if (invite.email !== email) {
    throw new AppError("Email does not match the invite", 400);
  }

  // Create user in Supabase Auth
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email since they accepted the invite
  });

  if (authError) {
    throw new AppError(
      authError.message === "User already exists"
        ? "This email is already registered"
        : `Failed to create account: ${authError.message}`,
      400
    );
  }

  const userId = authUser.user.id;

  try {
    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        user_id: userId,
        full_name: fullName,
      });

    if (profileError) {
      throw new AppError(`Failed to create profile: ${profileError.message}`, 500);
    }

    // Create role entry
    const { error: roleError } = await supabaseAdmin
      .from("roles")
      .insert({
        user_id: userId,
        role: "teacher",
      });

    if (roleError) {
      throw new AppError(`Failed to set teacher role: ${roleError.message}`, 500);
    }

    // Create teacher profile
    const { error: teacherProfileError } = await supabaseAdmin
      .from("teacher_profiles")
      .insert({
        user_id: userId,
        department: department || null,
        qualification: qualification || null,
        experience_years: experienceYears || 0,
      });

    if (teacherProfileError) {
      throw new AppError(
        `Failed to create teacher profile: ${teacherProfileError.message}`,
        500
      );
    }

    // Mark invite as accepted
    await teacherInvitesService.acceptInvite(token);

    res.status(201).json({
      success: true,
      message: "Teacher account created successfully",
      data: {
        userId,
        email,
        fullName,
        role: "teacher",
      },
    });
  } catch (error) {
    // Clean up: delete the auth user if profile creation failed
    if (!(error instanceof AppError)) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      } catch (deleteError) {
        console.error("Failed to clean up user on error:", deleteError);
      }
    }
    throw error;
  }
});

export default {
  verifyInviteToken,
  completeTeacherProfile,
};
