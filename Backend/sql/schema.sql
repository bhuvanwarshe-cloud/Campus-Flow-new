-- ============================================
-- CampusFlow Database Schema
-- PostgreSQL (via Supabase)
-- ============================================

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
-- Links to Supabase auth.users automatically
-- Created via INSERT trigger when user signs up

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- 2. ROLES TABLE
-- ============================================
-- Stores user roles: admin, teacher, student

CREATE TABLE IF NOT EXISTS public.roles (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Anyone can view roles"
  ON public.roles FOR SELECT
  USING (true);

-- ============================================
-- 3. STUDENTS TABLE
-- ============================================
-- Stores student records

CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);


CREATE INDEX IF NOT EXISTS idx_students_email ON public.students(email);
CREATE INDEX IF NOT EXISTS idx_students_created_by ON public.students(created_by);


ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Anyone can view students"
  ON public.students FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create students"
  ON public.students FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');


CREATE POLICY "Users can update own students"
  ON public.students FOR UPDATE
  USING (auth.uid() = created_by);


CREATE POLICY "Users can delete own students"
  ON public.students FOR DELETE
  USING (auth.uid() = created_by);

-- ============================================
-- 4. CLASSES TABLE
-- ============================================
-- Stores class/course records

CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);


CREATE INDEX IF NOT EXISTS idx_classes_created_by ON public.classes(created_by);


ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Anyone can view classes"
  ON public.classes FOR SELECT
  USING (true);


CREATE POLICY "Authenticated users can create classes"
  ON public.classes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');


CREATE POLICY "Users can update own classes"
  ON public.classes FOR UPDATE
  USING (auth.uid() = created_by);


CREATE POLICY "Users can delete own classes"
  ON public.classes FOR DELETE
  USING (auth.uid() = created_by);

-- ============================================
-- 5. ENROLLMENTS TABLE
-- ============================================
-- Links students to classes (many-to-many)

CREATE TABLE IF NOT EXISTS public.enrollments (
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (student_id, class_id)
);


CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class_id ON public.enrollments(class_id);


ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Anyone can view enrollments"
  ON public.enrollments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create enrollments"
  ON public.enrollments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete enrollments"
  ON public.enrollments FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles table
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for students table
CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for classes table
CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON public.classes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 6. SUBJECTS TABLE
-- ============================================
-- Stores subject information linked to classes

CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subjects_class_id ON public.subjects(class_id);

-- Enable RLS
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view subjects
CREATE POLICY "Anyone can view subjects"
  ON public.subjects FOR SELECT
  USING (true);

-- Policy: Authenticated users can create subjects
CREATE POLICY "Authenticated users can create subjects"
  ON public.subjects FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- 7. EXAMS TABLE
-- ============================================
-- Stores exam information linked to classes

CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  max_marks INT NOT NULL CHECK (max_marks > 0),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_exams_class_id ON public.exams(class_id);

-- Enable RLS
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view exams
CREATE POLICY "Anyone can view exams"
  ON public.exams FOR SELECT
  USING (true);

-- Policy: Authenticated users can create exams
CREATE POLICY "Authenticated users can create exams"
  ON public.exams FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- 8. MARKS TABLE
-- ============================================
-- Stores student marks with unique constraint per student-subject-exam combo

CREATE TABLE IF NOT EXISTS public.marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  marks_obtained INT NOT NULL CHECK (marks_obtained >= 0),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE(student_id, subject_id, exam_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_marks_student_id ON public.marks(student_id);
CREATE INDEX IF NOT EXISTS idx_marks_subject_id ON public.marks(subject_id);
CREATE INDEX IF NOT EXISTS idx_marks_exam_id ON public.marks(exam_id);
CREATE INDEX IF NOT EXISTS idx_marks_uploaded_by ON public.marks(uploaded_by);

-- Enable RLS
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view marks (authorization enforced at backend)
CREATE POLICY "Anyone can view marks"
  ON public.marks FOR SELECT
  USING (true);

-- Policy: Authenticated users can create marks
CREATE POLICY "Authenticated users can create marks"
  ON public.marks FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Authenticated users can update marks
CREATE POLICY "Authenticated users can update marks"
  ON public.marks FOR UPDATE
  WITH CHECK (auth.role() = 'authenticated');

-- Trigger for marks table
CREATE TRIGGER update_marks_updated_at
  BEFORE UPDATE ON public.marks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 9. TEACHER_CLASSES TABLE (Optional but Recommended)
-- ============================================
-- Links teachers to classes they teach

CREATE TABLE IF NOT EXISTS public.teacher_classes (
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  PRIMARY KEY (teacher_id, class_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_teacher_classes_teacher_id ON public.teacher_classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_classes_class_id ON public.teacher_classes(class_id);

-- Enable RLS
ALTER TABLE public.teacher_classes ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view teacher assignments
CREATE POLICY "Anyone can view teacher assignments"
  ON public.teacher_classes FOR SELECT
  USING (true);

-- Policy: Authenticated users can manage teacher assignments
CREATE POLICY "Authenticated users can manage assignments"
  ON public.teacher_classes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can remove assignments"
  ON public.teacher_classes FOR DELETE
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- USER PROFILES (NEW FEATURE)
-- ============================================

-- Main profiles table (common for students and teachers)
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher')),
  full_name TEXT NOT NULL,
  phone TEXT,
  profile_photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can update own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Authenticated users can create profiles (enforced in backend)
CREATE POLICY "Authenticated users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at timestamp
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- ============================================
-- STUDENT PROFILES (ROLE-SPECIFIC DATA)
-- ============================================

CREATE TABLE IF NOT EXISTS public.student_profiles (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  roll_no TEXT,
  class_id UUID REFERENCES public.classes(id),
  admission_year INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id ON public.student_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_class_id ON public.student_profiles(class_id);

-- Enable RLS for student profiles
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view own student profile
CREATE POLICY "Users can view own student profile"
  ON public.student_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can update own student profile
CREATE POLICY "Users can update own student profile"
  ON public.student_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Authenticated users can create
CREATE POLICY "Authenticated users can insert own student profile"
  ON public.student_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at timestamp
CREATE TRIGGER trigger_student_profiles_updated_at
  BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- ============================================
-- TEACHER PROFILES (ROLE-SPECIFIC DATA)
-- ============================================

CREATE TABLE IF NOT EXISTS public.teacher_profiles (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  department TEXT,
  qualification TEXT,
  experience_years INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_user_id ON public.teacher_profiles(user_id);

-- Enable RLS for teacher profiles
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view own teacher profile
CREATE POLICY "Users can view own teacher profile"
  ON public.teacher_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can update own teacher profile
CREATE POLICY "Users can update own teacher profile"
  ON public.teacher_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Authenticated users can create
CREATE POLICY "Authenticated users can insert own teacher profile"
  ON public.teacher_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at timestamp
CREATE TRIGGER trigger_teacher_profiles_updated_at
  BEFORE UPDATE ON public.teacher_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- ============================================
-- INITIAL DATA (OPTIONAL)
-- ============================================

-- Note: Replace with actual UUIDs from your Supabase auth users
-- Example: INSERT INTO public.roles (user_id, role) VALUES ('user-uuid-here', 'admin');
-- Example: INSERT INTO public.teacher_classes (teacher_id, class_id) VALUES ('teacher-uuid', 'class-uuid');

-- ============================================
-- END OF SCHEMA
-- ============================================
