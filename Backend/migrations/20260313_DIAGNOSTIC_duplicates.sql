-- ============================================
-- DIAGNOSTIC: Find duplicate user_id entries
-- Run this FIRST to see what the migration will clean up
-- ============================================

-- Find duplicate user_id in student_profiles
SELECT 
    user_id,
    COUNT(*) as duplicate_count,
    string_agg(id::text, ', ') as record_ids
FROM public.student_profiles
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Find duplicate user_id in teacher_profiles
SELECT 
    user_id,
    COUNT(*) as duplicate_count,
    string_agg(id::text, ', ') as record_ids
FROM public.teacher_profiles
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Find duplicate user_id in profiles
SELECT 
    user_id,
    COUNT(*) as duplicate_count
FROM public.profiles
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- ============================================
-- Show which records will be DELETED from student_profiles
-- (keeping only the newest one per user_id)
-- ============================================
SELECT 
    sp.id,
    sp.user_id,
    sp.created_at,
    ROW_NUMBER() OVER (PARTITION BY sp.user_id ORDER BY sp.created_at DESC) as keep_order
FROM public.student_profiles sp
WHERE sp.user_id IN (
    SELECT user_id 
    FROM public.student_profiles 
    GROUP BY user_id 
    HAVING COUNT(*) > 1
)
ORDER BY sp.user_id, sp.created_at DESC;
-- (Records with keep_order > 1 will be deleted)
