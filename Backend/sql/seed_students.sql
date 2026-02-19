-- ============================================
-- Campus Flow — Demo Student Seed Data
-- Run in Supabase SQL Editor
-- Seeds 10 demo students, links them to classes
-- ============================================

-- STEP 1: Insert demo students into public.students
-- (We use the students table directly as that is what the backend reads)
INSERT INTO public.students (id, name, email, roll_no, created_at)
VALUES
  ('a1000001-0000-0000-0000-000000000001', 'Aarav Sharma',    'aarav.sharma@demo.edu',    1,  now()),
  ('a1000001-0000-0000-0000-000000000002', 'Bhavna Patel',    'bhavna.patel@demo.edu',    2,  now()),
  ('a1000001-0000-0000-0000-000000000003', 'Chirag Verma',    'chirag.verma@demo.edu',    3,  now()),
  ('a1000001-0000-0000-0000-000000000004', 'Divya Mehta',     'divya.mehta@demo.edu',     4,  now()),
  ('a1000001-0000-0000-0000-000000000005', 'Eshan Gupta',     'eshan.gupta@demo.edu',     5,  now()),
  ('a1000001-0000-0000-0000-000000000006', 'Farah Khan',      'farah.khan@demo.edu',      6,  now()),
  ('a1000001-0000-0000-0000-000000000007', 'Gaurav Nair',     'gaurav.nair@demo.edu',     7,  now()),
  ('a1000001-0000-0000-0000-000000000008', 'Hina Siddiqui',   'hina.siddiqui@demo.edu',   8,  now()),
  ('a1000001-0000-0000-0000-000000000009', 'Ishaan Raj',      'ishaan.raj@demo.edu',      9,  now()),
  ('a1000001-0000-0000-0000-000000000010', 'Jaya Krishnan',   'jaya.krishnan@demo.edu',   10, now())
ON CONFLICT (id) DO UPDATE SET
  name    = EXCLUDED.name,
  email   = EXCLUDED.email,
  roll_no = EXCLUDED.roll_no;

-- STEP 2: Get a demo class to enroll students into.
-- We pick the first available class; change class_id if you have specific ones.
-- Run this to check: SELECT id, name FROM public.classes LIMIT 5;

-- STEP 3: Enroll demo students into the first class found
-- (Using a DO block so it works even if class doesn't exist)
DO $$
DECLARE
  v_class_id UUID;
BEGIN
  -- Pick the first class available
  SELECT id INTO v_class_id FROM public.classes LIMIT 1;

  IF v_class_id IS NULL THEN
    RAISE NOTICE 'No classes found — skipping enrollment. Create a class first.';
    RETURN;
  END IF;

  -- Enroll all 10 demo students
  INSERT INTO public.enrollments (student_id, class_id, enrolled_at)
  VALUES
    ('a1000001-0000-0000-0000-000000000001', v_class_id, now()),
    ('a1000001-0000-0000-0000-000000000002', v_class_id, now()),
    ('a1000001-0000-0000-0000-000000000003', v_class_id, now()),
    ('a1000001-0000-0000-0000-000000000004', v_class_id, now()),
    ('a1000001-0000-0000-0000-000000000005', v_class_id, now()),
    ('a1000001-0000-0000-0000-000000000006', v_class_id, now()),
    ('a1000001-0000-0000-0000-000000000007', v_class_id, now()),
    ('a1000001-0000-0000-0000-000000000008', v_class_id, now()),
    ('a1000001-0000-0000-0000-000000000009', v_class_id, now()),
    ('a1000001-0000-0000-0000-000000000010', v_class_id, now())
  ON CONFLICT (student_id, class_id) DO NOTHING;

  RAISE NOTICE 'Enrolled 10 demo students into class: %', v_class_id;
END $$;

-- STEP 4: Seed sample attendance for demo students
-- (3 months of data, random present/absent)
DO $$
DECLARE
  v_class_id UUID;
  v_student  UUID;
  students   UUID[] := ARRAY[
    'a1000001-0000-0000-0000-000000000001'::UUID,
    'a1000001-0000-0000-0000-000000000002'::UUID,
    'a1000001-0000-0000-0000-000000000003'::UUID,
    'a1000001-0000-0000-0000-000000000004'::UUID,
    'a1000001-0000-0000-0000-000000000005'::UUID,
    'a1000001-0000-0000-0000-000000000006'::UUID,
    'a1000001-0000-0000-0000-000000000007'::UUID,
    'a1000001-0000-0000-0000-000000000008'::UUID,
    'a1000001-0000-0000-0000-000000000009'::UUID,
    'a1000001-0000-0000-0000-000000000010'::UUID
  ];
  statuses   TEXT[] := ARRAY['present','present','present','absent','late'];
  d          DATE;
BEGIN
  SELECT id INTO v_class_id FROM public.classes LIMIT 1;
  IF v_class_id IS NULL THEN RETURN; END IF;

  FOREACH v_student IN ARRAY students LOOP
    FOR d IN SELECT generate_series(
      CURRENT_DATE - INTERVAL '60 days',
      CURRENT_DATE - INTERVAL '1 day',
      INTERVAL '1 day'
    )::DATE LOOP
      -- Skip weekends
      IF EXTRACT(DOW FROM d) NOT IN (0, 6) THEN
        INSERT INTO public.attendance (student_id, class_id, date, status)
        VALUES (v_student, v_class_id, d, statuses[1 + floor(random() * 5)::INT])
        ON CONFLICT (student_id, class_id, date) DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Seeded attendance for 10 demo students';
END $$;

-- STEP 5: Seed sample marks
DO $$
DECLARE
  v_class_id   UUID;
  v_exam_id    UUID;
  v_subject_id UUID;
  v_student    UUID;
  students     UUID[] := ARRAY[
    'a1000001-0000-0000-0000-000000000001'::UUID,
    'a1000001-0000-0000-0000-000000000002'::UUID,
    'a1000001-0000-0000-0000-000000000003'::UUID,
    'a1000001-0000-0000-0000-000000000004'::UUID,
    'a1000001-0000-0000-0000-000000000005'::UUID,
    'a1000001-0000-0000-0000-000000000006'::UUID,
    'a1000001-0000-0000-0000-000000000007'::UUID,
    'a1000001-0000-0000-0000-000000000008'::UUID,
    'a1000001-0000-0000-0000-000000000009'::UUID,
    'a1000001-0000-0000-0000-000000000010'::UUID
  ];
BEGIN
  SELECT id INTO v_class_id FROM public.classes LIMIT 1;
  IF v_class_id IS NULL THEN RETURN; END IF;

  -- Create a demo subject if none exists
  INSERT INTO public.subjects (class_id, name)
  VALUES (v_class_id, 'Mathematics')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_subject_id;

  IF v_subject_id IS NULL THEN
    SELECT id INTO v_subject_id FROM public.subjects WHERE class_id = v_class_id LIMIT 1;
  END IF;

  -- Create a demo exam if none exists
  INSERT INTO public.exams (class_id, name, max_marks)
  VALUES (v_class_id, 'Mid Semester Exam', 100)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_exam_id;

  IF v_exam_id IS NULL THEN
    SELECT id INTO v_exam_id FROM public.exams WHERE class_id = v_class_id LIMIT 1;
  END IF;

  IF v_exam_id IS NULL OR v_subject_id IS NULL THEN
    RAISE NOTICE 'No exam/subject found — skipping marks seed';
    RETURN;
  END IF;

  FOREACH v_student IN ARRAY students LOOP
    INSERT INTO public.marks (student_id, exam_id, subject_id, marks_obtained)
    VALUES (v_student, v_exam_id, v_subject_id, 40 + floor(random() * 60)::INT)
    ON CONFLICT (student_id, exam_id, subject_id) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Seeded marks for 10 demo students';
END $$;

SELECT 'Seed complete — ' || COUNT(*) || ' demo students found' AS status
FROM public.students
WHERE id::text LIKE 'a1000001%';
