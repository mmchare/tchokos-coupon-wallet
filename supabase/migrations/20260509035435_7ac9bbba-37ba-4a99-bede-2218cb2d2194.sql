
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sponsored_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_products_sponsored_until ON public.products(sponsored_until DESC NULLS LAST);

CREATE OR REPLACE FUNCTION public.sponsor_product(p_product_id UUID, p_days INTEGER)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_id UUID;
  v_seller_profile_id UUID;
  v_cost NUMERIC;
  v_current_until TIMESTAMPTZ;
  v_new_until TIMESTAMPTZ;
BEGIN
  IF p_days <= 0 OR p_days > 30 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Durée invalide (1-30 jours)');
  END IF;

  SELECT seller_id, sponsored_until INTO v_seller_profile_id, v_current_until
  FROM public.products WHERE id = p_product_id;

  IF v_seller_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Produit introuvable ou sans vendeur');
  END IF;

  SELECT user_id INTO v_seller_id FROM public.seller_profiles
  WHERE id = v_seller_profile_id AND user_id = auth.uid()
    AND verification_status = 'verified' AND COALESCE(is_suspended, false) = false;

  IF v_seller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Non autorisé');
  END IF;

  v_cost := p_days * 500;

  IF NOT public.debit_seller_wallet(v_seller_profile_id, v_cost) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solde portefeuille insuffisant');
  END IF;

  v_new_until := GREATEST(COALESCE(v_current_until, now()), now()) + (p_days || ' days')::interval;

  UPDATE public.products SET sponsored_until = v_new_until WHERE id = p_product_id;

  RETURN jsonb_build_object('success', true, 'sponsored_until', v_new_until, 'cost', v_cost);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sponsor_product(UUID, INTEGER) FROM anon;
