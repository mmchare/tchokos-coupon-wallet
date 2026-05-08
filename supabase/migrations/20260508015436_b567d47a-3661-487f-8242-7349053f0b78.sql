
DROP POLICY IF EXISTS "System can insert review notifications" ON public.notifications;
CREATE POLICY "System can insert review notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (message_type IN ('NOUVEL_AVIS','SIGNALEMENT','RETRAIT'));
