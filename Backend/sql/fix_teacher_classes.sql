-- =============================================
-- FIX: Missing/Incorrect Columns in teacher_classes
-- Run this in your Supabase SQL Editor
-- =============================================

-- 1. Check if 'class_id' column exists. If not, add it.
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'teacher_classes' 
                   AND column_name = 'class_id') THEN
        ALTER TABLE public.teacher_classes 
        ADD COLUMN class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Ensure 'teacher_id' column exists as well
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'teacher_classes' 
                   AND column_name = 'teacher_id') THEN
        ALTER TABLE public.teacher_classes 
        ADD COLUMN teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Re-create constraint if needed (composite primary key)
-- Note: This might fail if duplicates exist, so we use IF NOT EXISTS logic carefully
-- or just ensure the unique constraint/index is present.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'teacher_classes_pkey'
    ) THEN
        ALTER TABLE public.teacher_classes ADD PRIMARY KEY (teacher_id, class_id);
    END IF;
END $$;

-- 4. Enable RLS and add policies just in case they were missed
ALTER TABLE public.teacher_classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view teacher assignments" ON public.teacher_classes;
CREATE POLICY "Anyone can view teacher assignments"
  ON public.teacher_classes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage assignments" ON public.teacher_classes;
CREATE POLICY "Authenticated users can manage assignments"
  ON public.teacher_classes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
