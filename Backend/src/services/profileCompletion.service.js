/**
 * Profile Completion Service
 * Handles profile data with mandatory completion checks
 */

import { supabase } from "../config/supabase.js";
import { AppError } from "../utils/errorHandler.js";

/**
 * Check if user profile is complete
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Profile completion status
 */
export const checkProfileCompletion = async (userId) => {
  try {
    console.log(`🔍 Checking profile completion for user: ${userId}`);
    
    // Step 1: Get user role
    const { data: role, error: roleError } = await supabase
      .from("roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    console.log(`   Role query - error: ${roleError?.message}, data:`, role);

    if (roleError || !role) {
      console.error(`❌ Role not found for user ${userId}:`, roleError?.message);
      throw new AppError("User role not found", 404);
    }

    if (role.role === "admin") {
      console.log(`   User is admin - no profile required`);
      return { isComplete: true, role: "admin", message: "Admins don't need profiles" };
    }

    // Step 2: Get profile based on role
    const tableName = role.role === "student" ? "student_profiles" : "teacher_profiles";
    console.log(`   Checking ${tableName} for user ${userId}`);

    const { data: profile, error: profileError } = await supabase
      .from(tableName)
      .select("is_profile_complete")
      .eq("user_id", userId)
      .single();

    console.log(`   Profile query - error: ${profileError?.message}, data:`, profile);

    if (profileError) {
      // Profile doesn't exist yet
      if (profileError.code === 'PGRST116') {
        console.log(`   Profile not found - user needs to complete profile`);
        return {
          isComplete: false,
          role: role.role,
          message: "Profile not found. Please complete your profile.",
        };
      }
      console.error(`❌ Profile query error:`, profileError);
      throw new AppError(profileError.message || "Failed to fetch profile", 500);
    }

    const result = {
      isComplete: profile?.is_profile_complete || false,
      role: role.role,
      message: profile?.is_profile_complete ? "Profile complete" : "Profile incomplete",
    };
    
    console.log(`✅ Profile check complete:`, result);
    return result;
  } catch (error) {
    console.error("❌ Error checking profile completion:", error.message || error);
    throw error;
  }
};

/**
 * Get student profile with completion status
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Student profile data
 */
export const getStudentProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("student_profiles")
      .select(
        `
        user_id,
        first_name,
        last_name,
        branch,
        degree,
        registration_number,
        address,
        date_of_birth,
        is_profile_complete,
        roll_no,
        class_id,
        admission_year,
        created_at,
        updated_at
      `
      )
      .eq("user_id", userId)
      .single();

    if (error) {
      throw new AppError("Student profile not found", 404);
    }

    return data;
  } catch (error) {
    console.error("❌ Error fetching student profile:", error);
    throw error;
  }
};

/**
 * Get teacher profile with completion status
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Teacher profile data
 */
export const getTeacherProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("teacher_profiles")
      .select(
        `
        user_id,
        first_name,
        last_name,
        subjects,
        department,
        qualification,
        experience_years,
        address,
        date_of_birth,
        is_profile_complete,
        created_at,
        updated_at
      `
      )
      .eq("user_id", userId)
      .single();

    if (error) {
      throw new AppError("Teacher profile not found", 404);
    }

    return data;
  } catch (error) {
    console.error("❌ Error fetching teacher profile:", error);
    throw error;
  }
};

/**
 * Create or update student profile
 * @param {string} userId - User ID
 * @param {Object} profileData - Profile data
 * @returns {Promise<Object>} Updated profile
 */
export const upsertStudentProfile = async (userId, profileData) => {
  try {
    // Check required fields
    const requiredFields = ["first_name", "last_name", "branch", "degree", "registration_number"];
    const missingFields = requiredFields.filter((field) => !profileData[field]);

    if (missingFields.length > 0) {
      throw new AppError(`Missing required fields: ${missingFields.join(", ")}`, 400);
    }

    // Prepare data with is_profile_complete flag
    const dataToInsert = {
      user_id: userId,
      first_name: profileData.first_name,
      last_name: profileData.last_name,
      branch: profileData.branch,
      degree: profileData.degree,
      registration_number: profileData.registration_number,
      address: profileData.address || null,
      date_of_birth: profileData.date_of_birth || null,
      roll_no: profileData.roll_no || null,
      class_id: profileData.class_id || null,
      admission_year: profileData.admission_year || null,
      is_profile_complete: true, // Mark as complete on submission
    };

    const { data, error } = await supabase
      .from("student_profiles")
      .upsert(dataToInsert, { onConflict: "user_id" })
      .select();

    if (error) {
      throw new AppError(`Failed to save student profile: ${error.message}`, 500);
    }

    return data[0];
  } catch (error) {
    console.error("❌ Error upserting student profile:", error);
    throw error;
  }
};

/**
 * Create or update teacher profile
 * @param {string} userId - User ID
 * @param {Object} profileData - Profile data
 * @returns {Promise<Object>} Updated profile
 */
export const upsertTeacherProfile = async (userId, profileData) => {
  try {
    // Check required fields
    const requiredFields = ["first_name", "last_name", "department", "qualification"];
    const missingFields = requiredFields.filter((field) => !profileData[field]);

    if (missingFields.length > 0) {
      throw new AppError(`Missing required fields: ${missingFields.join(", ")}`, 400);
    }

    // Prepare data with is_profile_complete flag
    const dataToInsert = {
      user_id: userId,
      first_name: profileData.first_name,
      last_name: profileData.last_name,
      subjects: profileData.subjects || [], // Array of subjects
      department: profileData.department,
      qualification: profileData.qualification,
      experience_years: profileData.experience_years || 0,
      address: profileData.address || null,
      date_of_birth: profileData.date_of_birth || null,
      is_profile_complete: true, // Mark as complete on submission
    };

    const { data, error } = await supabase
      .from("teacher_profiles")
      .upsert(dataToInsert, { onConflict: "user_id" })
      .select();

    if (error) {
      throw new AppError(`Failed to save teacher profile: ${error.message}`, 500);
    }

    return data[0];
  } catch (error) {
    console.error("❌ Error upserting teacher profile:", error);
    throw error;
  }
};

export default {
  checkProfileCompletion,
  getStudentProfile,
  getTeacherProfile,
  upsertStudentProfile,
  upsertTeacherProfile,
};
