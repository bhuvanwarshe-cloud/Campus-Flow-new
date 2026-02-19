-- ============================================
-- FIX: Complete marks table schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Ensure subjects table exists
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subjects_class_id ON public.subjects(class_id);
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view subjects" ON public.subjects;
CREATE POLICY "Anyone can view subjects" ON public.subjects FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated can insert subjects" ON public.subjects;
CREATE POLICY "Authenticated can insert subjects" ON public.subjects FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 2. Ensure exams table exists
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  max_marks INT NOT NULL CHECK (max_marks > 0),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exams_class_id ON public.exams(class_id);
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view exams" ON public.exams;
CREATE POLICY "Anyone can view exams" ON public.exams FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated can insert exams" ON public.exams;
CREATE POLICY "Authenticated can insert exams" ON public.exams FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. Add missing columns to marks table
ALTER TABLE public.marks ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE;
ALTER TABLE public.marks ADD COLUMN IF NOT EXISTS exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE;
ALTER TABLE public.marks ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.students(id) ON DELETE CASCADE;
ALTER TABLE public.marks ADD COLUMN IF NOT EXISTS marks_obtained INT DEFAULT 0 CHECK (marks_obtained >= 0);
ALTER TABLE public.marks ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.marks ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.marks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 4. Ensure RLS on marks
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view marks" ON public.marks;
CREATE POLICY "Anyone can view marks" ON public.marks FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated can insert marks" ON public.marks;
CREATE POLICY "Authenticated can insert marks" ON public.marks FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated can update marks" ON public.marks;
CREATE POLICY "Authenticated can update marks" ON public.marks FOR UPDATE USING (auth.role() = 'authenticated');

-- 5. Enable Realtime (safe — skips if already a member)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.marks;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.subjects;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.exams;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. Force schema cache reload
NOTIFY pgrst, 'reload config';

