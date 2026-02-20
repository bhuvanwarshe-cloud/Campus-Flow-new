-- Admin module upgrade migration
-- Adds support for:
-- - User active status flag on profiles
-- - Class soft delete via deleted_at

-- 1) Add is_active flag to profiles (default true)
ALTER TABLE IF EXISTS profiles
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- 2) Add deleted_at column to classes for soft delete support
ALTER TABLE IF EXISTS classes
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- NOTE:
-- - This migration is idempotent and safe to run multiple times.
-- - Application code treats missing columns defensively, but for full
--   functionality you should run this migration on your Supabase/Postgres DB.

