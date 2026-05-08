
CREATE TABLE public.seller_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 1000),
  phone_number TEXT NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('momo','orange')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  notchpay_reference TEXT,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);
CREATE INDEX idx_withdrawals_seller ON public.seller_withdrawals(seller_id);

ALTER TABLE public.seller_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers view own withdrawals"
  ON public.seller_withdrawals FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Sellers request withdrawals"
  ON public.seller_withdrawals FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid() AND verification_status = 'verified' AND COALESCE(is_suspended, false) = false)
  );

CREATE POLICY "Admins update withdrawals"
  ON public.seller_withdrawals FOR UPDATE USING (is_admin());

-- Safe debit function (used by withdrawal edge function via service role)
CREATE OR REPLACE FUNCTION public.debit_seller_wallet(p_seller_id UUID, p_amount NUMERIC)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_balance NUMERIC;
BEGIN
  SELECT available_balance INTO v_balance FROM public.seller_wallets WHERE seller_id = p_seller_id FOR UPDATE;
  IF v_balance IS NULL OR v_balance < p_amount THEN
    RETURN false;
  END IF;
  UPDATE public.seller_wallets SET available_balance = available_balance - p_amount, updated_at = now() WHERE seller_id = p_seller_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_seller_wallet(p_seller_id UUID, p_amount NUMERIC)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.seller_wallets SET available_balance = available_balance + p_amount, updated_at = now() WHERE seller_id = p_seller_id;
END;
$$;
