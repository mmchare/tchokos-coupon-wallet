-- 1. Link support conversations to custom orders + resolution state
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS custom_order_id UUID REFERENCES public.custom_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_by UUID;

CREATE INDEX IF NOT EXISTS idx_conversations_custom_order ON public.conversations(custom_order_id);

-- 2. File attachments on messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS file_type TEXT;

-- 3. Admin visibility over support conversations
DROP POLICY IF EXISTS "Admins can view all conversations" ON public.conversations;
CREATE POLICY "Admins can view all conversations"
ON public.conversations FOR SELECT TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update conversations" ON public.conversations;
CREATE POLICY "Admins can update conversations"
ON public.conversations FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;
CREATE POLICY "Admins can view all messages"
ON public.messages FOR SELECT TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can send messages in any conversation" ON public.messages;
CREATE POLICY "Admins can send messages in any conversation"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (public.is_admin() AND sender_id = auth.uid());

DROP POLICY IF EXISTS "Admins can update messages" ON public.messages;
CREATE POLICY "Admins can update messages"
ON public.messages FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 4. Support conversation RPC linked to a custom order
CREATE OR REPLACE FUNCTION public.get_or_create_support_conversation(p_custom_order_id uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_admin uuid;
  v_conv uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF p_custom_order_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.custom_orders WHERE id = p_custom_order_id AND user_id = v_user) THEN
      RAISE EXCEPTION 'Demande introuvable';
    END IF;

    SELECT c.id INTO v_conv
    FROM public.conversations c
    WHERE c.buyer_id = v_user AND c.custom_order_id = p_custom_order_id
    ORDER BY c.last_message_at DESC
    LIMIT 1;
  ELSE
    SELECT c.id INTO v_conv
    FROM public.conversations c
    JOIN public.admin_users a ON a.user_id = c.seller_id
    WHERE c.buyer_id = v_user AND c.product_id IS NULL AND c.custom_order_id IS NULL
    ORDER BY c.last_message_at DESC
    LIMIT 1;
  END IF;

  IF v_conv IS NOT NULL THEN
    UPDATE public.conversations
      SET is_resolved = false, resolved_at = NULL, resolved_by = NULL
    WHERE id = v_conv AND is_resolved = true;
    RETURN v_conv;
  END IF;

  SELECT a.user_id INTO v_admin
  FROM public.admin_users a
  JOIN public.profiles p ON p.id = a.user_id
  WHERE a.user_id IS NOT NULL AND a.user_id <> v_user
  ORDER BY a.created_at
  LIMIT 1;

  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Aucun responsable disponible';
  END IF;

  INSERT INTO public.conversations (buyer_id, seller_id, product_id, custom_order_id)
  VALUES (v_user, v_admin, NULL, p_custom_order_id)
  RETURNING id INTO v_conv;

  RETURN v_conv;
END;
$function$;

-- 5. Admin resolve / reopen a support conversation
CREATE OR REPLACE FUNCTION public.set_conversation_resolved(p_conversation_id uuid, p_resolved boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  UPDATE public.conversations
  SET is_resolved = p_resolved,
      resolved_at = CASE WHEN p_resolved THEN now() ELSE NULL END,
      resolved_by = CASE WHEN p_resolved THEN auth.uid() ELSE NULL END
  WHERE id = p_conversation_id;

  RETURN jsonb_build_object('success', true, 'resolved', p_resolved);
END;
$function$;