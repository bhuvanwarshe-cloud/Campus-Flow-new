-- ============================================
-- ANNOUNCEMENTS TABLE
-- Teachers post announcements for their classes.
-- Students in enrolled classes can view them.
-- ============================================

CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL -- soft delete
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_announcements_class_id ON public.announcements(class_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON public.announcements(created_by);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Policy: Teachers can create announcements for their classes
CREATE POLICY "Teachers can insert announcements"
  ON public.announcements FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Anyone authenticated can view non-deleted announcements
CREATE POLICY "Authenticated users can view announcements"
  ON public.announcements FOR SELECT
  USING (auth.role() = 'authenticated' AND deleted_at IS NULL);

-- Policy: Creator can update their own announcements
CREATE POLICY "Creators can update own announcements"
  ON public.announcements FOR UPDATE
  USING (auth.uid() = created_by);

-- Policy: Creator can soft-delete (update deleted_at)
CREATE POLICY "Creators can delete own announcements"
  ON public.announcements FOR DELETE
  USING (auth.uid() = created_by);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_announcements_updated_at();

-- Enable Supabase Realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
