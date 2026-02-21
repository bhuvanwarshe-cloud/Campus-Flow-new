-- ============================================
-- LMS System Migration: RLS Policy Fix
-- ============================================

-- This script implements explicit ownership-based RLS policies:
-- SELECT: Teacher (self-created) OR Student (enrolled)
-- INSERT: Teacher (self-created)
-- UPDATE/DELETE: Teacher (self-created)

-- 1. CLEANUP (DROP OLD POLICIES FOR RE-RUN)
DO $$ 
BEGIN
    -- Assignments
    DROP POLICY IF EXISTS "Enrolled students can view assignments" ON public.assignments;
    DROP POLICY IF EXISTS "Teacher manage assignments" ON public.assignments;
    DROP POLICY IF EXISTS "Student view assignments" ON public.assignments;
    DROP POLICY IF EXISTS "Teachers can insert assignments" ON public.assignments;
    DROP POLICY IF EXISTS "Teachers can manage their assignments" ON public.assignments;

    -- Submissions
    DROP POLICY IF EXISTS "Students can view/create own submissions" ON public.assignment_submissions;
    DROP POLICY IF EXISTS "Teachers can view submissions for their assignments" ON public.assignment_submissions;
    DROP POLICY IF EXISTS "Student manage submissions" ON public.assignment_submissions;
    DROP POLICY IF EXISTS "Teacher view submissions" ON public.assignment_submissions;

    -- MCQ Tests
    DROP POLICY IF EXISTS "Enrolled students can view tests" ON public.mcq_tests;
    DROP POLICY IF EXISTS "Teacher manage tests" ON public.mcq_tests;
    DROP POLICY IF EXISTS "Student view tests" ON public.mcq_tests;
    DROP POLICY IF EXISTS "Teachers can insert tests" ON public.mcq_tests;
    DROP POLICY IF EXISTS "Teachers can manage their tests" ON public.mcq_tests;

    -- MCQ Questions
    DROP POLICY IF EXISTS "Can view questions for visible tests" ON public.mcq_questions;
    DROP POLICY IF EXISTS "Teachers can manage questions" ON public.mcq_questions;
    DROP POLICY IF EXISTS "Question access" ON public.mcq_questions;

    -- MCQ Submissions
    DROP POLICY IF EXISTS "Students can view/create own mcq submissions" ON public.mcq_submissions;
    DROP POLICY IF EXISTS "Teachers can view results for their tests" ON public.mcq_submissions;
    DROP POLICY IF EXISTS "Student manage mcq submissions" ON public.mcq_submissions;
    DROP POLICY IF EXISTS "Teacher view mcq results" ON public.mcq_submissions;
END $$;

-- 2. ASSIGNMENTS POLICIES
CREATE POLICY "FOR SELECT" ON public.assignments
    FOR SELECT TO authenticated USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.enrollments e
            JOIN public.students s ON e.student_id = s.id
            WHERE e.class_id = assignments.class_id AND s.id IN (
                SELECT id FROM public.students WHERE email = auth.jwt()->>'email'
            )
        )
    );

CREATE POLICY "FOR INSERT" ON public.assignments
    FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "FOR UPDATE" ON public.assignments
    FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

CREATE POLICY "FOR DELETE" ON public.assignments
    FOR DELETE TO authenticated USING (created_by = auth.uid());

-- 3. SUBMISSIONS POLICIES
CREATE POLICY "FOR SELECT" ON public.assignment_submissions
    FOR SELECT TO authenticated USING (
        student_id IN (SELECT id FROM public.students WHERE email = auth.jwt()->>'email') OR
        EXISTS (
            SELECT 1 FROM public.assignments a
            WHERE a.id = assignment_submissions.assignment_id AND a.created_by = auth.uid()
        )
    );

CREATE POLICY "FOR INSERT" ON public.assignment_submissions
    FOR INSERT TO authenticated WITH CHECK (
        student_id IN (SELECT id FROM public.students WHERE email = auth.jwt()->>'email')
    );

CREATE POLICY "FOR UPDATE" ON public.assignment_submissions
    FOR UPDATE TO authenticated USING (
        student_id IN (SELECT id FROM public.students WHERE email = auth.jwt()->>'email')
    ) WITH CHECK (
        student_id IN (SELECT id FROM public.students WHERE email = auth.jwt()->>'email')
    );

-- 4. MCQ TESTS POLICIES
CREATE POLICY "FOR SELECT" ON public.mcq_tests
    FOR SELECT TO authenticated USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.enrollments e
            JOIN public.students s ON e.student_id = s.id
            WHERE e.class_id = mcq_tests.class_id AND s.id IN (
                SELECT id FROM public.students WHERE email = auth.jwt()->>'email'
            )
        )
    );

CREATE POLICY "FOR INSERT" ON public.mcq_tests
    FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "FOR UPDATE" ON public.mcq_tests
    FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

CREATE POLICY "FOR DELETE" ON public.mcq_tests
    FOR DELETE TO authenticated USING (created_by = auth.uid());

-- 5. MCQ QUESTIONS POLICIES
CREATE POLICY "FOR SELECT" ON public.mcq_questions
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.mcq_tests t
            WHERE t.id = mcq_questions.test_id
        )
    );

CREATE POLICY "FOR INSERT" ON public.mcq_questions
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.mcq_tests t
            WHERE t.id = mcq_questions.test_id AND t.created_by = auth.uid()
        )
    );

CREATE POLICY "FOR UPDATE" ON public.mcq_questions
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.mcq_tests t
            WHERE t.id = mcq_questions.test_id AND t.created_by = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.mcq_tests t
            WHERE t.id = mcq_questions.test_id AND t.created_by = auth.uid()
        )
    );

-- 6. MCQ SUBMISSIONS POLICIES
CREATE POLICY "FOR SELECT" ON public.mcq_submissions
    FOR SELECT TO authenticated USING (
        student_id IN (SELECT id FROM public.students WHERE email = auth.jwt()->>'email') OR
        EXISTS (
            SELECT 1 FROM public.mcq_tests t
            WHERE t.id = mcq_submissions.test_id AND t.created_by = auth.uid()
        )
    );

CREATE POLICY "FOR INSERT" ON public.mcq_submissions
    FOR INSERT TO authenticated WITH CHECK (
        student_id IN (SELECT id FROM public.students WHERE email = auth.jwt()->>'email')
    );
