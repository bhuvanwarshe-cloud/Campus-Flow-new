-- ============================================
-- FIX: Teacher Invites Schema
-- Run this in Supabase SQL Editor to fix the
-- duplicate email constraint bug.
--
-- Problem: email column has a UNIQUE constraint,
-- so resending an invite INSERT fails with:
-- "duplicate key value violates unique constraint
--  teacher_invites_email_key"
--
-- Fix: Remove UNIQUE from email, keep it on token.
-- ============================================


-- ============================================
-- STEP 1: Drop the UNIQUE constraint on email
-- ============================================
-- The constraint name is teacher_invites_email_key
-- (Postgres auto-names it from the UNIQUE keyword on the column)

ALTER TABLE public.teacher_invites
  DROP CONSTRAINT IF EXISTS teacher_invites_email_key;


-- ============================================
-- STEP 2: Ensure token has a UNIQUE constraint
-- ============================================
-- Token must remain unique — each invite link is one-time use

ALTER TABLE public.teacher_invites
  DROP CONSTRAINT IF EXISTS teacher_invites_token_key;

ALTER TABLE public.teacher_invites
  ADD CONSTRAINT teacher_invites_token_key UNIQUE (token);


-- ============================================
-- STEP 3: Ensure supporting indexes exist
-- ============================================

-- Index on email for fast lookups (NOT unique)
CREATE INDEX IF NOT EXISTS idx_teacher_invites_email
  ON public.teacher_invites(email);

-- Index on token for fast invite verification
CREATE INDEX IF NOT EXISTS idx_teacher_invites_token
  ON public.teacher_invites(token);

-- Index on status for admin dashboard filters
CREATE INDEX IF NOT EXISTS idx_teacher_invites_status
  ON public.teacher_invites(status);

-- Index for admin history queries
CREATE INDEX IF NOT EXISTS idx_teacher_invites_invited_by
  ON public.teacher_invites(invited_by_admin_id);


-- ============================================
-- STEP 4: Verify the result
-- Run this SELECT to confirm constraints are correct.
-- You should see token as unique, email as NOT unique.
-- ============================================

SELECT
  conname        AS constraint_name,
  contype        AS type,           -- 'u' = unique, 'p' = primary key
  array_agg(a.attname ORDER BY array_position(conkey, a.attnum)) AS columns
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
WHERE t.relname = 'teacher_invites'
  AND n.nspname = 'public'
  AND contype IN ('u', 'p')
GROUP BY conname, contype
ORDER BY conname;
