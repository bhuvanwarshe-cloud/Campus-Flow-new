-- ============================================================
-- Fix: Allow attendance inserts from backend (service_role)
-- The current RLS policy uses auth.uid() which is NULL for
-- service_role requests, blocking all backend writes.
-- Run in Supabase SQL Editor
-- ============================================================

-- Option A (Recommended): Disable RLS on attendance
-- The backend already uses service_role key which bypasses RLS.
-- RLS is only needed if direct client-side access is used.
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;

-- Option B: If you want RLS enabled, add a policy that allows all
-- operations when called with service_role (bypasses automatically)
-- No action needed — service_role always bypasses RLS.

-- Verify the attendance table exists and has correct columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'attendance'
ORDER BY ordinal_position;

SELECT 'Attendance RLS fix applied' AS status;
