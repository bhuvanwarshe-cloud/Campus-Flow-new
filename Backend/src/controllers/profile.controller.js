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
    branch,
    degree,
    registration_number,
    admission_year,
    subjects,
    department,
    qualification,
    years_of_experience,
  } = req.body;

  const userRole = await supabaseService.getUserRole(userId);
  if (userRole === "admin") {
    throw new AppError("Admins do not have profiles", 403);
  }

  // Helper to robustly upsert across fragmented schemas:
  const robustUpsert = async (table, payload) => {
    // 1. Try Update using user_id
    const { data: u1, error: e1 } = await supabase.from(table).update(payload).eq("user_id", userId).select();
    if (u1 && u1.length > 0) return u1[0];

    // 2. Try Update using id (fallback for profiles table)
    const { data: u2, error: e2 } = await supabase.from(table).update(payload).eq("id", userId).select();
    if (u2 && u2.length > 0) return u2[0];

    // 3. Fallback to Insert: Supply BOTH id and user_id to satisfy whichever PK constraint won in schema
    const insertPayload = { ...payload, user_id: userId, id: userId };
    const { data: i1, error: ie1 } = await supabase.from(table).insert(insertPayload).select();
    if (ie1) {
      if (ie1.code === "23505") { // duplicate key but we missed it?
        console.error(`Duplicate key during insert on ${table} even after update attempts. Weird schema state.`);
      } else if (ie1.code === "42703" && ie1.message.includes("column \"id\" of relation")) {
        // Table doesn't have an "id" column, only user_id (e.g. teacher_profiles). Retry without "id"
        delete insertPayload.id;
        const { data: i2, error: ie2 } = await supabase.from(table).insert(insertPayload).select();
        if (ie2) throw ie2;
        return i2 ? i2[0] : null;
      } else {
        throw ie1;
      }
    }
    return i1 ? i1[0] : null;
  };

  // --- Base profile
  const profilePayload = { is_profile_complete: true };
  if (first_name !== undefined) profilePayload.first_name = first_name;
  if (last_name !== undefined) profilePayload.last_name = last_name;
  if (phone !== undefined) profilePayload.phone = phone;
  if (address !== undefined) profilePayload.address = address;
  if (date_of_birth !== undefined) profilePayload.dob = date_of_birth;
  if (profile_photo !== undefined) profilePayload.profile_picture_url = profile_photo;

  let updatedProfile;
  try {
    updatedProfile = await robustUpsert("profiles", profilePayload);
  } catch (err) {
    throw new AppError(`Failed to save base profile: ${err.message}`, 500);
  }

  // --- Student-specific
  if (userRole === "student") {
    const studentPayload = {};
    if (branch !== undefined) studentPayload.branch = branch;
    if (degree !== undefined) studentPayload.degree = degree;
    if (registration_number !== undefined) studentPayload.registration_number = registration_number;
    if (admission_year !== undefined) studentPayload.admission_year = admission_year ? parseInt(admission_year) : null;

    if (Object.keys(studentPayload).length > 0) {
      try { await robustUpsert("student_profiles", studentPayload); } catch (e) {
        console.error("Student profile sync error:", e.message);
      }
    }
  }

  // --- Teacher-specific
  if (userRole === "teacher") {
    const teacherPayload = {};
    if (subjects !== undefined) teacherPayload.subjects_taught = Array.isArray(subjects) ? subjects : (typeof subjects === "string" ? subjects.split(",").map(s => s.trim()) : []);
    if (department !== undefined) teacherPayload.department = department;
    if (qualification !== undefined) teacherPayload.qualification = qualification;
    if (years_of_experience !== undefined) teacherPayload.experience_years = years_of_experience ? parseInt(years_of_experience) : null;

    if (Object.keys(teacherPayload).length > 0) {
      try { await robustUpsert("teacher_profiles", teacherPayload); } catch (e) {
        console.error("Teacher profile sync error:", e.message);
      }
    }
  }

  res.status(200).json({
    success: true,
    data: updatedProfile,
    message: "Profile saved successfully",
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
      first_name,
      last_name,
      phone,
      address,
      dob: date_of_birth,
      profile_picture_url: profile_photo,
      is_profile_complete: true,
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
        subjects_taught: Array.isArray(subjects) ? subjects : (typeof subjects === 'string' ? subjects.split(',').map(s => s.trim()) : []),
        department,
        qualification,
        experience_years: years_of_experience
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
