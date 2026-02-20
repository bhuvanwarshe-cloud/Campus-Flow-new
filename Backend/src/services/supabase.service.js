/**
 * Supabase Service Layer
 * Centralized database operations with consistent error handling
 */

import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/errorHandler.js";

// Export supabase for use in controllers when needed
export { supabaseAdmin as supabase };

// CRITICAL: Define local alias for internal use
const supabase = supabaseAdmin;

/**
 * Get user role from database
 * @param {string} userId - User ID
 * @returns {Promise<string>} User role (admin, teacher, student)
 */
export const getUserRole = async (userId) => {
  const { data, error } = await supabaseAdmin
    .from("roles")
    .select("role")
    .eq("user_id", userId)
    .limit(1);

  if (error) {
    console.error("❌ Error fetching user role:", error);
    throw new AppError("Failed to fetch user role", 500);
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data[0].role;
};

/**
 * Create student record
 * @param {Object} studentData - Student data
 * @returns {Promise<Object>} Created student
 */
export const createStudent = async (studentData) => {
  const { data, error } = await supabase
    .from("students")
    .insert([studentData])
    .select();

  if (error) {
    console.error("❌ Error creating student:", error);
    throw new AppError("Failed to create student", 500);
  }

  return data[0];
};

/**
 * Get all students
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} List of students
 */
export const getStudents = async (filters = {}) => {
  let query = supabase.from("students").select("*");

  if (filters.createdBy) {
    query = query.eq("created_by", filters.createdBy);
  }

  const { data, error } = await query;

  if (error) {
    console.error("❌ Error fetching students:", error);
    throw new AppError("Failed to fetch students", 500);
  }

  return data;
};

/**
 * Get student by ID
 * @param {string} studentId - Student ID
 * @returns {Promise<Object>} Student data
 */
export const getStudentById = async (studentId) => {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", studentId)
    .single();

  if (error) {
    console.error("❌ Error fetching student:", error);
    throw new AppError("Student not found", 404);
  }

  return data;
};

/**
 * Update student
 * @param {string} studentId - Student ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated student
 */
export const updateStudent = async (studentId, updates) => {
  const { data, error } = await supabase
    .from("students")
    .update(updates)
    .eq("id", studentId)
    .select();

  if (error) {
    console.error("❌ Error updating student:", error);
    throw new AppError("Failed to update student", 500);
  }

  return data[0];
};

/**
 * Delete student
 * @param {string} studentId - Student ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteStudent = async (studentId) => {
  const { error } = await supabase
    .from("students")
    .delete()
    .eq("id", studentId);

  if (error) {
    console.error("❌ Error deleting student:", error);
    throw new AppError("Failed to delete student", 500);
  }

  return true;
};

/**
 * Create class
 * @param {Object} classData - Class data
 * @returns {Promise<Object>} Created class
 */
export const createClass = async (classData) => {
  const { data, error } = await supabase
    .from("classes")
    .insert([classData])
    .select();

  if (error) {
    console.error("❌ Error creating class:", error);
    throw new AppError("Failed to create class", 500);
  }

  return data[0];
};

/**
 * Get all classes
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} List of classes
 */
export const getClasses = async (filters = {}) => {
  let query = supabase.from("classes").select("*");

  if (filters.createdBy) {
    query = query.eq("created_by", filters.createdBy);
  }

  const { data, error } = await query;

  if (error) {
    console.error("❌ Error fetching classes:", error);
    throw new AppError("Failed to fetch classes", 500);
  }

  return data;
};

/**
 * Get class by ID
 * @param {string} classId - Class ID
 * @returns {Promise<Object>} Class data
 */
export const getClassById = async (classId) => {
  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .eq("id", classId)
    .single();

  if (error) {
    console.error("❌ Error fetching class:", error);
    throw new AppError("Class not found", 404);
  }

  return data;
};

/**
 * Delete class
 * @param {string} classId - Class ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteClass = async (classId) => {
  const { error } = await supabase
    .from("classes")
    .delete()
    .eq("id", classId);

  if (error) {
    console.error("❌ Error deleting class:", error);
    throw new AppError("Failed to delete class", 500);
  }

  return true;
};

/**
 * Create enrollment
 * @param {Object} enrollmentData - Enrollment data
 * @returns {Promise<Object>} Created enrollment
 */
export const createEnrollment = async (enrollmentData) => {
  const { data, error } = await supabase
    .from("enrollments")
    .insert([enrollmentData])
    .select();

  if (error) {
    // Check if it's a unique constraint violation (duplicate enrollment)
    if (error.code === "23505") {
      throw new AppError("Student already enrolled in this class", 409);
    }
    console.error("❌ Error creating enrollment:", error);
    throw new AppError("Failed to create enrollment", 500);
  }

  return data[0];
};

/**
 * Get enrollments by class
 * @param {string} classId - Class ID
 * @returns {Promise<Array>} List of enrollments
 */
export const getEnrollmentsByClass = async (classId) => {
  const { data, error } = await supabase
    .from("enrollments")
    .select(
      `
      *,
      student:students(*),
      class:classes(*)
    `
    )
    .eq("class_id", classId);

  if (error) {
    console.error("❌ Error fetching enrollments:", error);
    throw new AppError("Failed to fetch enrollments", 500);
  }

  return data;
};

/**
 * Get enrollments by student
 * @param {string} studentId - Student ID
 * @returns {Promise<Array>} List of enrollments
 */
export const getEnrollmentsByStudent = async (studentId) => {
  const { data, error } = await supabase
    .from("enrollments")
    .select(
      `
      *,
      class:classes(*)
    `
    )
    .eq("student_id", studentId);

  if (error) {
    console.error("❌ Error fetching enrollments:", error);
    throw new AppError("Failed to fetch enrollments", 500);
  }

  return data;
};

/**
 * Check if student is enrolled in a class
 * @param {string} studentId - Student ID
 * @param {string} classId - Class ID
 * @returns {Promise<boolean>} Enrollment status
 */
export const isEnrolled = async (studentId, classId) => {
  const { data, error } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", studentId)
    .eq("class_id", classId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("❌ Error checking enrollment:", error);
    throw new AppError("Failed to check enrollment", 500);
  }

  return !!data;
};

/**
 * Delete enrollment
 * @param {string} studentId - Student ID
 * @param {string} classId - Class ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteEnrollment = async (studentId, classId) => {
  const { error } = await supabase
    .from("enrollments")
    .delete()
    .eq("student_id", studentId)
    .eq("class_id", classId);

  if (error) {
    console.error("❌ Error deleting enrollment:", error);
    throw new AppError("Failed to delete enrollment", 500);
  }

  return true;
};

/**
 * Create subject
 * @param {Object} subjectData - Subject data
 * @returns {Promise<Object>} Created subject
 */
export const createSubject = async (subjectData) => {
  const { data, error } = await supabase
    .from("subjects")
    .insert([subjectData])
    .select();

  if (error) {
    console.error("❌ Error creating subject:", error);
    throw new AppError("Failed to create subject", 500);
  }

  return data[0];
};

/**
 * Get all subjects
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} List of subjects
 */
export const getSubjects = async (filters = {}) => {
  let query = supabase.from("subjects").select("*");

  if (filters.classId) {
    query = query.eq("class_id", filters.classId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("❌ Error fetching subjects:", error);
    throw new AppError("Failed to fetch subjects", 500);
  }

  return data;
};

/**
 * Get subject by ID
 * @param {string} subjectId - Subject ID
 * @returns {Promise<Object>} Subject data
 */
export const getSubjectById = async (subjectId) => {
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .eq("id", subjectId)
    .single();

  if (error) {
    console.error("❌ Error fetching subject:", error);
    throw new AppError("Subject not found", 404);
  }

  return data;
};

/**
 * Create exam
 * @param {Object} examData - Exam data
 * @returns {Promise<Object>} Created exam
 */
export const createExam = async (examData) => {
  const { data, error } = await supabase
    .from("exams")
    .insert([examData])
    .select();

  if (error) {
    console.error("❌ Error creating exam:", error);
    throw new AppError("Failed to create exam", 500);
  }

  return data[0];
};

/**
 * Get all exams
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} List of exams
 */
export const getExams = async (filters = {}) => {
  let query = supabase.from("exams").select("*");

  if (filters.classId) {
    query = query.eq("class_id", filters.classId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("❌ Error fetching exams:", error);
    throw new AppError("Failed to fetch exams", 500);
  }

  return data;
};

/**
 * Get exam by ID
 * @param {string} examId - Exam ID
 * @returns {Promise<Object>} Exam data
 */
export const getExamById = async (examId) => {
  const { data, error } = await supabase
    .from("exams")
    .select("*")
    .eq("id", examId)
    .single();

  if (error) {
    console.error("❌ Error fetching exam:", error);
    throw new AppError("Exam not found", 404);
  }

  return data;
};

/**
 * Create mark record
 * @param {Object} markData - Mark data
 * @returns {Promise<Object>} Created mark
 */
export const createMark = async (markData) => {
  const { data, error } = await supabase
    .from("marks")
    .insert([markData])
    .select();

  if (error) {
    // Check for unique constraint violation
    if (error.code === "23505") {
      throw new AppError("Mark already exists for this student-subject-exam combination", 409);
    }
    console.error("❌ Error creating mark:", error);
    throw new AppError("Failed to create mark", 500);
  }

  return data[0];
};

/**
 * Get mark by ID
 * @param {string} markId - Mark ID
 * @returns {Promise<Object>} Mark data
 */
export const getMarkById = async (markId) => {
  const { data, error } = await supabase
    .from("marks")
    .select(
      `
      *,
      student:students(*),
      subject:subjects(*),
      exam:exams(*)
    `
    )
    .eq("id", markId)
    .single();

  if (error) {
    console.error("❌ Error fetching mark:", error);
    throw new AppError("Mark not found", 404);
  }

  return data;
};

/**
 * Update mark
 * @param {string} markId - Mark ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated mark
 */
export const updateMark = async (markId, updates) => {
  const { data, error } = await supabase
    .from("marks")
    .update(updates)
    .eq("id", markId)
    .select(
      `
      *,
      student:students(*),
      subject:subjects(*),
      exam:exams(*)
    `
    );

  if (error) {
    console.error("❌ Error updating mark:", error);
    throw new AppError("Failed to update mark", 500);
  }

  return data[0];
};

/**
 * Get marks for a student (student view)
 * @param {string} studentId - Student ID
 * @returns {Promise<Array>} List of student's marks
 */
export const getMarksByStudent = async (studentId) => {
  const { data, error } = await supabase
    .from("marks")
    .select(
      `
      id,
      marks_obtained,
      subject:subjects(id, name),
      exam:exams(id, name, max_marks),
      uploaded_by,
      created_at,
      updated_at
    `
    )
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Error fetching student marks:", error);
    throw new AppError("Failed to fetch marks", 500);
  }

  return data;
};

/**
 * Get marks for a class
 * @param {string} classId - Class ID
 * @returns {Promise<Array>} List of class marks
 */
export const getMarksByClass = async (classId) => {
  const { data, error } = await supabase
    .from("marks")
    .select(
      `
      id,
      student_id,
      marks_obtained,
      student:students(id, name, email),
      subject:subjects(id, name),
      exam:exams(id, name, max_marks),
      created_at,
      updated_at
    `
    )
    .eq("exam:exams.class_id", classId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Error fetching class marks:", error);
    throw new AppError("Failed to fetch class marks", 500);
  }

  return data;
};

/**
 * Get marks by exam
 * @param {string} examId - Exam ID
 * @returns {Promise<Array>} List of exam marks
 */
export const getMarksByExam = async (examId) => {
  const { data, error } = await supabase
    .from("marks")
    .select(
      `
      id,
      student_id,
      marks_obtained,
      student:students(id, name, email),
      subject:subjects(id, name),
      created_at,
      updated_at
    `
    )
    .eq("exam_id", examId)
    .order("student_id", { ascending: true });

  if (error) {
    console.error("❌ Error fetching exam marks:", error);
    throw new AppError("Failed to fetch exam marks", 500);
  }

  return data;
};

/**
 * Check if teacher is assigned to class
 * @param {string} teacherId - Teacher ID
 * @param {string} classId - Class ID
 * @returns {Promise<boolean>} True if assigned
 */
export const isTeacherInClass = async (teacherId, classId) => {
  const { data, error } = await supabase
    .from("teacher_classes")
    .select("teacher_id")
    .eq("teacher_id", teacherId)
    .eq("class_id", classId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("❌ Error checking teacher assignment:", error);
    throw new AppError("Failed to check teacher assignment", 500);
  }

  return !!data;
};

/**
 * Get classes for a teacher
 * @param {string} teacherId - Teacher ID
 * @returns {Promise<Array>} List of teacher's classes
 */
export const getTeacherClasses = async (teacherId) => {
  // 1. Get class IDs assigned to teacher
  const { data: assignments, error: assignmentError } = await supabase
    .from("teacher_classes")
    .select("class_id")
    .eq("teacher_id", teacherId);

  if (assignmentError) {
    console.error("❌ Error fetching teacher assignments:", assignmentError);
    throw new AppError("Failed to fetch teacher assignments", 500);
  }

  const classIds = assignments.map(a => a.class_id);

  if (classIds.length === 0) {
    return [];
  }

  // 2. Get class details based on IDs
  const { data: classes, error: classesError } = await supabase
    .from("classes")
    .select("id, name") // Fetch necessary fields
    .in("id", classIds);

  if (classesError) {
    console.error("❌ Error fetching classes details:", classesError);
    throw new AppError("Failed to fetch class details", 500);
  }

  return classes;
};

/**
 * Assign teacher to class
 * @param {string} teacherId - Teacher ID
 * @param {string} classId - Class ID
 * @returns {Promise<Object>} Assignment data
 */
export const assignTeacherToClass = async (teacherId, classId) => {
  const { data, error } = await supabase
    .from("teacher_classes")
    .insert([{ teacher_id: teacherId, class_id: classId }])
    .select();

  if (error) {
    if (error.code === "23505") {
      throw new AppError("Teacher already assigned to this class", 409);
    }
    console.error("❌ Error assigning teacher:", error);
    throw new AppError("Failed to assign teacher", 500);
  }

  return data[0];
};

/**
 * Remove teacher from class
 * @param {string} teacherId - Teacher ID
 * @param {string} classId - Class ID
 * @returns {Promise<boolean>} Success status
 */
export const removeTeacherFromClass = async (teacherId, classId) => {
  const { error } = await supabase
    .from("teacher_classes")
    .delete()
    .eq("teacher_id", teacherId)
    .eq("class_id", classId);

  if (error) {
    console.error("❌ Error removing teacher:", error);
    throw new AppError("Failed to remove teacher", 500);
  }

  return true;
};

/**
 * USER PROFILE FUNCTIONS
 * (Student & Teacher only - Admin excluded)
 */

/**
 * Create or get user profile
 * @param {string} userId - User ID
 * @param {string} role - User role ('student' or 'teacher')
 * @returns {Promise<Object>} Profile data
 */
export const getOrCreateProfile = async (userId, role) => {
  if (!['student', 'teacher'].includes(role)) {
    throw new AppError("Admins do not have profiles", 403);
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found, which is expected
    console.error("❌ Error fetching profile:", error);
    throw new AppError("Failed to fetch profile", 500);
  }

  if (data) {
    return data;
  }

  // Profile doesn't exist, create one
  const { data: newProfile, error: createError } = await supabase
    .from("profiles")
    .insert([
      {
        user_id: userId,
        role: role,
        full_name: "",
      },
    ])
    .select()
    .single();

  if (createError) {
    console.error("❌ Error creating profile:", createError);
    throw new AppError("Failed to create profile", 500);
  }

  return newProfile;
};

/**
 * Update/Complete student profile
 * Updates both 'profiles' and 'student_profiles' tables
 * @param {string} userId
 * @param {Object} mainProfileData
 * @param {Object} studentProfileData
 */
export const completeStudentProfile = async (userId, mainProfileData, studentProfileData) => {
  // Update student profile with all data including first_name and last_name
  const studentData = {
    first_name: mainProfileData.first_name,
    last_name: mainProfileData.last_name,
    ...studentProfileData
  };

  const { error: studentError } = await supabaseAdmin
    .from("student_profiles")
    .upsert({ user_id: userId, ...studentData })
    .select();

  if (studentError) {
    console.error("❌ Error updating student profile:", studentError);
    throw new AppError("Failed to update student details", 500);
  }

  return { success: true };
};

/**
 * Update/Complete teacher profile
 * Updates both 'profiles' and 'teacher_profiles' tables
 * @param {string} userId
 * @param {Object} mainProfileData
 * @param {Object} teacherProfileData
 */
export const completeTeacherProfile = async (userId, mainProfileData, teacherProfileData) => {
  // Update teacher profile with all data including first_name and last_name
  const teacherData = {
    first_name: mainProfileData.first_name,
    last_name: mainProfileData.last_name,
    ...teacherProfileData
  };

  const { error: teacherError } = await supabaseAdmin
    .from("teacher_profiles")
    .upsert({ user_id: userId, ...teacherData })
    .select();

  if (teacherError) {
    console.error("❌ Error updating teacher profile:", teacherError);
    throw new AppError("Failed to update teacher details", 500);
  }

  return { success: true };
};

/**
 * Get all students with profile information
 * Admin only
 */
export const getAllStudents = async () => {
  const { data, error } = await supabaseAdmin
    .from("student_profiles")
    .select(`
      user_id,
      first_name,
      last_name,
      phone,
      address,
      branch,
      degree,
      registration_number,
      profile_photo_url,
      created_at,
      updated_at
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Error fetching students:", error);
    throw new AppError("Failed to fetch students", 500);
  }

  // Fetch emails from auth.users
  const studentsWithEmails = await Promise.all(
    (data || []).map(async (student) => {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(student.user_id);

      return {
        ...student,
        email: userData?.user?.email || "N/A",
        role: "student",
        profile_complete: !!(student.first_name && student.last_name && student.branch && student.degree)
      };
    })
  );

  return studentsWithEmails;
};

/**
 * Get all teachers with profile information
 * Admin only
 */
export const getAllTeachers = async () => {
  const { data, error } = await supabaseAdmin
    .from("teacher_profiles")
    .select(`
      user_id,
      first_name,
      last_name,
      phone,
      address,
      department,
      qualification,
      experience_years,
      subjects_taught,
      profile_photo_url,
      created_at,
      updated_at
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Error fetching teachers:", error);
    throw new AppError("Failed to fetch teachers", 500);
  }

  // Fetch emails from auth.users
  const teachersWithEmails = await Promise.all(
    (data || []).map(async (teacher) => {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(teacher.user_id);

      return {
        ...teacher,
        email: userData?.user?.email || "N/A",
        role: "teacher",
        profile_complete: !!(teacher.first_name && teacher.last_name && teacher.department && teacher.qualification)
      };
    })
  );

  return teachersWithEmails;
};

/**
 * Get user profile with role-specific data
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Complete profile data
 */
export const getUserProfile = async (userId) => {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("❌ Error fetching profile:", error);
    throw new AppError("Profile not found", 404);
  }

  if (!profile) {
    throw new AppError("Profile not found", 404);
  }

  // Fetch role-specific data
  let roleSpecificData = {};
  if (profile.role === "student") {
    const { data: studentData, error: studentError } = await supabase
      .from("student_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!studentError) {
      roleSpecificData = studentData;
    }
  } else if (profile.role === "teacher") {
    const { data: teacherData, error: teacherError } = await supabase
      .from("teacher_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!teacherError) {
      roleSpecificData = teacherData;
    }
  }

  return {
    ...profile,
    roleSpecificData,
  };
};

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} updates - Profile updates
 * @returns {Promise<Object>} Updated profile
 */
export const updateUserProfile = async (userId, updates) => {
  const { role } = updates;

  if (role && !['student', 'teacher'].includes(role)) {
    throw new AppError("Invalid role", 400);
  }

  const { full_name, phone, role: updateRole } = updates;

  const profileUpdates = {
    ...(full_name && { full_name }),
    ...(phone && { phone }),
    ...(updateRole && { role: updateRole }),
  };

  const { data, error } = await supabase
    .from("profiles")
    .update(profileUpdates)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("❌ Error updating profile:", error);
    throw new AppError("Failed to update profile", 500);
  }

  return data;
};

/**
 * Update profile photo URL
 * @param {string} userId - User ID
 * @param {string} photoUrl - Photo URL from storage
 * @returns {Promise<Object>} Updated profile
 */
export const updateProfilePhoto = async (userId, photoUrl) => {
  const { data, error } = await supabase
    .from("profiles")
    .update({ profile_photo_url: photoUrl })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("❌ Error updating profile photo:", error);
    throw new AppError("Failed to update profile photo", 500);
  }

  return data;
};

/**
 * Update student-specific profile data
 * @param {string} userId - User ID
 * @param {Object} studentData - Student-specific data
 * @returns {Promise<Object>} Updated student profile
 */
export const updateStudentProfile = async (userId, studentData) => {
  const { roll_no, class_id, admission_year } = studentData;

  // First check if student profile exists
  const { data: existing } = await supabase
    .from("student_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from("student_profiles")
      .update({
        ...(roll_no && { roll_no }),
        ...(class_id && { class_id }),
        ...(admission_year && { admission_year }),
      })
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("❌ Error updating student profile:", error);
      throw new AppError("Failed to update student profile", 500);
    }

    return data;
  }

  // Create new
  const { data, error } = await supabase
    .from("student_profiles")
    .insert([
      {
        user_id: userId,
        roll_no,
        class_id,
        admission_year,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("❌ Error creating student profile:", error);
    throw new AppError("Failed to create student profile", 500);
  }

  return data;
};

/**
 * Update teacher-specific profile data
 * @param {string} userId - User ID
 * @param {Object} teacherData - Teacher-specific data
 * @returns {Promise<Object>} Updated teacher profile
 */
export const updateTeacherProfile = async (userId, teacherData) => {
  const { department, qualification, experience_years } = teacherData;

  // First check if teacher profile exists
  const { data: existing } = await supabase
    .from("teacher_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from("teacher_profiles")
      .update({
        ...(department && { department }),
        ...(qualification && { qualification }),
        ...(experience_years !== undefined && { experience_years }),
      })
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("❌ Error updating teacher profile:", error);
      throw new AppError("Failed to update teacher profile", 500);
    }

    return data;
  }

  // Create new
  const { data, error } = await supabase
    .from("teacher_profiles")
    .insert([
      {
        user_id: userId,
        department,
        qualification,
        experience_years,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("❌ Error creating teacher profile:", error);
    throw new AppError("Failed to create teacher profile", 500);
  }

  return data;
};

/**
 * Upload profile photo to Supabase Storage
 * @param {string} userId - User ID
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} mimetype - File MIME type
 * @returns {Promise<string>} Public URL of uploaded file
 */
export const uploadProfilePhoto = async (userId, fileBuffer, mimetype) => {
  const fileName = `${userId}.jpg`;
  const filePath = `profile-photos/${fileName}`;

  // Delete old photo if exists
  try {
    await supabase.storage.from("profile-photos").remove([filePath]);
  } catch (err) {
    // Ignore if file doesn't exist
  }

  // Upload new photo
  const { data, error } = await supabase.storage
    .from("profile-photos")
    .upload(filePath, fileBuffer, {
      contentType: mimetype,
      upsert: true,
    });

  if (error) {
    console.error("❌ Error uploading profile photo:", error);
    throw new AppError("Failed to upload profile photo", 500);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("profile-photos")
    .getPublicUrl(filePath);

  if (!urlData || !urlData.publicUrl) {
    throw new AppError("Failed to get photo URL", 500);
  }

  return urlData.publicUrl;
};

/**
 * Delete profile photo
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteProfilePhoto = async (userId) => {
  const fileName = `${userId}.jpg`;
  const filePath = `profile-photos/${fileName}`;

  const { error } = await supabase.storage
    .from("profile-photos")
    .remove([filePath]);

  if (error) {
    console.error("❌ Error deleting profile photo:", error);
    throw new AppError("Failed to delete profile photo", 500);
  }

  // Clear photo URL from database
  await updateProfilePhoto(userId, null);

  return true;
};

/**
 * Create attendance record
 * @param {Object} attendanceData - Attendance data (can be single object or array)
 * @returns {Promise<Object>} Created attendance
 */
export const createAttendance = async (attendanceData) => {
  const records = Array.isArray(attendanceData) ? attendanceData : [attendanceData];

  const { data, error } = await supabase
    .from("attendance")
    .upsert(records, {
      onConflict: "class_id,student_id,date",  // match the UNIQUE constraint
      ignoreDuplicates: false,                  // update status on re-submission
    })
    .select();

  if (error) {
    console.error("❌ createAttendance error:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new AppError(`Failed to record attendance: ${error.message}`, 500);
  }

  return data;
};

/**
 * Get attendance for a class on a date
 * @param {string} classId - Class ID
 * @param {string} date - Date (YYYY-MM-DD)
 * @returns {Promise<Array>} Attendance records
 */
export const getAttendanceByClassDate = async (classId, date) => {
  let query = supabase
    .from("attendance")
    .select(`
      *,
      student:students(id, name, roll_no)
    `)
    .eq("class_id", classId);

  if (date) {
    query = query.eq("date", date);
  }

  const { data, error } = await query;

  if (error) {
    console.error("❌ Error fetching attendance:", error);
    throw new AppError("Failed to fetch attendance", 500);
  }

  return data;
};

/**
 * Create notification
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Object>} Created notification
 */
export const createNotification = async (notificationData) => {
  const { data, error } = await supabase
    .from("notifications")
    .insert([notificationData])
    .select();

  if (error) {
    console.error("❌ Error creating notification:", error);
    throw new AppError("Failed to create notification", 500);
  }

  return data[0];
};

/**
 * Get notifications for a class or teacher
 * @param {Object} filters - Filters (classId, teacherId)
 * @returns {Promise<Array>} List of notifications
 */
export const getNotifications = async (filters = {}) => {
  let query = supabase.from("notifications").select("*").order("created_at", { ascending: false });

  if (filters.classId) {
    query = query.eq("class_id", filters.classId);
  }
  if (filters.teacherId) {
    query = query.eq("teacher_id", filters.teacherId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("❌ Error fetching notifications:", error);
    throw new AppError("Failed to fetch notifications", 500);
  }

  return data;
};



// ============================================
// ANNOUNCEMENTS
// ============================================

export const createAnnouncement = async (announcementData) => {
  const { data, error } = await supabase
    .from("announcements")
    .insert([announcementData])
    .select()
    .single();
  if (error) {
    console.error(" Error creating announcement:", error);
    throw new AppError(`Failed to create announcement: ${error.message}`, 500);
  }
  return data;
};

export const getAnnouncementsByClass = async (classId) => {
  const { data, error } = await supabase
    .from("announcements")
    .select("id, title, body, created_at, created_by")
    .eq("class_id", classId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) {
    if (error.code === "42P01") return [];
    throw new AppError(`Failed to fetch announcements: ${error.message}`, 500);
  }
  return data || [];
};

export const getStudentAnnouncements = async (studentId) => {
  const { data: enrollments, error: enrollError } = await supabase
    .from("enrollments")
    .select("class_id")
    .eq("student_id", studentId);
  if (enrollError) {
    if (enrollError.code === "42P01") return [];
    throw new AppError(`Failed to fetch enrollments: ${enrollError.message}`, 500);
  }
  if (!enrollments || enrollments.length === 0) return [];
  const classIds = enrollments.map((e) => e.class_id);
  const { data, error } = await supabase
    .from("announcements")
    .select("id, title, body, created_at, class_id, classes(name)")
    .in("class_id", classIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    if (error.code === "42P01") return [];
    throw new AppError(`Failed to fetch announcements: ${error.message}`, 500);
  }
  return data || [];
};

// ============================================
// PERFORMANCE REPORTS
// ============================================

export const createPerformanceReport = async (reportData) => {
  const { data, error } = await supabase
    .from("performance_reports")
    .upsert([reportData], { onConflict: "student_id,class_id,period" })
    .select()
    .single();
  if (error) {
    console.error("❌ Error creating performance report:", error);
    throw new AppError(`Failed to create performance report: ${error.message}`, 500);
  }
  return data;
};

export const getPerformanceByStudent = async (studentId) => {
  const { data, error } = await supabase
    .from("performance_reports")
    .select("id, period, avg_marks, attendance_pct, total_exams, total_present, total_absent, remarks, created_at, class:classes(name)")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) {
    if (error.code === "42P01") return [];
    throw new AppError(`Failed to fetch performance reports: ${error.message}`, 500);
  }
  return data || [];
};

// ============================================
// TEACHER-STUDENT QUERIES
// ============================================

export const getStudentsByTeacher = async (
  teacherId,
  page = 1,
  limit = 20,
  search = "",
  classId = null,
  sortBy = "name",
  sortOrder = "asc"
) => {
  // ── Step 1: Get class IDs for this teacher ───────────────────────────────
  let assignQuery = supabase
    .from("teacher_classes")
    .select("class_id")
    .eq("teacher_id", teacherId);
  if (classId) assignQuery = assignQuery.eq("class_id", classId);

  const { data: assignments, error: assignError } = await assignQuery;
  if (assignError) {
    if (assignError.code === "42P01") return { data: [], count: 0 };
    console.error("❌ teacher_classes fetch error:", assignError.message);
    throw new AppError(`Failed to fetch teacher classes: ${assignError.message}`, 500);
  }

  console.log(`[getStudentsByTeacher] teacherId=${teacherId} → ${assignments?.length ?? 0} class assignments`);

  let classIds;
  if (!assignments || assignments.length === 0) {
    // Fallback: teacher may not be in teacher_classes — check classes.created_by
    let createdQuery = supabase.from("classes").select("id").eq("created_by", teacherId);
    if (classId) createdQuery = createdQuery.eq("id", classId);
    const { data: createdClasses } = await createdQuery;
    console.log(`[getStudentsByTeacher] fallback created_by → ${createdClasses?.length ?? 0} classes`);
    if (!createdClasses || createdClasses.length === 0) return { data: [], count: 0 };
    classIds = createdClasses.map((c) => c.id);
  } else {
    classIds = assignments.map((a) => a.class_id);
  }

  // ── Step 2: Fetch class names separately (safe — no join alias) ──────────
  const { data: classRows } = await supabase
    .from("classes")
    .select("id, name")
    .in("id", classIds);
  const classNameMap = {};
  (classRows || []).forEach((c) => { classNameMap[c.id] = c.name; });

  // ── Step 3: Get enrollments for those classes ────────────────────────────
  const { data: enrollments, error: enrollError } = await supabase
    .from("enrollments")
    .select("student_id, class_id")
    .in("class_id", classIds);
  if (enrollError) {
    if (enrollError.code === "42P01") return { data: [], count: 0 };
    throw new AppError(`Failed to fetch enrollments: ${enrollError.message}`, 500);
  }

  console.log(`[getStudentsByTeacher] ${enrollments?.length ?? 0} enrollments found`);
  if (!enrollments || enrollments.length === 0) return { data: [], count: 0 };

  const studentIds = [...new Set(enrollments.map((e) => e.student_id))];
  // Map: studentId → first class they're enrolled in
  const studentClassMap = {};
  enrollments.forEach((e) => {
    if (!studentClassMap[e.student_id]) studentClassMap[e.student_id] = e.class_id;
  });

  // ── Step 4: Fetch paginated students ────────────────────────────────────
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const allowedSort = ["name", "email", "created_at"];
  const safeSort = allowedSort.includes(sortBy) ? sortBy : "name";
  const ascending = sortOrder !== "desc";

  let query = supabase
    .from("students")
    .select("id, name, email, roll_no, created_at", { count: "exact" })
    .in("id", studentIds)
    .order(safeSort, { ascending })
    .range(from, to);

  // Search by name or email only (roll_no may be smallint — skip ilike on it)
  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data: students, error: studentError, count } = await query;
  if (studentError) {
    throw new AppError(`Failed to fetch students: ${studentError.message}`, 500);
  }

  console.log(`[getStudentsByTeacher] ${students?.length ?? 0} students returned (total: ${count})`);
  if (!students || students.length === 0) return { data: [], count: 0 };

  // ── Step 5: Enrich with attendance % and avg marks ───────────────────────
  const enrichedStudents = await Promise.all(
    students.map(async (s) => {
      const sClassId = studentClassMap[s.id];

      let attendancePct = null;
      try {
        const { data: attRows } = await supabase
          .from("attendance")
          .select("status")
          .eq("student_id", s.id)
          .eq("class_id", sClassId);
        if (attRows && attRows.length > 0) {
          const presentCount = attRows.filter(
            (r) => r.status === "present" || r.status === "late"
          ).length;
          attendancePct = Math.round((presentCount / attRows.length) * 100);
        }
      } catch (_) { /* non-fatal */ }

      let avgMarks = null;
      try {
        const { data: markRows } = await supabase
          .from("marks")
          .select("marks_obtained")
          .eq("student_id", s.id);
        if (markRows && markRows.length > 0) {
          const total = markRows.reduce((sum, m) => sum + (m.marks_obtained || 0), 0);
          avgMarks = Math.round((total / markRows.length) * 10) / 10;
        }
      } catch (_) { /* non-fatal */ }

      return {
        id: s.id,
        name: s.name,
        email: s.email,
        roll_no: s.roll_no != null ? String(s.roll_no) : "—",
        class: classNameMap[sClassId] || "Unknown",
        class_id: sClassId,
        attendance_pct: attendancePct,
        avg_marks: avgMarks,
      };
    })
  );

  return { data: enrichedStudents, count: count || 0 };
};

// ============================================
// STUDENT ATTENDANCE

// ============================================

export const getStudentAttendance = async (studentId) => {
  const { data, error } = await supabase
    .from("attendance")
    .select("id, date, status, class_id")
    .eq("student_id", studentId)
    .order("date", { ascending: false })
    .limit(100);
  if (error) {
    if (error.code === "42P01") return [];
    console.error("❌ getStudentAttendance error:", error);
    throw new AppError(`Failed to fetch attendance: ${error.message}`, 500);
  }
  return data || [];
};

// ============================================
// SUBJECTS & EXAMS (class-filtered variants)
// ============================================

export const getSubjectsByClass = async (classId) => {
  const { data, error } = await supabase
    .from("subjects")
    .select("id, name, created_at")
    .eq("class_id", classId)
    .order("name");
  if (error) {
    if (error.code === "42P01") return [];
    throw new AppError(`Failed to fetch subjects: ${error.message}`, 500);
  }
  return data || [];
};

export const getExamsByClass = async (classId) => {
  const { data, error } = await supabase
    .from("exams")
    .select("id, name, max_marks, created_at")
    .eq("class_id", classId)
    .order("created_at", { ascending: false });
  if (error) {
    if (error.code === "42P01") return [];
    throw new AppError(`Failed to fetch exams: ${error.message}`, 500);
  }
  return data || [];
};

// ============================================
// MARKS UPLOAD (bulk)
// ============================================

export const uploadMarks = async (marksArray) => {
  const { data, error } = await supabase
    .from("marks")
    .upsert(marksArray, { onConflict: "student_id,exam_id,subject_id" })
    .select();
  if (error) {
    console.error(" Error uploading marks:", error);
    throw new AppError(`Failed to upload marks: ${error.message}`, 500);
  }
  return data || [];
};


export default {
  getUserRole,
  getUserProfile,
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  createClass,
  getClasses,
  getClassById,
  deleteClass,
  createEnrollment,
  getEnrollmentsByClass,
  getEnrollmentsByStudent,
  isEnrolled,
  deleteEnrollment,
  createSubject,
  getSubjects,
  getSubjectById,
  createExam,
  getExams,
  getExamById,
  createMark,
  getMarkById,
  updateMark,
  getMarksByStudent,
  getMarksByClass,
  getMarksByExam,
  isTeacherInClass,
  getTeacherClasses,
  assignTeacherToClass,
  removeTeacherFromClass,
  // Profile functions
  getOrCreateProfile,
  getUserProfile: getUserProfile,
  updateUserProfile,
  updateProfilePhoto,
  updateStudentProfile,
  updateTeacherProfile,
  uploadProfilePhoto,
  deleteProfilePhoto,
  // Attendance & Notifications
  createAttendance,
  getAttendanceByClassDate,
  createNotification,
  getNotifications,
  getAllStudents,
  getAllTeachers,
  // New: Announcements
  createAnnouncement,
  getAnnouncementsByClass,
  getStudentAnnouncements,
  // New: Performance Reports
  createPerformanceReport,
  getPerformanceByStudent,
  // New: Teacher-Student Queries
  getStudentsByTeacher,
  // New: Student Attendance
  getStudentAttendance,
  // New: Subjects & Exams (class-filtered)
  getSubjectsByClass,
  getExamsByClass,
  // New: Marks upload
  uploadMarks,
};
