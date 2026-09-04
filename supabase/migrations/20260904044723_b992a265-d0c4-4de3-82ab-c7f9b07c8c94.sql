ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_message_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_message_type_check
  CHECK (length(btrim(message_type)) > 0);