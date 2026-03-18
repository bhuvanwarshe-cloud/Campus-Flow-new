-- ============================================
-- FIX: Add UNIQUE constraints for ON CONFLICT clauses
-- Date: 2026-03-13
-- 
-- The approve_student_request RPC function uses:
--   - ON CONFLICT (user_id) on student_profiles
--   - ON CONFLICT (user_id) on teacher_profiles
-- 
-- PostgreSQL requires UNIQUE constraints for ON CONFLICT targets
-- ============================================

-- STEP 1: Remove duplicate student_profiles (keep newest)
WITH ranked_records AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST) AS rn
  FROM public.student_profiles
)
DELETE FROM public.student_profiles
WHERE id IN (SELECT id FROM ranked_records WHERE rn > 1);

-- STEP 2: Remove duplicate teacher_profiles (keep newest)
WITH ranked_records AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST) AS rn
  FROM public.teacher_profiles
)
DELETE FROM public.teacher_profiles
WHERE id IN (SELECT id FROM ranked_records WHERE rn > 1);

-- STEP 3: Remove duplicate profiles (keep newest)
WITH ranked_records AS (
  SELECT user_id,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST) AS rn
  FROM public.profiles
)
DELETE FROM public.profiles
WHERE user_id IN (SELECT user_id FROM ranked_records WHERE rn > 1);

-- STEP 4: Drop constraints if they exist (idempotent)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_unique;
ALTER TABLE public.student_profiles DROP CONSTRAINT IF EXISTS student_profiles_user_id_unique;
ALTER TABLE public.teacher_profiles DROP CONSTRAINT IF EXISTS teacher_profiles_user_id_unique;

-- STEP 5: Add UNIQUE constraints
-- These enable the ON CONFLICT clauses in the approve_student_request RPC
ALTER TABLE public.student_profiles
ADD CONSTRAINT student_profiles_user_id_unique UNIQUE (user_id);

ALTER TABLE public.teacher_profiles
ADD CONSTRAINT teacher_profiles_user_id_unique UNIQUE (user_id);

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
