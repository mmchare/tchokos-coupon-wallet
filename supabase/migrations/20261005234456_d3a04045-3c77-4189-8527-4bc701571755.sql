CREATE OR REPLACE FUNCTION public.complete_wallet_recharge(p_tx_id uuid, p_provider_ref text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid; v_amount numeric;
BEGIN
  UPDATE wallet_transactions
     SET status = 'completed', provider_reference = COALESCE(p_provider_ref, provider_reference)
   WHERE id = p_tx_id AND status = 'pending' AND type = 'recharge'
   RETURNING user_id, amount INTO v_user, v_amount;
  IF v_user IS NULL THEN RETURN false; END IF;
  UPDATE profiles SET wallet_balance = COALESCE(wallet_balance,0) + v_amount WHERE id = v_user;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.complete_wallet_recharge(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_wallet_recharge(uuid, text) TO service_role;
CREATE UNIQUE INDEX IF NOT EXISTS wallet_tx_provider_ref_uniq ON public.wallet_transactions(provider, provider_reference) WHERE provider_reference IS NOT NULL;