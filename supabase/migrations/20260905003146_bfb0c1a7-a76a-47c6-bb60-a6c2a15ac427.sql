ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS provider_reference text;

CREATE INDEX IF NOT EXISTS wallet_transactions_provider_reference_idx
  ON public.wallet_transactions (provider_reference);

ALTER TABLE public.seller_withdrawals
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS provider_reference text;

CREATE INDEX IF NOT EXISTS seller_withdrawals_provider_reference_idx
  ON public.seller_withdrawals (provider_reference);