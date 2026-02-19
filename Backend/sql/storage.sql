-- Enable Storage
-- NOTE: Buckets must often be created via the Supabase Dashboard, but this script attempts to insert them if possible or valid in self-hosted. 
-- Otherwise, these serve as documentation for what buckets to create.

-- 1. Create 'course-materials' bucket (Public: false, but accesible via policies)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('course-materials', 'course-materials', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Create 'assignments' bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('assignments', 'assignments', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for 'course-materials'
-- Allow Authenticated users to view
CREATE POLICY "Authenticated users can view course materials"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'course-materials' );

-- Allow Teachers and Admins to upload
CREATE POLICY "Teachers/Admins can upload course materials"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-materials' 
  AND (
    (SELECT role FROM public.roles WHERE user_id = auth.uid()) IN ('teacher', 'admin')
  )
);

-- Allow Teachers/Admins to update/delete their own or all? Let's say Teachers can delete what they uploaded.
CREATE POLICY "Teachers/Admins can delete course materials"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'course-materials'
  AND (
    (SELECT role FROM public.roles WHERE user_id = auth.uid()) = 'admin'
    OR
    owner = auth.uid()
  )
);


-- Policies for 'assignments'
-- Students can upload to their own folder (e.g., assignments/{student_id}/...)
CREATE POLICY "Students can upload assignments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'assignments'
  AND (
    (SELECT role FROM public.roles WHERE user_id = auth.uid()) = 'student'
  )
);

-- Students can view their own assignments
CREATE POLICY "Students can view own assignments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'assignments'
  AND owner = auth.uid()
);

-- Teachers can view all assignments (simplified, ideally restricted to their classes)
-- For now, allowing all teachers to view all assignments for simplicity, or we can add complex RLS later.
CREATE POLICY "Teachers/Admins can view all assignments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'assignments'
  AND (
    (SELECT role FROM public.roles WHERE user_id = auth.uid()) IN ('teacher', 'admin')
  )
);
