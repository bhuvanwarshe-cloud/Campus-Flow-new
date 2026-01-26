/**
 * Profile Controller
 * Handles user profile operations for students and teachers
 * Admins are excluded from profile functionality
 */

import { supabase } from "../config/supabase.js";
import supabaseService from "../services/supabase.service.js";
import { AppError, asyncHandler } from "../utils/errorHandler.js";

/**
 * Get current user's profile
 * GET /api/profile/me
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export const getMyProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get user role
  const userRole = await supabaseService.getUserRole(userId);

  // Admins cannot access profile
  if (userRole === "admin") {
    throw new AppError("Admins do not have profiles", 403);
  }

  // Get full profile with role-specific data
  const profile = await supabaseService.getUserProfile(userId);

  res.status(200).json({
    success: true,
    data: profile,
  });
});

/**
 * Create or update user profile
 * POST /api/profile (create)
 * PUT /api/profile (update)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export const upsertProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const {
    first_name,
    last_name,
    phone,
    address,
    date_of_birth,
    profile_photo,
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

  // Get user role from database
  const userRole = await supabaseService.getUserRole(userId);

  // Admins cannot create/update profiles
  if (userRole === "admin") {
    throw new AppError("Admins do not have profiles", 403);
  }

  // Check if profile exists
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .single();

  let updatedProfile;

  if (!existingProfile) {
    // CREATE NEW PROFILE
    // Validate required fields for creation
    if (!first_name || !last_name) {
      throw new AppError("First name and last name are required for new profiles", 400);
    }

    const { data: created, error: createError } = await supabase
      .from("profiles")
      .insert({
        user_id: userId,
        email: req.user.email, // Ensure email is captured
        first_name,
        last_name,
        phone,
        address,
        date_of_birth,
        profile_photo,
        is_complete: true,
      })
      .select()
      .single();

    if (createError) {
      throw new AppError(`Failed to create profile: ${createError.message}`, 500);
    }
    updatedProfile = created;
  } else {
    // UPDATE EXISTING PROFILE
    // Build update object dynamically to allow partial updates
    const updates = { is_complete: true };
    if (first_name !== undefined) updates.first_name = first_name;
    if (last_name !== undefined) updates.last_name = last_name;
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;
    if (date_of_birth !== undefined) updates.date_of_birth = date_of_birth;
    if (profile_photo !== undefined) updates.profile_photo = profile_photo;

    const { data: updated, error: updateError } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", userId)
      .select()
      .single();

    if (updateError) {
      throw new AppError(`Failed to update profile: ${updateError.message}`, 500);
    }
    updatedProfile = updated;
  }

  // Handle Role-Specific Data (Upsert logic)
  if (userRole === "student") {
    const { data: existingStudent } = await supabase.from("student_profiles").select("id").eq("user_id", userId).single();

    // Filter undefined fields to allow partial updates
    const studentUpdates = {};
    if (branch !== undefined) studentUpdates.branch = branch;
    if (degree !== undefined) studentUpdates.degree = degree;
    if (registration_number !== undefined) studentUpdates.registration_number = registration_number;
    if (admission_year !== undefined) studentUpdates.admission_year = admission_year ? parseInt(admission_year) : null;

    if (existingStudent) {
      if (Object.keys(studentUpdates).length > 0) {
        await supabase.from("student_profiles").update(studentUpdates).eq("user_id", userId);
      }
    } else {
      // For new student profile, ensure required fields or insert what we have
      await supabase.from("student_profiles").insert({
        user_id: userId,
        ...studentUpdates
      });
    }
  } else if (userRole === "teacher") {
    const { data: existingTeacher } = await supabase.from("teacher_profiles").select("id").eq("user_id", userId).single();

    const teacherUpdates = {};
    if (subjects !== undefined) teacherUpdates.subjects = subjects;
    if (department !== undefined) teacherUpdates.department = department;
    if (qualification !== undefined) teacherUpdates.qualification = qualification;
    if (years_of_experience !== undefined) teacherUpdates.years_of_experience = years_of_experience ? parseInt(years_of_experience) : null;

    if (existingTeacher) {
      if (Object.keys(teacherUpdates).length > 0) {
        await supabase.from("teacher_profiles").update(teacherUpdates).eq("user_id", userId);
      }
    } else {
      await supabase.from("teacher_profiles").insert({
        user_id: userId,
        ...teacherUpdates
      });
    }
  }

  res.status(200).json({
    success: true,
    data: updatedProfile,
    message: existingProfile ? "Profile updated successfully" : "Profile created successfully",
  });
});

/**
 * Complete profile during signup
 * POST /api/profile/complete
 * Creates full profile with all fields for new users
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export const completeProfile = asyncHandler(async (req, res) => {
  const {
    user_id,
    email,
    first_name,
    last_name,
    phone,
    address,
    date_of_birth,
    profile_photo,
    role,
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

  // Validate required fields
  if (!user_id || !email || !first_name || !last_name || !role) {
    throw new AppError("Missing required fields", 400);
  }

  // Validate role
  if (!["student", "teacher"].includes(role)) {
    throw new AppError("Invalid role. Must be student or teacher", 400);
  }

  // Create role entry
  const { error: roleError } = await supabase
    .from("roles")
    .insert({
      user_id,
      role,
    });

  if (roleError && roleError.code !== "23505") {
    // 23505 is duplicate key error
    throw new AppError(`Failed to assign role: ${roleError.message}`, 500);
  }

  // Create base profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .insert({
      user_id,
      email,
      first_name,
      last_name,
      phone,
      address,
      date_of_birth,
      profile_photo,
      is_complete: true,
    })
    .select()
    .single();

  if (profileError) {
    throw new AppError(`Failed to create profile: ${profileError.message}`, 500);
  }

  // Create role-specific profile
  if (role === "student") {
    const { error: studentError } = await supabase
      .from("student_profiles")
      .insert({
        user_id,
        branch,
        degree,
        registration_number,
        admission_year: admission_year ? parseInt(admission_year) : null,
      });

    if (studentError) {
      throw new AppError(
        `Failed to create student profile: ${studentError.message}`,
        500
      );
    }
  } else if (role === "teacher") {
    const { error: teacherError } = await supabase
      .from("teacher_profiles")
      .insert({
        user_id,
        subjects,
        department,
        qualification,
        years_of_experience: years_of_experience
          ? parseInt(years_of_experience)
          : null,
      });

    if (teacherError) {
      throw new AppError(
        `Failed to create teacher profile: ${teacherError.message}`,
        500
      );
    }
  }

  res.status(201).json({
    success: true,
    data: profile,
    message: "Profile completed successfully",
  });
});


/**
 * Upload profile photo
 * POST /api/profile/photo
 * Multipart form data with 'photo' field
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export const uploadProfilePhoto = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Check if file exists
  if (!req.file) {
    throw new AppError("No photo file provided", 400);
  }

  // Get user role
  const userRole = await supabaseService.getUserRole(userId);

  // Admins cannot upload profile photos
  if (userRole === "admin") {
    throw new AppError("Admins do not have profiles", 403);
  }

  // Upload to Supabase Storage
  const photoUrl = await supabaseService.uploadProfilePhoto(
    userId,
    req.file.buffer,
    req.file.mimetype
  );

  // Update profile with photo URL
  const updated = await supabaseService.updateProfilePhoto(userId, photoUrl);

  res.status(200).json({
    success: true,
    data: updated,
    photoUrl,
    message: "Profile photo uploaded successfully",
  });
});

/**
 * Delete profile photo
 * DELETE /api/profile/photo
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export const deleteProfilePhoto = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get user role
  const userRole = await supabaseService.getUserRole(userId);

  // Admins cannot delete profiles
  if (userRole === "admin") {
    throw new AppError("Admins do not have profiles", 403);
  }

  // Delete from storage and update database
  await supabaseService.deleteProfilePhoto(userId);

  res.status(200).json({
    success: true,
    message: "Profile photo deleted successfully",
  });
});

/**
 * Update student-specific profile data
 * PUT /api/profile/student
 * Student-only endpoint
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export const updateStudentProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { roll_no, class_id, admission_year } = req.body;

  // Get user role
  const userRole = await supabaseService.getUserRole(userId);

  // Only students can update their student profile
  if (userRole !== "student") {
    throw new AppError("Only students can update student profiles", 403);
  }

  // Update student-specific data
  const updated = await supabaseService.updateStudentProfile(userId, {
    roll_no,
    class_id,
    admission_year,
  });

  res.status(200).json({
    success: true,
    data: updated,
    message: "Student profile updated successfully",
  });
});

/**
 * Update teacher-specific profile data
 * PUT /api/profile/teacher
 * Teacher-only endpoint
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export const updateTeacherProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { department, qualification, experience_years } = req.body;

  // Get user role
  const userRole = await supabaseService.getUserRole(userId);

  // Only teachers can update their teacher profile
  if (userRole !== "teacher") {
    throw new AppError("Only teachers can update teacher profiles", 403);
  }

  // Update teacher-specific data
  const updated = await supabaseService.updateTeacherProfile(userId, {
    department,
    qualification,
    experience_years,
  });

  res.status(200).json({
    success: true,
    data: updated,
    message: "Teacher profile updated successfully",
  });
});

export default {
  getMyProfile,
  upsertProfile,
  completeProfile,
  uploadProfilePhoto,
  deleteProfilePhoto,
  updateStudentProfile,
  updateTeacherProfile,
};
