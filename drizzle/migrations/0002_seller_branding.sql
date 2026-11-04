ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS avatar_url text, ADD COLUMN IF NOT EXISTS cover_url text;

CREATE OR REPLACE FUNCTION public.update_seller_branding(p_avatar_url text, p_cover_url text, p_shop_description text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  UPDATE public.seller_profiles
     SET avatar_url = p_avatar_url, cover_url = p_cover_url,
         shop_description = left(coalesce(p_shop_description, shop_description), 500),
         updated_at = now()
   WHERE user_id = auth.uid();
END $$;
REVOKE ALL ON FUNCTION public.update_seller_branding(text,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.update_seller_branding(text,text,text) TO authenticated;