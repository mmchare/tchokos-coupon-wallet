
-- 1. Subscription tier on seller_profiles
DO $$ BEGIN
  CREATE TYPE public.subscription_tier AS ENUM ('free', 'premium');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.seller_profiles
  ADD COLUMN IF NOT EXISTS subscription_tier public.subscription_tier NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- 2. Subscriptions table (history of payments)
CREATE TABLE IF NOT EXISTS public.seller_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL,
  user_id UUID NOT NULL,
  tier public.subscription_tier NOT NULL DEFAULT 'premium',
  amount NUMERIC NOT NULL DEFAULT 5000,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'active', -- active | expired | canceled | renewal_failed
  payment_method TEXT NOT NULL DEFAULT 'wallet',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_seller_subs_seller ON public.seller_subscriptions(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_subs_expires ON public.seller_subscriptions(expires_at) WHERE status = 'active';

ALTER TABLE public.seller_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers view own subscriptions" ON public.seller_subscriptions;
CREATE POLICY "Sellers view own subscriptions"
ON public.seller_subscriptions FOR SELECT TO authenticated
USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "Admins manage subscriptions" ON public.seller_subscriptions;
CREATE POLICY "Admins manage subscriptions"
ON public.seller_subscriptions FOR ALL TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

CREATE TRIGGER trg_seller_subs_updated
BEFORE UPDATE ON public.seller_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Helpers: tier + commission rate
CREATE OR REPLACE FUNCTION public.get_seller_tier(p_seller_id UUID)
RETURNS public.subscription_tier
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN sp.subscription_tier = 'premium' AND sp.subscription_expires_at IS NOT NULL AND sp.subscription_expires_at > now() THEN 'premium'::public.subscription_tier
    ELSE 'free'::public.subscription_tier
  END
  FROM public.seller_profiles sp
  WHERE sp.id = p_seller_id;
$$;

CREATE OR REPLACE FUNCTION public.get_seller_commission_rate(p_seller_id UUID)
RETURNS NUMERIC
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE WHEN public.get_seller_tier(p_seller_id) = 'premium' THEN 0.10 ELSE 0.20 END;
$$;

-- 4. Subscribe seller to premium (debit wallet)
CREATE OR REPLACE FUNCTION public.subscribe_seller_premium(p_auto_renew BOOLEAN DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_seller_id UUID;
  v_user_id UUID := auth.uid();
  v_current_expires TIMESTAMPTZ;
  v_new_expires TIMESTAMPTZ;
  v_amount NUMERIC := 5000;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  SELECT id, subscription_expires_at
    INTO v_seller_id, v_current_expires
  FROM public.seller_profiles
  WHERE user_id = v_user_id
    AND verification_status = 'verified'
    AND COALESCE(is_suspended, false) = false;

  IF v_seller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profil vendeur non vérifié');
  END IF;

  -- Debit from seller wallet
  IF NOT public.debit_seller_wallet(v_seller_id, v_amount) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solde portefeuille insuffisant (5000 FCFA requis)');
  END IF;

  -- Extend from current expiry if still active, else from now
  v_new_expires := GREATEST(COALESCE(v_current_expires, now()), now()) + interval '30 days';

  UPDATE public.seller_profiles
    SET subscription_tier = 'premium', subscription_expires_at = v_new_expires
  WHERE id = v_seller_id;

  INSERT INTO public.seller_subscriptions (seller_id, user_id, tier, amount, expires_at, auto_renew, status)
  VALUES (v_seller_id, v_user_id, 'premium', v_amount, v_new_expires, p_auto_renew, 'active');

  RETURN jsonb_build_object('success', true, 'expires_at', v_new_expires, 'amount', v_amount);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_premium_auto_renew()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INT;
BEGIN
  UPDATE public.seller_subscriptions
  SET auto_renew = false, updated_at = now()
  WHERE user_id = auth.uid() AND status = 'active'
  RETURNING 1 INTO v_count;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 5. Cron-friendly: auto-renew expired premium subs
CREATE OR REPLACE FUNCTION public.renew_premium_subscriptions()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r RECORD;
  v_renewed INT := 0;
  v_failed INT := 0;
  v_new_expires TIMESTAMPTZ;
BEGIN
  -- Expire those past expiry & not auto-renew
  UPDATE public.seller_profiles
    SET subscription_tier = 'free'
  WHERE subscription_tier = 'premium'
    AND subscription_expires_at IS NOT NULL
    AND subscription_expires_at < now()
    AND id NOT IN (
      SELECT seller_id FROM public.seller_subscriptions
      WHERE status = 'active' AND auto_renew = true
    );

  -- Renew those with auto_renew expiring within 24h
  FOR r IN
    SELECT s.* FROM public.seller_subscriptions s
    WHERE s.status = 'active' AND s.auto_renew = true
      AND s.expires_at <= now() + interval '1 day'
      AND s.expires_at > now() - interval '7 days'
  LOOP
    IF public.debit_seller_wallet(r.seller_id, r.amount) THEN
      v_new_expires := r.expires_at + interval '30 days';
      UPDATE public.seller_subscriptions SET status = 'expired' WHERE id = r.id;
      INSERT INTO public.seller_subscriptions (seller_id, user_id, tier, amount, expires_at, auto_renew, status, notes)
        VALUES (r.seller_id, r.user_id, 'premium', r.amount, v_new_expires, true, 'active', 'Auto-renouvelé');
      UPDATE public.seller_profiles SET subscription_expires_at = v_new_expires WHERE id = r.seller_id;
      INSERT INTO public.notifications (user_id, message_type, message_body)
        VALUES (r.user_id, 'ABONNEMENT', '✅ Abonnement Premium renouvelé pour 30 jours (5000 FCFA débités)');
      v_renewed := v_renewed + 1;
    ELSE
      UPDATE public.seller_subscriptions SET status = 'renewal_failed' WHERE id = r.id;
      UPDATE public.seller_profiles SET subscription_tier = 'free' WHERE id = r.seller_id;
      INSERT INTO public.notifications (user_id, message_type, message_body)
        VALUES (r.user_id, 'ABONNEMENT', '⚠️ Échec du renouvellement Premium (solde insuffisant). Vous êtes repassé en Free (commission 20%).');
      v_failed := v_failed + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('renewed', v_renewed, 'failed', v_failed);
END;
$$;

-- 6. Estimated delivery date
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS estimated_delivery_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.compute_eta_for_order()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.estimated_delivery_at IS NULL THEN
    NEW.estimated_delivery_at := NEW.created_at + 
      CASE WHEN NEW.shipping_mode = 'air' THEN interval '7 days' ELSE interval '21 days' END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_eta ON public.orders;
CREATE TRIGGER trg_order_eta
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.compute_eta_for_order();

-- Backfill existing orders
UPDATE public.orders
SET estimated_delivery_at = created_at + 
  CASE WHEN shipping_mode = 'air' THEN interval '7 days' ELSE interval '21 days' END
WHERE estimated_delivery_at IS NULL;

-- 7. Push notification on every step change (calls send-push-notification edge function)
CREATE OR REPLACE FUNCTION public.notify_push_on_step_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_step_label TEXT;
  v_steps TEXT[] := ARRAY['Commande confirmée', 'Préparation en Chine', 
    CASE WHEN NEW.shipping_mode = 'air' THEN 'En vol' ELSE 'En mer' END,
    'Livraison locale', 'Livré'];
BEGIN
  IF OLD.logistics_step IS DISTINCT FROM NEW.logistics_step AND NEW.logistics_step BETWEEN 1 AND 5 THEN
    v_step_label := v_steps[NEW.logistics_step];
    -- Best-effort push (pg_net), non-blocking
    BEGIN
      PERFORM net.http_post(
        url := 'https://xzilbjhrqbpedekuwghu.supabase.co/functions/v1/send-push-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := jsonb_build_object(
          'user_id', NEW.user_id,
          'title', '📦 Suivi JinBao',
          'body', '"' || COALESCE(NEW.product_name, 'Votre commande') || '" — ' || v_step_label,
          'url', '/orders'
        )
      );
    EXCEPTION WHEN OTHERS THEN
      NULL; -- swallow errors so order updates never fail
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_step_change ON public.orders;
CREATE TRIGGER trg_push_step_change
AFTER UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_push_on_step_change();
