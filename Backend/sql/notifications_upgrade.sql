-- ============================================
-- PHASE 1: NOTIFICATIONS TABLE UPGRADE
-- ============================================

-- 1. Update the type constraint to allow new types
-- We drop the existing constraint first
DO $$ 
BEGIN
    ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
END $$;

-- 2. Add the new expanded constraint
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('assignment', 'test', 'announcement', 'info', 'warning', 'success', 'error'));

-- 3. Ensure is_read defaults to false (if not already)
ALTER TABLE public.notifications ALTER COLUMN is_read SET DEFAULT false;

-- 4. Enable Realtime for notifications (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
END $$;

-- 5. Add index for type if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
