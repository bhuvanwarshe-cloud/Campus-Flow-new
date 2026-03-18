-- ============================================
-- BARE MINIMUM FIX FOR STUDENT APPROVAL ERROR
-- Copy entire contents and paste into Supabase SQL Editor
-- ============================================

-- Drop constraints that may already exist
ALTER TABLE public.student_profiles DROP CONSTRAINT IF EXISTS student_profiles_user_id_unique CASCADE;
ALTER TABLE public.teacher_profiles DROP CONSTRAINT IF EXISTS teacher_profiles_user_id_unique CASCADE;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_unique CASCADE;

-- Add UNIQUE constraints (fixes the ON CONFLICT error)
ALTER TABLE public.student_profiles ADD CONSTRAINT student_profiles_user_id_unique UNIQUE (user_id);
ALTER TABLE public.teacher_profiles ADD CONSTRAINT teacher_profiles_user_id_unique UNIQUE (user_id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- Verify success
SELECT 'DONE' as status;
