-- ============================================================
-- DIAGNOSTIC: Why no students show in Teacher Directory?
-- Run each section in Supabase SQL Editor and share the results
-- ============================================================

-- 1. How many classes exist?
SELECT 'CLASSES' AS table_name, COUNT(*) AS count FROM public.classes;

-- 2. How many teacher_class assignments exist?
SELECT 'TEACHER_CLASSES' AS table_name, COUNT(*) AS count FROM public.teacher_classes;

-- 3. Show teacher_classes with class names
SELECT
  tc.teacher_id,
  tc.class_id,
  c.name AS class_name
FROM public.teacher_classes tc
LEFT JOIN public.classes c ON c.id = tc.class_id
LIMIT 10;

-- 4. How many enrollments exist?
SELECT 'ENROLLMENTS' AS table_name, COUNT(*) AS count FROM public.enrollments;

-- 5. Show enrollments with class names
SELECT
  e.student_id,
  e.class_id,
  c.name AS class_name,
  s.name AS student_name,
  s.email
FROM public.enrollments e
LEFT JOIN public.classes c ON c.id = e.class_id
LEFT JOIN public.students s ON s.id = e.student_id
LIMIT 20;

-- 6. How many students exist?
SELECT 'STUDENTS' AS table_name, COUNT(*) AS count FROM public.students;

-- 7. Show all students
SELECT id, name, email, roll_no FROM public.students LIMIT 20;

-- 8. Are the demo students enrolled?
SELECT
  e.student_id,
  e.class_id,
  s.name AS student_name
FROM public.enrollments e
JOIN public.students s ON s.id = e.student_id
WHERE e.student_id::text LIKE 'a1000001%';

-- 9. Do the teacher_classes and enrollments share a class_id?
-- (This is the critical JOIN that must succeed)
SELECT
  tc.teacher_id,
  tc.class_id,
  COUNT(e.student_id) AS enrolled_students
FROM public.teacher_classes tc
LEFT JOIN public.enrollments e ON e.class_id = tc.class_id
GROUP BY tc.teacher_id, tc.class_id;
