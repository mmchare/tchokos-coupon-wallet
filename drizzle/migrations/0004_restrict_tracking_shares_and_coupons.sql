DROP POLICY IF EXISTS "Anyone can view tracking shares" ON public.order_tracking_shares;
CREATE POLICY "Owners can view their tracking shares" ON public.order_tracking_shares FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_tracking_shares.order_id AND o.user_id = auth.uid()));

DROP POLICY IF EXISTS "Anyone can view shared coupons" ON public.shared_coupons;
CREATE POLICY "Creators can view their shared coupons" ON public.shared_coupons FOR SELECT TO authenticated
USING (auth.uid() = creator_id);

CREATE OR REPLACE FUNCTION public.get_tracking_share(p_token text)
RETURNS TABLE(order_id uuid, expires_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.order_id, s.expires_at FROM public.order_tracking_shares s
  WHERE s.share_token = p_token AND length(p_token) >= 16 LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.get_tracking_share(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_tracking_share(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_shared_coupon(p_code text)
RETURNS TABLE(items jsonb, expires_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.items, c.expires_at FROM public.shared_coupons c
  WHERE upper(c.code) = upper(btrim(p_code)) LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.get_shared_coupon(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_shared_coupon(text) TO anon, authenticated;