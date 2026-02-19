-- ============================================================
-- COMPLETE FIX: Create classes, assign teacher, enroll students
-- Run in Supabase SQL Editor
-- ============================================================

-- STEP 1: Find your teacher's user ID
-- SELECT id, email FROM auth.users ORDER BY created_at LIMIT 20;

-- ⬆️ Run the above, find your teacher's email and copy the ID.
-- Then paste it below where it says 'PASTE_TEACHER_UUID_HERE'
-- and run the rest of this script.
-- ============================================================

-- FIX: Disable the broken enrollment trigger first
-- (It tries to insert notifications.type which doesn't exist)
DROP TRIGGER IF EXISTS on_enrollment_created ON public.enrollments;

-- Also fix/recreate the trigger function without the 'type' column
CREATE OR REPLACE FUNCTION notify_enrollment()
RETURNS TRIGGER AS $$
DECLARE
  class_name TEXT;
BEGIN
  SELECT name INTO class_name FROM public.classes WHERE id = NEW.class_id;
  INSERT INTO public.notifications (user_id, title, message)
  VALUES (
    NEW.student_id,
    'Enrollment Successful',
    'You have been successfully enrolled in ' || COALESCE(class_name, 'a class') || '.'
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block enrollments due to notification failures
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach the fixed trigger
CREATE TRIGGER on_enrollment_created
  AFTER INSERT ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION notify_enrollment();



DO $$
DECLARE
  -- ════════════════════════════════════════════════
  -- 🔧 CHANGE THIS to your teacher's auth.users ID
  v_teacher_id UUID := 'PASTE_TEACHER_UUID_HERE';
  -- ════════════════════════════════════════════════

  v_class1_id  UUID;
  v_class2_id  UUID;
  v_class3_id  UUID;
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
  v_student    UUID;
BEGIN
  -- ── Create 3 demo classes ─────────────────────────────────────────────
  INSERT INTO public.classes (name, created_by)
  VALUES ('Computer Science - A', v_teacher_id)
  RETURNING id INTO v_class1_id;

  INSERT INTO public.classes (name, created_by)
  VALUES ('Mechanical Engineering - B', v_teacher_id)
  RETURNING id INTO v_class2_id;

  INSERT INTO public.classes (name, created_by)
  VALUES ('Electronics Engineering - C', v_teacher_id)
  RETURNING id INTO v_class3_id;

  RAISE NOTICE 'Created classes: %, %, %', v_class1_id, v_class2_id, v_class3_id;

  -- ── Assign teacher to all 3 classes ──────────────────────────────────
  INSERT INTO public.teacher_classes (teacher_id, class_id)
  VALUES
    (v_teacher_id, v_class1_id),
    (v_teacher_id, v_class2_id),
    (v_teacher_id, v_class3_id)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Teacher % assigned to 3 classes', v_teacher_id;

  -- ── Enroll demo students across the 3 classes ────────────────────────
  -- Students 1-4 → CS class
  INSERT INTO public.enrollments (student_id, class_id)
  VALUES
    ('a1000001-0000-0000-0000-000000000001', v_class1_id),
    ('a1000001-0000-0000-0000-000000000002', v_class1_id),
    ('a1000001-0000-0000-0000-000000000003', v_class1_id),
    ('a1000001-0000-0000-0000-000000000008', v_class1_id),
    ('a1000001-0000-0000-0000-000000000009', v_class1_id)
  ON CONFLICT DO NOTHING;

  -- Students 5-6 → Mechanical class
  INSERT INTO public.enrollments (student_id, class_id)
  VALUES
    ('a1000001-0000-0000-0000-000000000004', v_class2_id),
    ('a1000001-0000-0000-0000-000000000005', v_class2_id),
    ('a1000001-0000-0000-0000-000000000010', v_class2_id)
  ON CONFLICT DO NOTHING;

  -- Students 7-8 → Electronics class
  INSERT INTO public.enrollments (student_id, class_id)
  VALUES
    ('a1000001-0000-0000-0000-000000000006', v_class3_id),
    ('a1000001-0000-0000-0000-000000000007', v_class3_id)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Enrolled 10 students across 3 classes';

  -- ── Also enroll any existing real students into class 1 ──────────────
  INSERT INTO public.enrollments (student_id, class_id)
  SELECT id, v_class1_id
  FROM public.students
  WHERE id::text NOT LIKE 'a1000001%'
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Enrolled existing real students into class 1';

END $$;

-- ── Verify everything worked ────────────────────────────────────────────
SELECT 'CLASSES' AS check_name, COUNT(*) AS count FROM public.classes
UNION ALL
SELECT 'TEACHER_CLASSES', COUNT(*) FROM public.teacher_classes
UNION ALL
SELECT 'ENROLLMENTS', COUNT(*) FROM public.enrollments;
