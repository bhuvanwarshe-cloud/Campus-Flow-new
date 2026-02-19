-- =============================================
-- SYNC: Create missing student records
-- Run this in your Supabase SQL Editor
-- =============================================

-- This script finds all users with role 'student' in the 'roles' table
-- and creates a corresponding record in the 'public.students' table
-- if one doesn't already exist with the same email.

INSERT INTO public.students (name, email, created_by)
SELECT 
    -- Try to get name from metadata, fallback to 'Student'
    COALESCE(u.raw_user_meta_data->>'full_name', 'Student User'), 
    u.email, 
    u.id -- Set created_by to the user themselves (for self-registration context)
FROM auth.users u
JOIN public.roles r ON u.id = r.user_id
WHERE r.role = 'student'
AND NOT EXISTS (
    SELECT 1 FROM public.students s WHERE s.email = u.email
);

-- Output result (optional, purely for confirmation)
DO $$
DECLARE
    row_count INT;
BEGIN
    GET DIAGNOSTICS row_count = ROW_COUNT;
    RAISE NOTICE 'Created % missing student records.', row_count;
END $$;
