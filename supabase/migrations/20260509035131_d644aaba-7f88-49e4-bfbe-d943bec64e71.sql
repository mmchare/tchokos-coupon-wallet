
-- Promo codes table
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  seller_id UUID REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  min_order_amount NUMERIC NOT NULL DEFAULT 0,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  max_uses_per_user INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_seller ON public.promo_codes(seller_id);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active promo codes"
ON public.promo_codes FOR SELECT
USING (is_active = true OR is_admin() OR (seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid())));

CREATE POLICY "Verified sellers can create their own promo codes"
ON public.promo_codes FOR INSERT
TO authenticated
WITH CHECK (
  (seller_id IS NOT NULL AND seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid() AND verification_status = 'verified'))
  OR is_admin()
);

CREATE POLICY "Sellers can update their own promo codes"
ON public.promo_codes FOR UPDATE
TO authenticated
USING (
  (seller_id IS NOT NULL AND seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid()))
  OR is_admin()
);

CREATE POLICY "Sellers can delete their own promo codes"
ON public.promo_codes FOR DELETE
TO authenticated
USING (
  (seller_id IS NOT NULL AND seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid()))
  OR is_admin()
);

CREATE TRIGGER update_promo_codes_updated_at
BEFORE UPDATE ON public.promo_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Promo code uses
CREATE TABLE IF NOT EXISTS public.promo_code_uses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  order_id UUID,
  discount_amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_uses_user ON public.promo_code_uses(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_uses_code ON public.promo_code_uses(promo_code_id);

ALTER TABLE public.promo_code_uses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own uses"
ON public.promo_code_uses FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Sellers view uses of their codes"
ON public.promo_code_uses FOR SELECT
TO authenticated
USING (promo_code_id IN (
  SELECT id FROM public.promo_codes 
  WHERE seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid())
));

CREATE POLICY "System inserts uses"
ON public.promo_code_uses FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Validation function
CREATE OR REPLACE FUNCTION public.validate_promo_code(
  p_code TEXT,
  p_user_id UUID,
  p_order_total NUMERIC
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo RECORD;
  v_user_uses INTEGER;
  v_discount NUMERIC;
BEGIN
  SELECT * INTO v_promo FROM public.promo_codes
  WHERE LOWER(code) = LOWER(p_code) AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Code promo introuvable');
  END IF;

  IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Code promo expiré');
  END IF;

  IF v_promo.max_uses IS NOT NULL AND v_promo.current_uses >= v_promo.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Code promo épuisé');
  END IF;

  IF p_order_total < v_promo.min_order_amount THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Montant minimum: ' || v_promo.min_order_amount || ' FCFA');
  END IF;

  SELECT COUNT(*) INTO v_user_uses FROM public.promo_code_uses
  WHERE promo_code_id = v_promo.id AND user_id = p_user_id;

  IF v_user_uses >= v_promo.max_uses_per_user THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Vous avez déjà utilisé ce code');
  END IF;

  IF v_promo.discount_type = 'percent' THEN
    v_discount := ROUND(p_order_total * v_promo.discount_value / 100);
  ELSE
    v_discount := LEAST(v_promo.discount_value, p_order_total);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'promo_code_id', v_promo.id,
    'code', v_promo.code,
    'discount_amount', v_discount,
    'discount_type', v_promo.discount_type,
    'discount_value', v_promo.discount_value,
    'description', v_promo.description
  );
END;
$$;

-- Consume function (called by create-order edge function)
CREATE OR REPLACE FUNCTION public.consume_promo_code(
  p_promo_code_id UUID,
  p_user_id UUID,
  p_order_id UUID,
  p_discount_amount NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.promo_code_uses (promo_code_id, user_id, order_id, discount_amount)
  VALUES (p_promo_code_id, p_user_id, p_order_id, p_discount_amount);

  UPDATE public.promo_codes
  SET current_uses = current_uses + 1
  WHERE id = p_promo_code_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_promo_code(TEXT, UUID, NUMERIC) FROM anon;
REVOKE EXECUTE ON FUNCTION public.consume_promo_code(UUID, UUID, UUID, NUMERIC) FROM anon, authenticated;
