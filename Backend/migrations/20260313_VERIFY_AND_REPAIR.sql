-- ============================================
-- Verification & Repair Script
-- Run this to check current state and fix any issues
-- ============================================

-- ============================================
-- CHECK 1: Do duplicates still exist?
-- ============================================
SELECT 
    'student_profiles' as table_name,
    user_id,
    COUNT(*) as count
FROM public.student_profiles
GROUP BY user_id
HAVING COUNT(*) > 1

UNION ALL

SELECT 
    'teacher_profiles' as table_name,
    user_id,
    COUNT(*) as count
FROM public.teacher_profiles
GROUP BY user_id
HAVING COUNT(*) > 1

UNION ALL

SELECT 
    'profiles' as table_name,
    user_id,
    COUNT(*) as count
FROM public.profiles
GROUP BY user_id
HAVING COUNT(*) > 1;

-- Result: If this returns 0 rows, no duplicates exist

-- ============================================
-- CHECK 2: Do the UNIQUE constraints exist?
-- ============================================
SELECT 
    constraint_name,
    table_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name IN ('profiles', 'student_profiles', 'teacher_profiles')
AND constraint_type = 'UNIQUE'
AND constraint_name LIKE '%user_id%'
ORDER BY table_name;

-- Result: Should show 3 UNIQUE constraints (one per table)

-- ============================================
-- CHECK 3: What constraints currently exist?
-- ============================================
SELECT 
    constraint_name,
    table_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name IN ('profiles', 'student_profiles', 'teacher_profiles')
ORDER BY table_name, constraint_name;

-- ============================================
-- REPAIR STEP 1: If duplicates still exist, remove them manually
-- (Run only if CHECK 1 returns rows)
-- ============================================
-- Uncomment and run if duplicates found:

-- DELETE FROM public.student_profiles sp1
-- WHERE id > (
--     SELECT MAX(id)
--     FROM public.student_profiles sp2
--     WHERE sp1.user_id = sp2.user_id
-- );

-- DELETE FROM public.teacher_profiles tp1
-- WHERE id > (
--     SELECT MAX(id)
--     FROM public.teacher_profiles tp2
--     WHERE tp1.user_id = tp2.user_id
-- );

-- ============================================
-- REPAIR STEP 2: Ensure constraints exist
-- (Safe to run even if already exist)
-- ============================================

-- Drop if exists (PostgreSQL 14+)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_unique;
ALTER TABLE public.student_profiles DROP CONSTRAINT IF EXISTS student_profiles_user_id_unique;
ALTER TABLE public.teacher_profiles DROP CONSTRAINT IF EXISTS teacher_profiles_user_id_unique;

-- Add constraints
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

ALTER TABLE public.student_profiles
ADD CONSTRAINT student_profiles_user_id_unique UNIQUE (user_id);

ALTER TABLE public.teacher_profiles
ADD CONSTRAINT teacher_profiles_user_id_unique UNIQUE (user_id);

-- ============================================
-- FINAL VERIFICATION
-- ============================================
-- Run these to confirm everything is fixed:

SELECT 'student_profiles duplicates' as check_name, 
       COUNT(*) as duplicate_count
FROM (
    SELECT user_id
    FROM public.student_profiles
    GROUP BY user_id
    HAVING COUNT(*) > 1
) dups;

SELECT 'Constraints exist' as check_name,
       COUNT(*) as constraint_count
FROM information_schema.table_constraints
WHERE table_name IN ('profiles', 'student_profiles', 'teacher_profiles')
AND constraint_type = 'UNIQUE'
AND constraint_name LIKE '%user_id%';

-- Both should show 0 and 3 respectively for success
