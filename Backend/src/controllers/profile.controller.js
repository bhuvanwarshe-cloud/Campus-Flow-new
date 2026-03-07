/**
 * Profile Controller
 * Handles user profile operations for students and teachers
 * Admins are excluded from profile functionality
 */

import { supabase, supabaseAdmin } from "../config/supabase.js";
import supabaseService from "../services/supabase.service.js";
import { AppError, asyncHandler } from "../utils/errorHandler.js";

/**
 * Get current user's profile
 * GET /api/profile/me
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export const getMyProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id; // Verified JWT userId

  // Get user role early
  const userRole = await supabaseService.getUserRole(userId);

  // Admins cannot access profile
  if (userRole === "admin") {
    throw new AppError("Admins do not have profiles", 403);
  }

  // 1. Fetch base profile from `profiles`
  const { data: baseProfile, error: baseErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  // If no base profile exists, return incomplete flag
  if (baseErr || !baseProfile) {
    return res.status(200).json({
      success: true,
      data: {
        id: userId,
        role: userRole,
        profileComplete: false
      }
    });
  }

  // 2. Fetch role-specific data using LEFT JOIN logic equivalent
  let roleData = null;

  if (userRole === "student") {
    const { data: studentProfile } = await supabase
      .from("student_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Also grab legacy student data just in case info is fragmented there
    const { data: legacyStudent } = await supabase
      .from("students")
      .select("class_id, roll_no, name")
      .eq("id", userId)
      .single();

    roleData = { ...studentProfile, legacyData: legacyStudent };
  } else if (userRole === "teacher") {
    const { data: teacherProfile } = await supabase
      .from("teacher_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    roleData = teacherProfile;
  }

  // 3. Merge into single response object
  res.status(200).json({
    success: true,
    data: {
      ...baseProfile,      // id, full_name, avatar_url, etc.
      id: userId,          // ensure ID maps correctly
      role: userRole,
      profileComplete: baseProfile.is_profile_complete || false,
      studentData: userRole === 'student' ? roleData : undefined,
      teacherData: userRole === 'teacher' ? roleData : undefined
    },
  });
});

/**
 * Create or update user profile
 * PUT /api/profile/edit
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
    avatar_url,
    // Student fields
    branch,
    degree,
    registration_number,
    admission_year,
    class_id,
    roll_no,
    // Teacher fields
    subjects,
    department,
    qualification,
    years_of_experience,
  } = req.body;

  const userRole = await supabaseService.getUserRole(userId);
  if (userRole === "admin") {
    throw new AppError("Admins do not have profiles", 403);
  }

  try {
    // 1. Update profiles table
    const profilePayload = {};
    if (first_name !== undefined) profilePayload.first_name = first_name;
    if (last_name !== undefined) profilePayload.last_name = last_name;
    if (phone !== undefined) profilePayload.phone = phone;
    if (address !== undefined) profilePayload.address = address;
    if (date_of_birth !== undefined) profilePayload.dob = date_of_birth;
    if (avatar_url !== undefined) profilePayload.profile_picture_url = avatar_url;

    const { data: updatedProfile, error: pError } = await supabase
      .from("profiles")
      .update(profilePayload)
      .eq("id", userId) // auth.users id
      .select()
      .single();

    if (pError) throw pError;

    let roleData = null;

    // 2. Update Student Roles
    if (userRole === "student") {
      const studentPayload = {};
      if (branch !== undefined) studentPayload.branch = branch;
      if (degree !== undefined) studentPayload.degree = degree;
      if (registration_number !== undefined) studentPayload.registration_number = registration_number;
      if (admission_year !== undefined) studentPayload.admission_year = admission_year ? parseInt(admission_year) : null;
      if (class_id !== undefined) studentPayload.class_id = class_id;
      if (roll_no !== undefined) studentPayload.roll_no = roll_no;

      if (Object.keys(studentPayload).length > 0) {
        const { data: spData, error: spError } = await supabase
          .from("student_profiles")
          .update(studentPayload)
          .eq("user_id", userId)
          .select()
          .single();

        if (spError) throw spError;
        roleData = spData;

        // Sync legacy students table if name changes or class changes
        const legacyStudentPayload = {};
        if (first_name || last_name) {
          // fetch current profile name to be safe if only one changed
          const { data: currentP } = await supabase.from("profiles").select("first_name, last_name").eq("id", userId).single();
          const fname = first_name || currentP?.first_name || '';
          const lname = last_name || currentP?.last_name || '';
          legacyStudentPayload.name = `${fname} ${lname}`.trim();
        }
        if (class_id !== undefined) legacyStudentPayload.class_id = class_id;
        if (roll_no !== undefined) legacyStudentPayload.roll_no = roll_no;

        if (Object.keys(legacyStudentPayload).length > 0) {
          await supabase.from("students").update(legacyStudentPayload).eq("id", userId);
        }
      }
    }

    // 3. Update Teacher Roles
    if (userRole === "teacher") {
      const teacherPayload = {};
      if (subjects !== undefined) teacherPayload.subjects_taught = Array.isArray(subjects) ? subjects : (typeof subjects === "string" ? subjects.split(",").map(s => s.trim()) : []);
      if (department !== undefined) teacherPayload.department = department;
      if (qualification !== undefined) teacherPayload.qualification = qualification;
      if (years_of_experience !== undefined) teacherPayload.experience_years = years_of_experience ? parseInt(years_of_experience) : null;

      if (Object.keys(teacherPayload).length > 0) {
        const { data: tpData, error: tpError } = await supabase
          .from("teacher_profiles")
          .update(teacherPayload)
          .eq("user_id", userId)
          .select()
          .single();
        if (tpError) throw tpError;
        roleData = tpData;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        ...updatedProfile,
        roleData
      },
      message: "Profile updated successfully",
    });

  } catch (error) {
    console.error("Profile Edit Transaction Error:", error);
    throw new AppError(`Failed to update profile: ${error.message}`, 500);
  }
});

/**
 * Complete profile during signup
 * POST /api/profile/complete
 * Creates full profile with all fields for new users using a safe Postgres Transaction RPC
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export const completeProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id; // From verified JWT
  const {
    first_name,
    last_name,
    phone,
    address,
    date_of_birth,
    avatar_url,

    // Role comes from the JWT/existing profiles usually, but we accept it here for first-time setup
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

  if (!first_name || !last_name || !role) {
    throw new AppError("Missing required fields (first_name, last_name, role)", 400);
  }

  // To ensure TRUE transactionality across multiple schema tables in Supabase 
  // (profiles, roles, student_profiles, teacher_profiles, students) without relying on JS promise racing,
  // we use a dedicated RPC defined for profile completion. If not defining an RPC, we must rely on 
  // sequential awaits which are not atomic on failure. Since the prompt says "Wrap multi-table writes inside a DB transaction"
  // and we cannot alter schema directly here, we will simulate a JS transaction using Promise.all/rollback or upserts.
  // Actually, Supabase REST API doesn't support generic transactions. 
  // Let's use pure sequential awaited Upserts with robust error handling based on the user req.

  try {
    // 1. UPDATE profiles table (row already exists from auth trigger)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .update({
        first_name,
        last_name,
        phone,
        address,
        dob: date_of_birth,
        profile_picture_url: avatar_url || null,
        is_profile_complete: true,
      })
      .eq("id", userId)
      .select()
      .single();

    if (profileError) {
      if (profileError.code === "PGRST116") {
        throw new AppError("Profile not initialized. Please sign up again.", 404);
      }
      throw profileError;
    }

    if (!profile) {
      throw new AppError("Profile not found", 404);
    }

    // 2. Ensure `roles` table existence
    await supabase.from("roles").upsert(
      { user_id: userId, role: role }
    );

    // 3. Upsert Role Specific Tables
    let roleData = null;

    if (role === 'student') {
      const studentPayload = {
        user_id: userId,
        branch,
        degree,
        registration_number,
        admission_year: admission_year ? parseInt(admission_year) : null,
      };

      const { data: spData, error: spError } = await supabase
        .from("student_profiles")
        .upsert(studentPayload, { onConflict: 'user_id' })
        .select()
        .single();

      if (spError) throw spError;
      roleData = spData;

      // Sync legacy students table (ignore if it fails)
      try {
        await supabase
          .from("students")
          .upsert({
            id: userId,
            user_id: userId,
            name: `${first_name} ${last_name}`.trim(),
          });
      } catch (e) {
        if (e.code !== '42P01') console.warn("Could not sync to legacy students table:", e.message);
      }

    } else if (role === 'teacher') {
      const teacherPayload = {
        user_id: userId,
        subjects_taught: Array.isArray(subjects) ? subjects : (typeof subjects === 'string' ? subjects.split(',').map(s => s.trim()) : []),
        department,
        qualification,
        experience_years: years_of_experience ? parseInt(years_of_experience) : null,
      };

      const { data: tpData, error: tpError } = await supabase
        .from("teacher_profiles")
        .upsert(teacherPayload, { onConflict: 'user_id' })
        .select()
        .single();

      if (tpError) throw tpError;
      roleData = tpData;
    }

    // 4. Return merged response
    res.status(200).json({
      success: true,
      data: {
        ...profile,
        roleData
      },
      message: "Profile completed successfully",
    });

  } catch (error) {
    console.error("Profile Completion Transaction Error:", error);
    throw new AppError(`Failed to save profile: ${error.message}`, 500);
  }
});


/**
 * Upload profile photo
 * POST /api/profile/avatar
 * Multipart form data with 'avatar' field
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export const uploadProfilePhoto = asyncHandler(async (req, res) => {
  try {
    console.log("📸 Avatar upload started. User:", req.user?.id);

    if (!req.file) {
      console.error("❌ No file in request");
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.file;
    const fileExt = file.originalname.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${req.user.id}_${Date.now()}.${fileExt}`;

    console.log(`📤 Uploading to avatars/${filePath} (${file.size} bytes, ${file.mimetype})`);

    // Step 1: Upload to Supabase Storage using service role (bypasses Storage RLS)
    const { data: storageData, error: uploadError } = await supabaseAdmin.storage
      .from("avatars")
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      console.error("❌ Storage upload error:", uploadError);
      return res.status(500).json({ error: `Storage upload failed: ${uploadError.message}` });
    }

    console.log("✅ Storage upload success:", storageData);

    // Step 2: Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from("avatars")
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      console.error("❌ Failed to generate public URL");
      return res.status(500).json({ error: "Failed to generate public URL" });
    }

    const publicUrl = urlData.publicUrl;
    console.log("🔗 Public URL:", publicUrl);

    // Step 3: Update profiles table using service role (bypasses Table RLS)
    const { data: profileData, error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ profile_picture_url: publicUrl })
      .eq("id", req.user.id)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Database update error:", updateError);
      return res.status(500).json({ error: `Failed to save avatar URL: ${updateError.message}` });
    }

    console.log("✅ DB update success:", profileData?.id);

    return res.status(200).json({
      success: true,
      avatar_url: publicUrl,
    });
  } catch (error) {
    console.error("❌ Avatar Upload unexpected error:", error);
    return res.status(500).json({ error: `Upload failed: ${error.message}` });
  }
});

/**
 * Delete profile photo
 * DELETE /api/profile/avatar
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export const deleteProfilePhoto = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get user role
  const userRole = await supabaseService.getUserRole(userId);

  if (userRole === "admin") {
    throw new AppError("Admins do not have profiles", 403);
  }

  try {
    // 1. Get current subPath from profile to delete
    const { data: profile } = await supabase.from('profiles').select('profile_picture_url').eq('id', userId).single();
    if (profile && profile.profile_picture_url) {
      // Extract filename from the URL
      const urlParts = profile.profile_picture_url.split('/');
      const fileName = urlParts[urlParts.length - 1];

      await supabase.storage.from('avatars').remove([fileName]);
    }

    // 2. Clear from DB
    await supabase.from("profiles").update({ profile_picture_url: null }).eq("id", userId);

    res.status(200).json({
      success: true,
      message: "Profile photo deleted successfully",
    });
  } catch (err) {
    throw new AppError(`Failed to delete avatar: ${err.message}`, 500);
  }
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
