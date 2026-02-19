-- ============================================
-- Attendance Table Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- Create attendance table
CREATE TABLE IF NOT EXISTS public.attendance (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  status      TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late')) DEFAULT 'absent',
  marked_by   UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),

  -- Prevent duplicate attendance records per student per class per day
  UNIQUE (class_id, student_id, date)
);

-- Index for fast student lookups
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class_id   ON public.attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date        ON public.attendance(date);

-- Enable Row Level Security
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Teachers can insert/update attendance for their classes
DROP POLICY IF EXISTS "Teachers can manage attendance" ON public.attendance;
CREATE POLICY "Teachers can manage attendance" ON public.attendance
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.teacher_classes tc
      WHERE tc.class_id = public.attendance.class_id
        AND tc.teacher_id = auth.uid()
    )
  );

-- Students can view their own attendance
DROP POLICY IF EXISTS "Students can view own attendance" ON public.attendance;
CREATE POLICY "Students can view own attendance" ON public.attendance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = public.attendance.student_id
        AND s.email = auth.email()
    )
  );

-- (Admin access is handled via the service_role key which bypasses RLS)

-- Enable Realtime (safe)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload config';

SELECT 'attendance table created successfully' AS status;
