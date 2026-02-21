-- ============================================
-- LMS System Migration: Assignments & MCQ Tests (Robust Version)
-- ============================================

-- 1. TABLES
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS public.assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('on-time', 'late')),
    marks INT CHECK (marks >= 0),
    feedback TEXT,
    UNIQUE(assignment_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.mcq_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    duration INT NOT NULL CHECK (duration > 0),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CHECK (end_date > start_date)
);

CREATE TABLE IF NOT EXISTS public.mcq_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES public.mcq_tests(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS public.mcq_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES public.mcq_tests(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    answers JSONB NOT NULL,
    score INT NOT NULL DEFAULT 0,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(test_id, student_id)
);

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON public.assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON public.assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_mcq_tests_class_id ON public.mcq_tests(class_id);
CREATE INDEX IF NOT EXISTS idx_mcq_questions_test_id ON public.mcq_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_mcq_submissions_test_id ON public.mcq_submissions(test_id);

-- 3. RLS ENABLEMENT
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcq_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcq_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcq_submissions ENABLE ROW LEVEL SECURITY;

-- 4. CLEANUP (DROP OLD POLICIES FOR RE-RUN)
DO $$ 
BEGIN
    -- Assignments
    DROP POLICY IF EXISTS "Enrolled students can view assignments" ON public.assignments;
    DROP POLICY IF EXISTS "Teachers can manage assignments" ON public.assignments;
    DROP POLICY IF EXISTS "Teachers can insert assignments" ON public.assignments;
    DROP POLICY IF EXISTS "Teachers can manage their assignments" ON public.assignments;
    DROP POLICY IF EXISTS "Authorize teacher access" ON public.assignments;
    DROP POLICY IF EXISTS "Authorize student select" ON public.assignments;

    -- Submissions
    DROP POLICY IF EXISTS "Students can view/create own submissions" ON public.assignment_submissions;
    DROP POLICY IF EXISTS "Teachers can view submissions for their assignments" ON public.assignment_submissions;
    DROP POLICY IF EXISTS "Submissions access policy" ON public.assignment_submissions;

    -- MCQ Tests
    DROP POLICY IF EXISTS "Enrolled students can view tests" ON public.mcq_tests;
    DROP POLICY IF EXISTS "Teachers can manage tests" ON public.mcq_tests;
    DROP POLICY IF EXISTS "Teachers can insert tests" ON public.mcq_tests;
    DROP POLICY IF EXISTS "Teachers can manage their tests" ON public.mcq_tests;
    DROP POLICY IF EXISTS "Authorize teacher test management" ON public.mcq_tests;

    -- MCQ Questions
    DROP POLICY IF EXISTS "Can view questions for visible tests" ON public.mcq_questions;
    DROP POLICY IF EXISTS "Teachers can manage questions" ON public.mcq_questions;

    -- MCQ Submissions
    DROP POLICY IF EXISTS "Students can view/create own mcq submissions" ON public.mcq_submissions;
    DROP POLICY IF EXISTS "Teachers can view results for their tests" ON public.mcq_submissions;
END $$;

-- 5. NEW ROBUST POLICIES

-- Assignments: Teachers manage everything, Students view only
CREATE POLICY "Teacher manage assignments" ON public.assignments
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.roles r WHERE r.user_id = auth.uid() AND r.role IN ('teacher', 'admin'))
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.roles r WHERE r.user_id = auth.uid() AND r.role IN ('teacher', 'admin'))
    );

CREATE POLICY "Student view assignments" ON public.assignments
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.enrollments e
            JOIN public.students s ON e.student_id = s.id
            WHERE e.class_id = assignments.class_id AND s.id IN (
                SELECT id FROM public.students WHERE email = auth.jwt()->>'email'
            )
        )
    );

-- Submissions: Students manage own, Teachers view all for their assignments
CREATE POLICY "Student manage submissions" ON public.assignment_submissions
    FOR ALL TO authenticated USING (
        student_id IN (SELECT id FROM public.students WHERE email = auth.jwt()->>'email')
    ) WITH CHECK (
        student_id IN (SELECT id FROM public.students WHERE email = auth.jwt()->>'email')
    );

CREATE POLICY "Teacher view submissions" ON public.assignment_submissions
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.assignments a
            WHERE a.id = assignment_submissions.assignment_id AND a.created_by = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM public.roles r WHERE r.user_id = auth.uid() AND r.role IN ('teacher', 'admin'))
    );

-- MCQ Tests
CREATE POLICY "Teacher manage tests" ON public.mcq_tests
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.roles r WHERE r.user_id = auth.uid() AND r.role IN ('teacher', 'admin'))
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.roles r WHERE r.user_id = auth.uid() AND r.role IN ('teacher', 'admin'))
    );

CREATE POLICY "Student view tests" ON public.mcq_tests
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.enrollments e
            JOIN public.students s ON e.student_id = s.id
            WHERE e.class_id = mcq_tests.class_id AND s.id IN (
                SELECT id FROM public.students WHERE email = auth.jwt()->>'email'
            )
        )
    );

-- MCQ Questions
CREATE POLICY "Question access" ON public.mcq_questions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- MCQ Submissions
CREATE POLICY "Student manage mcq submissions" ON public.mcq_submissions
    FOR ALL TO authenticated USING (
        student_id IN (SELECT id FROM public.students WHERE email = auth.jwt()->>'email')
    ) WITH CHECK (
        student_id IN (SELECT id FROM public.students WHERE email = auth.jwt()->>'email')
    );

CREATE POLICY "Teacher view mcq results" ON public.mcq_submissions
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.roles r WHERE r.user_id = auth.uid() AND r.role IN ('teacher', 'admin'))
    );

-- 6. REALTIME REPLICATION (Idempotent)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'assignments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE assignments;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'assignment_submissions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE assignment_submissions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'mcq_tests') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE mcq_tests;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'mcq_submissions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE mcq_submissions;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Publication might not exist or other issues; skip silently
END $$;

-- 7. TRIGGERS
DROP TRIGGER IF EXISTS update_assignments_updated_at ON public.assignments;
CREATE TRIGGER update_assignments_updated_at
    BEFORE UPDATE ON public.assignments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_mcq_tests_updated_at ON public.mcq_tests;
CREATE TRIGGER update_mcq_tests_updated_at
    BEFORE UPDATE ON public.mcq_tests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
