-- ============================================================================
-- RLS POLICIES FOR PROFILE TABLES
-- ============================================================================
-- This script re-enables RLS with proper security policies
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STUDENT PROFILES TABLE
-- ============================================================================

-- Enable RLS on student_profiles
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own student profile
CREATE POLICY "Students can view own profile"
  ON student_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Users can insert their own student profile
CREATE POLICY "Students can insert own profile"
  ON student_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own student profile
CREATE POLICY "Students can update own profile"
  ON student_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can delete their own student profile (optional)
CREATE POLICY "Students can delete own profile"
  ON student_profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- TEACHER PROFILES TABLE
-- ============================================================================

-- Enable RLS on teacher_profiles
ALTER TABLE teacher_profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own teacher profile
CREATE POLICY "Teachers can view own profile"
  ON teacher_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Users can insert their own teacher profile
CREATE POLICY "Teachers can insert own profile"
  ON teacher_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own teacher profile
CREATE POLICY "Teachers can update own profile"
  ON teacher_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can delete their own teacher profile (optional)
CREATE POLICY "Teachers can delete own profile"
  ON teacher_profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running this, verify policies are created:
-- SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN ('student_profiles', 'teacher_profiles')
-- ORDER BY tablename, policyname;
-- ============================================================================
