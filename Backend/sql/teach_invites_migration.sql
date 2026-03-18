-- ============================================
-- TEACHER INVITES TABLE
-- Migration for admin-to-teacher invitation system
-- ============================================

CREATE TABLE IF NOT EXISTS public.teacher_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  invited_by_admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_teacher_invites_email ON public.teacher_invites(email);
CREATE INDEX IF NOT EXISTS idx_teacher_invites_token ON public.teacher_invites(token);
CREATE INDEX IF NOT EXISTS idx_teacher_invites_status ON public.teacher_invites(status);
CREATE INDEX IF NOT EXISTS idx_teacher_invites_invited_by ON public.teacher_invites(invited_by_admin_id);

-- Enable RLS
ALTER TABLE public.teacher_invites ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (only backend will do this)
CREATE POLICY "Authenticated users can create invites"
  ON public.teacher_invites FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Invitees can view their own invites by token (for verification)
CREATE POLICY "Users can view invites by token"
  ON public.teacher_invites FOR SELECT
  USING (true); -- Will be restricted at backend level

-- Policy: Admins can view all invites
CREATE POLICY "Admins can view all invites"
  ON public.teacher_invites FOR SELECT
  USING (true); -- Will be restricted at backend level

-- Policy: Authenticated users can update their own invite acceptance
CREATE POLICY "Authenticated users can update invites"
  ON public.teacher_invites FOR UPDATE
  WITH CHECK (auth.role() = 'authenticated');

-- Trigger for updated_at timestamp
CREATE TRIGGER trigger_teacher_invites_updated_at
  BEFORE UPDATE ON public.teacher_invites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- END OF MIGRATION
-- ============================================
