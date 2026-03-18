-- Add tables and constraints for workflow
CREATE TABLE IF NOT EXISTS teacher_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    class_id UUID REFERENCES classes(id),
    metadata JSONB DEFAULT '{}',
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS student_join_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    class_id UUID REFERENCES classes(id) NOT NULL,
    metadata JSONB DEFAULT '{}',
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id)
);

-- Unique constraint: Only one class teacher per class
ALTER TABLE teacher_classes 
    ADD CONSTRAINT unique_class_teacher 
    EXCLUDE (class_id WITH =) 
    WHERE (is_class_teacher = true);

-- Unique constraint: only one pending teacher request per user
CREATE UNIQUE INDEX idx_unique_pending_teacher_req 
    ON teacher_requests (user_id) 
    WHERE status = 'pending';

-- Unique constraint: only one pending student request per user
CREATE UNIQUE INDEX idx_unique_pending_student_req 
    ON student_join_requests (user_id) 
    WHERE status = 'pending';

-- Transaction for Teacher Approval
CREATE OR REPLACE FUNCTION approve_teacher_request(req_id UUID, admin_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    req RECORD;
    meta JSONB;
BEGIN
    SELECT * INTO req FROM teacher_requests WHERE id = req_id FOR UPDATE;
    
    IF req IS NULL THEN
        RAISE EXCEPTION 'Request not found';
    END IF;
    
    IF req.status != 'pending' THEN
        RAISE EXCEPTION 'Request is already processed';
    END IF;

    meta := req.metadata;

    -- Update request status
    UPDATE teacher_requests 
    SET status = 'approved', reviewed_at = NOW(), reviewed_by = admin_id
    WHERE id = req_id;

    -- Update role
    INSERT INTO roles (user_id, role) 
    VALUES (req.user_id, 'teacher')
    ON CONFLICT (user_id) DO UPDATE SET role = 'teacher';

    -- Create teacher profile
    INSERT INTO teacher_profiles (user_id, department, qualification, experience_years)
    VALUES (
        req.user_id, 
        meta->>'department', 
        meta->>'qualification', 
        (meta->>'years_of_experience')::INT
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- Map teacher to class but NOT as class_teacher
    IF req.class_id IS NOT NULL THEN
        INSERT INTO teacher_classes (teacher_id, class_id, is_class_teacher)
        VALUES (req.user_id, req.class_id, false)
        ON CONFLICT (teacher_id, class_id) DO NOTHING;
    END IF;
END;
$$;

-- Transaction for Student Approval
CREATE OR REPLACE FUNCTION approve_student_request(req_id UUID, teacher_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    req RECORD;
    meta JSONB;
    prof RECORD;
BEGIN
    SELECT * INTO req FROM student_join_requests WHERE id = req_id FOR UPDATE;
    
    IF req IS NULL THEN
        RAISE EXCEPTION 'Request not found';
    END IF;
    
    IF req.status != 'pending' THEN
        RAISE EXCEPTION 'Request is already processed';
    END IF;

    meta := req.metadata;

    -- Update request status
    UPDATE student_join_requests 
    SET status = 'approved', reviewed_at = NOW(), reviewed_by = teacher_id
    WHERE id = req_id;

    -- Update role
    INSERT INTO roles (user_id, role) 
    VALUES (req.user_id, 'student')
    ON CONFLICT (user_id) DO UPDATE SET role = 'student';

    -- Create student profile
    INSERT INTO student_profiles (user_id, branch, degree, registration_number, admission_year)
    VALUES (
        req.user_id, 
        meta->>'branch', 
        meta->>'degree', 
        meta->>'registration_number', 
        (meta->>'admission_year')::INT
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- Populate legacy 'students' table
    SELECT first_name, last_name INTO prof FROM profiles WHERE id = req.user_id;
    INSERT INTO students (id, user_id, name, roll_no, class_id)
    VALUES (
        req.user_id, 
        req.user_id, 
        TRIM(COALESCE(prof.first_name, '') || ' ' || COALESCE(prof.last_name, '')),
        meta->>'registration_number',
        req.class_id
    )
    ON CONFLICT (id) DO NOTHING;

    -- Create enrollment
    INSERT INTO enrollments (student_id, class_id)
    VALUES (req.user_id, req.class_id)
    ON CONFLICT (student_id, class_id) DO NOTHING;

END;
$$;
