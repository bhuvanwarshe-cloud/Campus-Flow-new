-- ============================================================
-- MASTER FIX: Create all missing tables + Disable RLS
-- Run this ONCE in Supabase SQL Editor
-- Safe to run multiple times (IF NOT EXISTS everywhere)
-- ============================================================

-- ── SUBJECTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subjects (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id   UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.subjects DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_subjects_class_id ON public.subjects(class_id);

-- ── EXAMS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exams (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id   UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  max_marks  INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.exams DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_exams_class_id ON public.exams(class_id);

-- ── MARKS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.marks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  exam_id         UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  subject_id      UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  marks_obtained  NUMERIC(5,2) NOT NULL DEFAULT 0,
  uploaded_by     UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (student_id, exam_id, subject_id)
);
ALTER TABLE public.marks DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_marks_student_id ON public.marks(student_id);
CREATE INDEX IF NOT EXISTS idx_marks_exam_id    ON public.marks(exam_id);

-- ── TEACHER_CLASSES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teacher_classes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id   UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (teacher_id, class_id)
);
ALTER TABLE public.teacher_classes DISABLE ROW LEVEL SECURITY;

-- ── ENROLLMENTS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.enrollments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id    UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (student_id, class_id)
);
ALTER TABLE public.enrollments DISABLE ROW LEVEL SECURITY;

-- ── ATTENDANCE ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attendance (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id   UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date       DATE NOT NULL DEFAULT CURRENT_DATE,
  status     TEXT NOT NULL CHECK (status IN ('present','absent','late')) DEFAULT 'absent',
  marked_by  UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (class_id, student_id, date)
);
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class   ON public.attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date    ON public.attendance(date);

-- ── CLASSES (ensure RLS doesn't block inserts) ─────────────
ALTER TABLE public.classes  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;

-- ── ANNOUNCEMENTS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.announcements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id   UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.announcements DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_announcements_class ON public.announcements(class_id);

-- ── PERFORMANCE_REPORTS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.performance_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id        UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  period          TEXT NOT NULL,
  avg_marks       NUMERIC(5,2) DEFAULT 0,
  attendance_pct  NUMERIC(5,2) DEFAULT 0,
  total_exams     INT DEFAULT 0,
  total_present   INT DEFAULT 0,
  total_absent    INT DEFAULT 0,
  remarks         TEXT,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.performance_reports DISABLE ROW LEVEL SECURITY;

-- ── Enable Realtime on key tables ─────────────────────────
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.marks;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.enrollments;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Reload PostgREST schema cache ─────────────────────────
NOTIFY pgrst, 'reload config';

-- ── Final check ───────────────────────────────────────────
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'classes','students','teacher_classes','enrollments',
    'attendance','subjects','exams','marks',
    'announcements','performance_reports'
  )
ORDER BY table_name;

