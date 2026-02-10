-- Add duration column to user_activity for time-spent tracking
ALTER TABLE public.user_activity ADD COLUMN duration_seconds integer DEFAULT NULL;