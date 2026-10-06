CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;
CREATE TABLE IF NOT EXISTS private.digital_keys (id int PRIMARY KEY DEFAULT 1, k text NOT NULL);
INSERT INTO private.digital_keys (id, k) VALUES (1, encode(extensions.gen_random_bytes(32), 'hex')) ON CONFLICT DO NOTHING;

CREATE TABLE public.digital_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  title text NOT NULL,
  description text,
  logo_url text,
  keywords text[] NOT NULL DEFAULT '{}',
  duration_months int NOT NULL DEFAULT 1 CHECK (duration_months > 0),
  profile_type text NOT NULL DEFAULT 'partagé' CHECK (profile_type IN ('partagé','complet')),
  price_fcfa numeric NOT NULL CHECK (price_fcfa >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.digital_products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.digital_products TO authenticated;
GRANT ALL ON public.digital_products TO service_role;
ALTER TABLE public.digital_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dp public read" ON public.digital_products FOR SELECT USING (is_active OR public.is_admin());
CREATE POLICY "dp admin write" ON public.digital_products FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER dp_updated BEFORE UPDATE ON public.digital_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.digital_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.digital_products(id) ON DELETE CASCADE,
  login text NOT NULL,
  password bytea NOT NULL,
  slots_total int NOT NULL DEFAULT 1 CHECK (slots_total > 0),
  slots_used int NOT NULL DEFAULT 0 CHECK (slots_used >= 0),
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'disponible' CHECK (status IN ('disponible','complet','expiré','en_panne')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.digital_accounts(product_id, status);
GRANT SELECT, UPDATE, DELETE ON public.digital_accounts TO authenticated;
GRANT ALL ON public.digital_accounts TO service_role;
REVOKE SELECT (password) ON public.digital_accounts FROM authenticated, anon;
ALTER TABLE public.digital_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "da admin" ON public.digital_accounts FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER da_updated BEFORE UPDATE ON public.digital_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.digital_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.digital_products(id),
  account_id uuid REFERENCES public.digital_accounts(id) ON DELETE SET NULL,
  slot_label text,
  price_fcfa numeric NOT NULL,
  whatsapp_number text,
  status text NOT NULL DEFAULT 'actif' CHECK (status IN ('actif','expiré','remboursé','en_panne')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  reminder_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.digital_orders(user_id);
CREATE INDEX ON public.digital_orders(account_id);
GRANT SELECT ON public.digital_orders TO authenticated;
GRANT UPDATE ON public.digital_orders TO authenticated;
GRANT ALL ON public.digital_orders TO service_role;
ALTER TABLE public.digital_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "do own read" ON public.digital_orders FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "do admin update" ON public.digital_orders FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.digital_orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message text NOT NULL CHECK (length(btrim(message)) BETWEEN 1 AND 2000),
  status text NOT NULL DEFAULT 'ouvert' CHECK (status IN ('ouvert','en_cours','résolu')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "st read" ON public.support_tickets FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "st insert own" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.digital_orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "st admin update" ON public.support_tickets FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER st_updated BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.admin_add_digital_account(p_product_id uuid, p_login text, p_password text, p_slots_total int, p_expires_at timestamptz)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_k text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  IF coalesce(btrim(p_login),'') = '' OR coalesce(p_password,'') = '' THEN RAISE EXCEPTION 'Identifiants requis'; END IF;
  SELECT k INTO v_k FROM private.digital_keys WHERE id = 1;
  INSERT INTO public.digital_accounts (product_id, login, password, slots_total, expires_at)
  VALUES (p_product_id, btrim(p_login), extensions.pgp_sym_encrypt(p_password, v_k), greatest(coalesce(p_slots_total,1),1), p_expires_at)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_digital_account_password(p_account_id uuid, p_password text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_k text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  SELECT k INTO v_k FROM private.digital_keys WHERE id = 1;
  UPDATE public.digital_accounts SET password = extensions.pgp_sym_encrypt(p_password, v_k) WHERE id = p_account_id;
END $$;

CREATE OR REPLACE FUNCTION public.get_digital_credentials(p_order_id uuid)
RETURNS TABLE(login text, password text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_k text;
BEGIN
  SELECT k INTO v_k FROM private.digital_keys WHERE id = 1;
  RETURN QUERY
  SELECT a.login, extensions.pgp_sym_decrypt(a.password, v_k)
  FROM public.digital_orders o JOIN public.digital_accounts a ON a.id = o.account_id
  WHERE o.id = p_order_id AND (o.user_id = auth.uid() OR public.is_admin())
    AND (public.is_admin() OR o.status = 'actif');
END $$;

CREATE OR REPLACE FUNCTION public.admin_get_account_password(p_account_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_k text; v text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  SELECT k INTO v_k FROM private.digital_keys WHERE id = 1;
  SELECT extensions.pgp_sym_decrypt(password, v_k) INTO v FROM public.digital_accounts WHERE id = p_account_id;
  RETURN v;
END $$;

-- Pick & lock an available account (internal)
CREATE OR REPLACE FUNCTION public._pick_digital_account(p_product_id uuid, p_exclude uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_months int;
BEGIN
  SELECT duration_months INTO v_months FROM public.digital_products WHERE id = p_product_id;
  SELECT id INTO v_id FROM public.digital_accounts
  WHERE product_id = p_product_id AND status = 'disponible' AND slots_used < slots_total
    AND expires_at > now() + make_interval(months => v_months)
    AND (p_exclude IS NULL OR id <> p_exclude)
  ORDER BY slots_used DESC, expires_at ASC
  LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF v_id IS NOT NULL THEN
    UPDATE public.digital_accounts SET slots_used = slots_used + 1,
      status = CASE WHEN slots_used + 1 >= slots_total THEN 'complet' ELSE status END
    WHERE id = v_id;
  END IF;
  RETURN v_id;
END $$;
REVOKE EXECUTE ON FUNCTION public._pick_digital_account(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.purchase_digital_product(p_product_id uuid, p_whatsapp text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_p record; v_bal numeric; v_acc uuid; v_order uuid; v_slot int; v_exp timestamptz;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('success', false, 'code', 'auth', 'error', 'Connectez-vous'); END IF;
  SELECT * INTO v_p FROM public.digital_products WHERE id = p_product_id AND is_active;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'code', 'not_found', 'error', 'Produit introuvable'); END IF;

  SELECT wallet_balance INTO v_bal FROM public.profiles WHERE id = v_user FOR UPDATE;
  IF coalesce(v_bal,0) < v_p.price_fcfa THEN
    RETURN jsonb_build_object('success', false, 'code', 'insufficient', 'error', 'Solde insuffisant', 'balance', coalesce(v_bal,0), 'price', v_p.price_fcfa);
  END IF;

  v_acc := public._pick_digital_account(p_product_id);
  IF v_acc IS NULL THEN RETURN jsonb_build_object('success', false, 'code', 'out_of_stock', 'error', 'Rupture de stock'); END IF;

  SELECT slots_used INTO v_slot FROM public.digital_accounts WHERE id = v_acc;
  v_exp := now() + make_interval(months => v_p.duration_months);

  UPDATE public.profiles SET wallet_balance = wallet_balance - v_p.price_fcfa WHERE id = v_user;
  INSERT INTO public.digital_orders (user_id, product_id, account_id, slot_label, price_fcfa, whatsapp_number, expires_at)
  VALUES (v_user, p_product_id, v_acc, 'Profil ' || v_slot, v_p.price_fcfa, nullif(btrim(p_whatsapp),''), v_exp)
  RETURNING id INTO v_order;
  INSERT INTO public.wallet_transactions (user_id, type, amount, description, payment_method, status, provider, provider_reference)
  VALUES (v_user, 'purchase', v_p.price_fcfa, 'Abonnement ' || v_p.platform || ' – ' || v_p.title, 'wallet', 'completed', 'digital', v_order::text);
  INSERT INTO public.notifications (user_id, message_type, message_body)
  VALUES (v_user, 'ABONNEMENT_NUMERIQUE', '✅ Votre abonnement ' || v_p.platform || ' est actif jusqu''au ' || to_char(v_exp, 'DD/MM/YYYY') || '.');

  RETURN jsonb_build_object('success', true, 'order_id', v_order, 'expires_at', v_exp);
END $$;

CREATE OR REPLACE FUNCTION public.admin_refund_digital_order(p_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_o record; v_amount numeric;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  SELECT * INTO v_o FROM public.digital_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_o.status IN ('remboursé') THEN RETURN jsonb_build_object('success', false, 'error', 'Commande non remboursable'); END IF;
  -- prorata of remaining time
  v_amount := round(v_o.price_fcfa * greatest(0, least(1,
    extract(epoch FROM (v_o.expires_at - now())) / nullif(extract(epoch FROM (v_o.expires_at - v_o.starts_at)),0))));
  UPDATE public.digital_orders SET status = 'remboursé' WHERE id = p_order_id;
  UPDATE public.profiles SET wallet_balance = wallet_balance + v_amount WHERE id = v_o.user_id;
  INSERT INTO public.wallet_transactions (user_id, type, amount, description, payment_method, status, provider, provider_reference)
  VALUES (v_o.user_id, 'refund', v_amount, 'Remboursement abonnement numérique', 'wallet', 'completed', 'digital', p_order_id::text);
  INSERT INTO public.notifications (user_id, message_type, message_body)
  VALUES (v_o.user_id, 'ABONNEMENT_NUMERIQUE', '💸 ' || v_amount || ' FCFA remboursés sur votre portefeuille.');
  PERFORM public.log_admin_action('refund_digital_order', 'digital_order', p_order_id::text, jsonb_build_object('amount', v_amount));
  RETURN jsonb_build_object('success', true, 'amount', v_amount);
END $$;

CREATE OR REPLACE FUNCTION public.admin_reassign_digital_order(p_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_o record; v_acc uuid; v_slot int;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  SELECT * INTO v_o FROM public.digital_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_o.status = 'remboursé' THEN RETURN jsonb_build_object('success', false, 'error', 'Commande invalide'); END IF;
  v_acc := public._pick_digital_account(v_o.product_id, v_o.account_id);
  IF v_acc IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Aucun compte disponible'); END IF;
  SELECT slots_used INTO v_slot FROM public.digital_accounts WHERE id = v_acc;
  UPDATE public.digital_orders SET account_id = v_acc, slot_label = 'Profil ' || v_slot, status = 'actif' WHERE id = p_order_id;
  INSERT INTO public.notifications (user_id, message_type, message_body)
  VALUES (v_o.user_id, 'ABONNEMENT_NUMERIQUE', '🔄 Votre abonnement a été transféré vers un nouveau compte. Consultez vos nouveaux identifiants dans Mes abonnements.');
  RETURN jsonb_build_object('success', true);
END $$;

-- when account goes en_panne, mark active orders
CREATE OR REPLACE FUNCTION public.on_digital_account_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'en_panne' AND OLD.status IS DISTINCT FROM 'en_panne' THEN
    UPDATE public.digital_orders SET status = 'en_panne' WHERE account_id = NEW.id AND status = 'actif';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_digital_account_status AFTER UPDATE ON public.digital_accounts FOR EACH ROW EXECUTE FUNCTION public.on_digital_account_status();

CREATE OR REPLACE FUNCTION public.search_digital_products(p_query text)
RETURNS SETOF public.digital_products LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT dp.* FROM public.digital_products dp
  WHERE dp.is_active AND length(btrim(p_query)) >= 2 AND (
    lower(dp.platform) LIKE '%' || lower(btrim(p_query)) || '%'
    OR lower(dp.title) LIKE '%' || lower(btrim(p_query)) || '%'
    OR EXISTS (SELECT 1 FROM unnest(dp.keywords) kw WHERE lower(kw) LIKE '%' || lower(btrim(p_query)) || '%' OR extensions.similarity(lower(kw), lower(btrim(p_query))) > 0.35)
    OR extensions.similarity(lower(dp.platform), lower(btrim(p_query))) > 0.3
    OR extensions.word_similarity(lower(btrim(p_query)), lower(dp.title)) > 0.4
  )
  ORDER BY extensions.similarity(lower(dp.platform), lower(btrim(p_query))) DESC, dp.price_fcfa ASC
  LIMIT 30;
$$;

CREATE OR REPLACE FUNCTION public.send_digital_expiry_reminders()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  WITH due AS (
    UPDATE public.digital_orders o SET reminder_sent_at = now()
    WHERE o.status = 'actif' AND o.reminder_sent_at IS NULL AND o.expires_at <= now() + interval '3 days' AND o.expires_at > now()
    RETURNING o.user_id, o.product_id, o.expires_at
  ), ins AS (
    INSERT INTO public.notifications (user_id, message_type, message_body)
    SELECT d.user_id, 'ABONNEMENT_NUMERIQUE', '⏰ Votre abonnement ' || p.platform || ' expire le ' || to_char(d.expires_at, 'DD/MM/YYYY') || '. Pensez à le renouveler.'
    FROM due d JOIN public.digital_products p ON p.id = d.product_id RETURNING 1
  ) SELECT count(*) INTO n FROM ins;
  UPDATE public.digital_orders SET status = 'expiré' WHERE status = 'actif' AND expires_at < now();
  UPDATE public.digital_accounts SET status = 'expiré' WHERE status IN ('disponible','complet') AND expires_at < now();
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.send_digital_expiry_reminders() FROM PUBLIC, anon, authenticated;

DO $$ BEGIN
  PERFORM cron.schedule('digital-expiry-reminders', '0 8 * * *', 'SELECT public.send_digital_expiry_reminders();');
EXCEPTION WHEN OTHERS THEN NULL; END $$;