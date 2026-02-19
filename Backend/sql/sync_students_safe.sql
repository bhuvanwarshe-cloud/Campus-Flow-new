-- =============================================
-- SYNC: Safely Create Missing Student Records
-- Run this in your Supabase SQL Editor
-- =============================================

-- This script finds all users with role 'student' in the 'roles' table
-- and creates a corresponding record in the 'public.students' table.
-- It uses ON CONFLICT DO NOTHING to avoid crashing if some emails already exist.

INSERT INTO public.students (name, email, created_by)
SELECT 
    COALESCE(u.raw_user_meta_data->>'full_name', 'Student User'), 
    u.email, 
    u.id
FROM auth.users u
JOIN public.roles r ON u.id = r.user_id
WHERE r.role = 'student'
ON CONFLICT (email) DO NOTHING;

-- Output result
DO $$
DECLARE
    row_count INT;
BEGIN
    GET DIAGNOSTICS row_count = ROW_COUNT;
    RAISE NOTICE 'Created % new student records.', row_count;
END $$;
