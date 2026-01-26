/**
 * Profile Completion Controller
 * Handles initial profile setup for students and teachers
 */

import * as supabaseService from "../services/supabase.service.js";
import { AppError, asyncHandler } from "../utils/errorHandler.js";

/**
 * GET /profile-completion/status
 * Check if the user's profile is complete
 */
export const getProfileStatus = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // 1. Fetch user role from roles table
  const userRole = await supabaseService.getUserRole(userId);

  if (!userRole) {
    throw new AppError("User role not found", 404);
  }

  // 2. Fetch profile based on role
  let isComplete = false;
  let profileData = null;

  if (userRole === 'student') {
    const { data, error } = await supabaseService.supabase
      .from("student_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!error && data) {
      profileData = data;
      // Check if required fields are filled
      isComplete = !!(data.first_name && data.last_name && data.branch && data.degree && data.registration_number);
    }
  } else if (userRole === 'teacher') {
    const { data, error } = await supabaseService.supabase
      .from("teacher_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!error && data) {
      profileData = data;
      // Check if required fields are filled
      isComplete = !!(data.first_name && data.last_name && data.department && data.qualification);
    }
  } else {
    // Admin doesn't need profile completion
    isComplete = true;
  }

  res.json({
    success: true,
    isComplete: isComplete,
    profile: profileData,
    role: userRole
  });
});

/**
 * POST /profile-completion/student
 * Complete student profile
 */
export const completeStudentProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const {
    first_name,
    last_name,
    dob,
    address,
    branch,
    degree,
    registration_number,
    profile_picture_url
  } = req.body;

  // Validation
  if (!first_name || !last_name || !branch || !degree || !registration_number) {
    throw new AppError("Missing required fields", 400);
  }

  // 1. Update main profile
  const mainProfileUpdates = {
    first_name,
    last_name,
    full_name: `${first_name} ${last_name}`,
    dob,
    address,
    profile_picture_url,
    is_profile_complete: true
  };

  // 2. Update student specific profile
  const studentProfileUpdates = {
    branch,
    degree,
    registration_number
    // Add other fields as necessary based on schema
  };

  const result = await supabaseService.completeStudentProfile(userId, mainProfileUpdates, studentProfileUpdates);

  res.json({
    success: true,
    message: "Student profile completed successfully",
    data: result
  });
});

/**
 * POST /profile-completion/teacher
 * Complete teacher profile
 */
export const completeTeacherProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const {
    first_name,
    last_name,
    dob,
    address,
    subjects_taught,
    department,
    qualification,
    experience_years,
    profile_picture_url
  } = req.body;

  // Validation
  if (!first_name || !last_name || !department || !qualification) {
    throw new AppError("Missing required fields", 400);
  }

  // 1. Update main profile
  const mainProfileUpdates = {
    first_name,
    last_name,
    full_name: `${first_name} ${last_name}`,
    dob,
    address,
    profile_picture_url,
    is_profile_complete: true
  };

  // 2. Update teacher specific profile
  const teacherProfileUpdates = {
    department,
    qualification,
    experience_years,
    subjects_taught // Ensure this is an array or handle appropriately
  };

  const result = await supabaseService.completeTeacherProfile(userId, mainProfileUpdates, teacherProfileUpdates);

  res.json({
    success: true,
    message: "Teacher profile completed successfully",
    data: result
  });
});
