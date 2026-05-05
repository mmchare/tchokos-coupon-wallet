-- Auto-create notification on new chat message
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient_id UUID;
  v_sender_name TEXT;
  v_preview TEXT;
BEGIN
  SELECT CASE WHEN c.buyer_id = NEW.sender_id THEN c.seller_id ELSE c.buyer_id END
  INTO v_recipient_id
  FROM public.conversations c
  WHERE c.id = NEW.conversation_id;

  IF v_recipient_id IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(full_name, 'Quelqu''un') INTO v_sender_name
  FROM public.profiles WHERE id = NEW.sender_id;

  v_preview := COALESCE(NULLIF(NEW.content, ''), CASE WHEN NEW.image_url IS NOT NULL THEN '📷 Photo' ELSE '' END);
  IF length(v_preview) > 80 THEN v_preview := substring(v_preview, 1, 77) || '...'; END IF;

  INSERT INTO public.notifications (user_id, message_type, message_body)
  VALUES (v_recipient_id, 'NOUVEAU_MESSAGE', v_sender_name || ' : ' || v_preview);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_message ON public.messages;
CREATE TRIGGER trg_notify_new_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- Allow the trigger to insert notifications even though caller is not admin
DROP POLICY IF EXISTS "System can insert message notifications" ON public.notifications;
CREATE POLICY "System can insert message notifications"
ON public.notifications FOR INSERT
WITH CHECK (message_type = 'NOUVEAU_MESSAGE');