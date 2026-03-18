-- ============================================
-- STEP-BY-STEP EXECUTION GUIDE
-- Run each section separately in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: Check current state (RUN THIS FIRST)
-- ============================================
-- Shows if constraints exist and how many duplicates

SELECT 'Checking constraints...' as status;

SELECT constraint_name, table_name
FROM information_schema.table_constraints
WHERE table_name IN ('profiles', 'student_profiles', 'teacher_profiles')
AND constraint_name LIKE '%unique%';

SELECT 'Checking for duplicates...' as status;

SELECT 'student_profiles' as table_name, COUNT(*) as total_records,
       COUNT(DISTINCT user_id) as unique_users,
       COUNT(*) - COUNT(DISTINCT user_id) as duplicate_count
FROM public.student_profiles

UNION ALL

SELECT 'teacher_profiles' as table_name, COUNT(*) as total_records,
       COUNT(DISTINCT user_id) as unique_users,
       COUNT(*) - COUNT(DISTINCT user_id) as duplicate_count
FROM public.teacher_profiles

UNION ALL

SELECT 'profiles' as table_name, COUNT(*) as total_records,
       COUNT(DISTINCT user_id) as unique_users,
       COUNT(*) - COUNT(DISTINCT user_id) as duplicate_count
FROM public.profiles;

-- ============================================
-- STEP 2: If duplicates exist, remove them
-- (Only run if STEP 1 shows duplicate_count > 0)
-- ============================================

-- Remove duplicate student_profiles
DELETE FROM public.student_profiles sp
WHERE EXISTS (
    SELECT 1 FROM public.student_profiles sp2
    WHERE sp.user_id = sp2.user_id
    AND sp.id < sp2.id
    AND sp2.updated_at >= sp.updated_at
);

-- Remove duplicate teacher_profiles
DELETE FROM public.teacher_profiles tp
WHERE EXISTS (
    SELECT 1 FROM public.teacher_profiles tp2
    WHERE tp.user_id = tp2.user_id
    AND tp.id < tp2.id
    AND tp2.updated_at >= tp.updated_at
);

-- Remove duplicate profiles
DELETE FROM public.profiles p
WHERE EXISTS (
    SELECT 1 FROM public.profiles p2
    WHERE p.user_id = p2.user_id
    AND p.user_id < p2.user_id
    AND p2.updated_at >= p.updated_at
);

-- ============================================
-- STEP 3: Drop constraints if they exist
-- (Safe to run even if constraints don't exist)
-- ============================================

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_unique CASCADE;
ALTER TABLE public.student_profiles DROP CONSTRAINT IF EXISTS student_profiles_user_id_unique CASCADE;
ALTER TABLE public.teacher_profiles DROP CONSTRAINT IF EXISTS teacher_profiles_user_id_unique CASCADE;

-- ============================================
-- STEP 4: ADD THE UNIQUE CONSTRAINTS (THE FIX)
-- THIS IS THE CRITICAL STEP
-- ============================================

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

ALTER TABLE public.student_profiles
ADD CONSTRAINT student_profiles_user_id_unique UNIQUE (user_id);

ALTER TABLE public.teacher_profiles
ADD CONSTRAINT teacher_profiles_user_id_unique UNIQUE (user_id);

-- ============================================
-- STEP 5: Verify constraints were added
-- ============================================

SELECT 'FINAL VERIFICATION' as step;

SELECT COUNT(*) as unique_constraints_count
FROM information_schema.table_constraints
WHERE table_name IN ('profiles', 'student_profiles', 'teacher_profiles')
AND constraint_name LIKE '%unique%'
AND constraint_type = 'UNIQUE';

-- Should return 3 if all constraints added successfully
