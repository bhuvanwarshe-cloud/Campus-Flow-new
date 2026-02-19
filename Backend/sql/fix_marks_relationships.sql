-- =============================================
-- FIX: Missing/Broken Relationships in marks table
-- =============================================

-- 1. Ensure 'subjects' table exists and has 'id' primary key
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Ensure 'exams' table exists
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  max_marks INT NOT NULL CHECK (max_marks > 0),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Ensure 'marks' table has proper Foreign Key constraints
--    This explicitly names them so PostgREST can detect them.

-- Fix Subject Relationship
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'marks_subject_id_fkey') THEN
        ALTER TABLE public.marks
        ADD CONSTRAINT marks_subject_id_fkey
        FOREIGN KEY (subject_id)
        REFERENCES public.subjects(id)
        ON DELETE CASCADE;
    ELSE
        -- Verify it points to the right table (optional, but good practice)
        NULL; 
    END IF;
END $$;

-- Fix Exam Relationship
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'marks_exam_id_fkey') THEN
        ALTER TABLE public.marks
        ADD CONSTRAINT marks_exam_id_fkey
        FOREIGN KEY (exam_id)
        REFERENCES public.exams(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Enable RLS on these tables if not already enabled
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;

-- 5. Add a policy for reading subjects/exams if missing
DROP POLICY IF EXISTS "Anyone can view subjects" ON public.subjects;
CREATE POLICY "Anyone can view subjects" ON public.subjects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view exams" ON public.exams;
CREATE POLICY "Anyone can view exams" ON public.exams FOR SELECT USING (true);

-- 6. Important: Grants must be correct (usually handled by Supabase, but...)
GRANT SELECT ON public.subjects TO anon, authenticated, service_role;
GRANT SELECT ON public.exams TO anon, authenticated, service_role;
GRANT SELECT ON public.marks TO anon, authenticated, service_role;

-- 7. Force schema cache reload (Supabase specific trick: notify pgrst)
NOTIFY pgrst, 'reload config';
