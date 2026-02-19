-- ============================================
-- NOTIFICATIONS SYSTEM
-- ============================================

-- 1. Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK (type IN ('info', 'warning', 'success', 'error')) DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  link TEXT, -- Optional link to navigate to (e.g., /marks)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: System can insert notifications (via triggers or admin functions)
-- Note: In Supabase, triggers run with the privileges of the function owner (usually postgres/superuser)
-- or the user triggering the event. We'll ensure triggers act correctly.

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============================================
-- 2. AUTOMATION TRIGGERS
-- ============================================

-- Trigger Function: Notify Student on Mark Upload
CREATE OR REPLACE FUNCTION public.notify_mark_upload()
RETURNS TRIGGER AS $$
DECLARE
  student_id UUID;
  subject_name TEXT;
  exam_name TEXT;
BEGIN
  student_id := NEW.student_id;
  
  -- Get names
  SELECT name INTO subject_name FROM public.subjects WHERE id = NEW.subject_id;
  SELECT name INTO exam_name FROM public.exams WHERE id = NEW.exam_id;
  
  -- Insert Notification
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    student_id,
    'New Marks Uploaded',
    'You received ' || NEW.marks_obtained || ' marks in ' || subject_name || ' (' || exam_name || ').',
    'info',
    '/student/dashboard'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Trigger
DROP TRIGGER IF EXISTS on_mark_created ON public.marks;
CREATE TRIGGER on_mark_created
  AFTER INSERT ON public.marks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_mark_upload();

-- Trigger Function: Notify Student on Enrollment
CREATE OR REPLACE FUNCTION public.notify_enrollment()
RETURNS TRIGGER AS $$
DECLARE
  class_name TEXT;
BEGIN
  -- Get class name
  SELECT name INTO class_name FROM public.classes WHERE id = NEW.class_id;
  
  -- Insert Notification
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    NEW.student_id,
    'Enrollment Successful',
    'You have been successfully enrolled in ' || class_name || '.',
    'success',
    '/student/dashboard'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Trigger
DROP TRIGGER IF EXISTS on_enrollment_created ON public.enrollments;
CREATE TRIGGER on_enrollment_created
  AFTER INSERT ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_enrollment();
