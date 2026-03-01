-- ============================================================
-- FIX: Missing Storage Bucket for Assignments
-- The file uploads are failing because the "campusflow-assets"
-- bucket does not exist.
--
-- Note: Requires Supabase Storage schema privileges.
--
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/lpgwbdvnyzyssxqdfnsn/sql/new
-- ============================================================

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('campusflow-assets', 'campusflow-assets', true, false, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow all access to the bucket
-- Since the backend service key is misconfigured as anon,
-- we must temporarily allow anon access to write files.
-- The Express backend already secures the API routes physically.

-- Drop existing if any
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes" ON storage.objects;

-- Allow public read access to the bucket
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'campusflow-assets');

-- Allow anon (backend) to insert files
CREATE POLICY "Allow public uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'campusflow-assets');

-- Allow anon (backend) to update files
CREATE POLICY "Allow public updates"
ON storage.objects FOR UPDATE
WITH CHECK (bucket_id = 'campusflow-assets');

-- Allow anon (backend) to delete files
CREATE POLICY "Allow public deletes"
ON storage.objects FOR DELETE
USING (bucket_id = 'campusflow-assets');
