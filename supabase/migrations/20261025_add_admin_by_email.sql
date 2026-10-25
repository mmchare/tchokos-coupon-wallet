CREATE OR REPLACE FUNCTION public.add_admin_by_email(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_phone text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  IF p_email IS NULL OR btrim(p_email) = '' THEN
    RAISE EXCEPTION 'Email requis';
  END IF;

  SELECT au.id, p.phone
  INTO v_user_id, v_phone
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.id = au.id
  WHERE lower(au.email) = lower(btrim(p_email))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur introuvable pour cet email';
  END IF;

  IF v_phone IS NULL OR btrim(v_phone) = '' THEN
    RAISE EXCEPTION 'Ce compte n''a pas de téléphone renseigné dans le profil';
  END IF;

  INSERT INTO public.admin_users (user_id, phone)
  VALUES (v_user_id, v_phone)
  ON CONFLICT (user_id)
  DO UPDATE SET phone = EXCLUDED.phone
  RETURNING user_id INTO v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', lower(btrim(p_email))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_admin_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_admin_by_email(text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.add_admin_by_email(text) FROM anon;
