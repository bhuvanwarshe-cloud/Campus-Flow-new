-- ============================================
-- Workflow Migration for Role Requests
-- Adds specialized tables, constraints, and 
-- transactional RPC functions for approvals.
-- ============================================

-- 1. Create Teacher Requests Table
CREATE TABLE IF NOT EXISTS public.teacher_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Constraint: Only one pending teacher request per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_teacher_request 
ON public.teacher_requests(user_id) 
WHERE status = 'pending';

-- Enable RLS for teacher_requests
ALTER TABLE public.teacher_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own teacher requests" ON public.teacher_requests;
CREATE POLICY "Users can view own teacher requests" ON public.teacher_requests FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all teacher requests" ON public.teacher_requests;
CREATE POLICY "Admins can view all teacher requests" ON public.teacher_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own teacher request" ON public.teacher_requests;
CREATE POLICY "Users can insert own teacher request" ON public.teacher_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update teacher requests" ON public.teacher_requests;
CREATE POLICY "Admins can update teacher requests" ON public.teacher_requests FOR UPDATE USING (true);


-- 2. Create Student Join Requests Table
CREATE TABLE IF NOT EXISTS public.student_join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Constraint: Only one pending student request per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_student_request 
ON public.student_join_requests(user_id) 
WHERE status = 'pending';

-- Enable RLS for student_join_requests
ALTER TABLE public.student_join_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own student requests" ON public.student_join_requests;
CREATE POLICY "Users can view own student requests" ON public.student_join_requests FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Teachers can view student requests" ON public.student_join_requests;
CREATE POLICY "Teachers can view student requests" ON public.student_join_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own student request" ON public.student_join_requests;
CREATE POLICY "Users can insert own student request" ON public.student_join_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Teachers can update student requests" ON public.student_join_requests;
CREATE POLICY "Teachers can update student requests" ON public.student_join_requests FOR UPDATE USING (true);


-- 3. Ensure teacher_classes constraints
-- Add is_class_teacher if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'teacher_classes' 
                   AND column_name = 'is_class_teacher') THEN
        ALTER TABLE public.teacher_classes ADD COLUMN is_class_teacher BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Constraint: Only one class teacher per class
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_class_teacher 
ON public.teacher_classes(class_id) 
WHERE is_class_teacher = true;


-- 4. Transactional RPC for Teacher Approval
CREATE OR REPLACE FUNCTION approve_teacher_request(
    p_request_id UUID,
    p_admin_id UUID
) RETURNS void AS $$
DECLARE
    v_user_id UUID;
    v_meta JSONB;
BEGIN
    -- Get request details
    SELECT user_id, metadata INTO v_user_id, v_meta
    FROM public.teacher_requests
    WHERE id = p_request_id AND status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pending teacher request not found';
    END IF;

    -- Update request status
    UPDATE public.teacher_requests
    SET status = 'approved',
        reviewed_at = CURRENT_TIMESTAMP,
        reviewed_by = p_admin_id
    WHERE id = p_request_id;

    -- Update role without relying on a unique constraint
    UPDATE public.roles
    SET role = 'teacher'
    WHERE user_id = v_user_id;

    IF NOT FOUND THEN
        INSERT INTO public.roles (user_id, role)
        VALUES (v_user_id, 'teacher');
    END IF;

    -- Create/Update teacher profile without relying on a unique constraint
    UPDATE public.teacher_profiles
    SET
        department = v_meta->>'department',
        qualification = v_meta->>'qualification',
        experience_years = (v_meta->>'years_of_experience')::INTEGER
    WHERE user_id = v_user_id;

    IF NOT FOUND THEN
        INSERT INTO public.teacher_profiles (
            user_id, department, qualification, experience_years, subjects_taught
        )
        VALUES (
            v_user_id,
            v_meta->>'department',
            v_meta->>'qualification',
            (v_meta->>'years_of_experience')::INTEGER,
            ARRAY[]::TEXT[]
        );
    END IF;

    -- NOTE: Intentionally NOT inserting into teacher_classes as per corrections.
    -- Class teacher assignment happens later via admin endpoint.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. Transactional RPC for Student Approval
CREATE OR REPLACE FUNCTION approve_student_request(
    p_request_id UUID,
    p_teacher_id UUID
) RETURNS void AS $$
DECLARE
    v_user_id UUID;
    v_class_id UUID;
    v_meta JSONB;
    v_full_name TEXT;
BEGIN
    -- Get request details
    SELECT user_id, class_id, metadata INTO v_user_id, v_class_id, v_meta
    FROM public.student_join_requests
    WHERE id = p_request_id AND status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pending student request not found';
    END IF;

    -- Update request status
    UPDATE public.student_join_requests
    SET status = 'approved',
        reviewed_at = CURRENT_TIMESTAMP,
        reviewed_by = p_teacher_id
    WHERE id = p_request_id;

    -- Create/Update student profile without relying on a unique constraint
    UPDATE public.student_profiles
    SET
        class_id = v_class_id,
        roll_no = v_meta->>'registration_number',
        admission_year = (v_meta->>'admission_year')::INTEGER
    WHERE user_id = v_user_id;

    IF NOT FOUND THEN
        INSERT INTO public.student_profiles (
            user_id, class_id, roll_no, admission_year
        )
        VALUES (
            v_user_id,
            v_class_id,
            v_meta->>'registration_number',
            (v_meta->>'admission_year')::INTEGER
        );
    END IF;

    -- Get user's full name from core profiles table
    SELECT full_name INTO v_full_name
    FROM public.profiles
    WHERE id = v_user_id OR user_id = v_user_id;

    IF v_full_name IS NULL THEN
        -- Fallback to old table structure lookup if needed
        SELECT first_name || ' ' || COALESCE(last_name, '') INTO v_full_name
        FROM public.profiles
        WHERE id = v_user_id;
    END IF;

    -- Create legacy student record (for marks/attendance referencing)
    INSERT INTO public.students (id, name, email, created_by)
    VALUES (
        v_user_id,
        COALESCE(v_full_name, 'Unknown Student'),
        (v_user_id::text || '@temp.mail'), -- Requires fetching real email or updating later
        p_teacher_id
    )
    ON CONFLICT (id) DO NOTHING;

    -- Create enrollment
    INSERT INTO public.enrollments (student_id, class_id)
    VALUES (v_user_id, v_class_id)
    ON CONFLICT (student_id, class_id) DO NOTHING;

    -- Update role without relying on a unique constraint
    UPDATE public.roles
    SET role = 'student'
    WHERE user_id = v_user_id;

    IF NOT FOUND THEN
        INSERT INTO public.roles (user_id, role)
        VALUES (v_user_id, 'student');
    END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
