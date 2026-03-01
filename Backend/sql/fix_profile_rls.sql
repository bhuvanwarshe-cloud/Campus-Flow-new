-- ============================================================
-- FIX: Disable RLS on profiles tables so the backend can
-- INSERT/UPDATE freely. Authorization is handled by the
-- Express middleware (JWT verification), not by Supabase RLS.
--
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/lpgwbdvnyzyssxqdfnsn/sql/new
-- ============================================================

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_profiles DISABLE ROW LEVEL SECURITY;

-- Verify RLS is off
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('profiles', 'student_profiles', 'teacher_profiles');

