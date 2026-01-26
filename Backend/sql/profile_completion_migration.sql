-- ====================================================================
-- Profile Completion Migration
-- Run this in Supabase SQL Editor
-- ====================================================================

-- 1. Update `profiles` (Common fields)
-- Add columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'first_name') THEN
        ALTER TABLE public.profiles ADD COLUMN first_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_name') THEN
        ALTER TABLE public.profiles ADD COLUMN last_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'dob') THEN
        ALTER TABLE public.profiles ADD COLUMN dob DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'address') THEN
        ALTER TABLE public.profiles ADD COLUMN address TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'profile_picture_url') THEN
        ALTER TABLE public.profiles ADD COLUMN profile_picture_url TEXT;
    END IF;
     IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_profile_complete') THEN
        ALTER TABLE public.profiles ADD COLUMN is_profile_complete BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Update `student_profiles`
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_profiles' AND column_name = 'first_name') THEN
        ALTER TABLE public.student_profiles ADD COLUMN first_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_profiles' AND column_name = 'last_name') THEN
        ALTER TABLE public.student_profiles ADD COLUMN last_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_profiles' AND column_name = 'branch') THEN
        ALTER TABLE public.student_profiles ADD COLUMN branch TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_profiles' AND column_name = 'degree') THEN
        ALTER TABLE public.student_profiles ADD COLUMN degree TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_profiles' AND column_name = 'registration_number') THEN
        ALTER TABLE public.student_profiles ADD COLUMN registration_number TEXT;
    END IF;
END $$;

-- 3. Update `teacher_profiles`
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teacher_profiles' AND column_name = 'first_name') THEN
        ALTER TABLE public.teacher_profiles ADD COLUMN first_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teacher_profiles' AND column_name = 'last_name') THEN
        ALTER TABLE public.teacher_profiles ADD COLUMN last_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teacher_profiles' AND column_name = 'subjects_taught') THEN
        ALTER TABLE public.teacher_profiles ADD COLUMN subjects_taught TEXT[]; -- Array of text
    END IF;
    -- Ensure qualification and experience are there (already in schema.sql but good to double check)
     IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teacher_profiles' AND column_name = 'qualification') THEN
        ALTER TABLE public.teacher_profiles ADD COLUMN qualification TEXT;
    END IF;
     IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teacher_profiles' AND column_name = 'experience_years') THEN
        ALTER TABLE public.teacher_profiles ADD COLUMN experience_years INT;
    END IF;
     IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teacher_profiles' AND column_name = 'department') THEN
        ALTER TABLE public.teacher_profiles ADD COLUMN department TEXT;
    END IF;
END $$;

-- 4. Storage Bucket (Manual setup usually required for permissions, but we can try to insert)
-- Note: 'storage' schema access requires special privileges. If this fails, user must do it manually.

-- Policy for Public Read of Profile Photos
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('profile-photos', 'profile-photos', true)
-- ON CONFLICT (id) DO NOTHING;

-- Policy: Authenticated users can upload their own profile photo
-- (Supabase Storage policies are distinct from SQL policies)

-- ====================================================================
-- HELPER: Function to check profile status
-- ====================================================================

create or replace function public.is_profile_complete(user_id uuid)
returns boolean
language plpgsql security definer
as $$
declare
  profile_complete boolean;
begin
  select is_profile_complete into profile_complete
  from public.profiles
  where id = user_id;
  
  return coalesce(profile_complete, false);
end;
$$;
