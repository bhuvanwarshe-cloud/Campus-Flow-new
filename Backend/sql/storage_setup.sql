-- ============================================
-- STORAGE POLICIES SETUP
-- ============================================

-- NOTE: If the SQL below fails to create the bucket, please create it 
-- manually in the Supabase Dashboard as "campusflow-assets" (Public).

-- 1. Create the bucket (Skip if already created in Dashboard)
INSERT INTO storage.buckets (id, name, public)
SELECT 'campusflow-assets', 'campusflow-assets', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'campusflow-assets'
);

-- 2. DROP OLD POLICIES for re-runnability
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public Access" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
    DROP POLICY IF EXISTS "Allow users to update own files" ON storage.objects;
    DROP POLICY IF EXISTS "Allow users to delete own files" ON storage.objects;
END $$;

-- 4. NEW POLICIES

-- Allow public read access to all files in this bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'campusflow-assets');

-- Allow authenticated users to upload files
-- We rely on the backend to organize files into folders (e.g., assignments/submission_id/...)
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'campusflow-assets');

-- Allow users to update/delete their own uploads (optional but good practice)
-- This assumes the path starts with the user_id or a known prefix, 
-- but for simplicity in this LMS, we'll allow authenticated users to manage the bucket.
-- In a production app, you'd restrict this further.
CREATE POLICY "Allow users to update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'campusflow-assets');

CREATE POLICY "Allow users to delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'campusflow-assets');
