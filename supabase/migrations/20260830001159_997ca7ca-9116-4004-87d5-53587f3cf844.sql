CREATE OR REPLACE FUNCTION public.get_or_create_support_conversation()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_admin uuid;
  v_conv uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  -- Existing support conversation with any admin
  SELECT c.id INTO v_conv
  FROM public.conversations c
  JOIN public.admin_users a ON a.user_id = c.seller_id
  WHERE c.buyer_id = v_user AND c.product_id IS NULL
  ORDER BY c.last_message_at DESC
  LIMIT 1;

  IF v_conv IS NOT NULL THEN
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

  INSERT INTO public.conversations (buyer_id, seller_id, product_id)
  VALUES (v_user, v_admin, NULL)
  RETURNING id INTO v_conv;

  RETURN v_conv;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_support_conversation() TO authenticated;