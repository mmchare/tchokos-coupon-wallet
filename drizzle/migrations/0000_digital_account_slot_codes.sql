ALTER TABLE public.digital_accounts ADD COLUMN slot_codes text[] NOT NULL DEFAULT '{}';
COMMENT ON COLUMN public.digital_accounts.slot_codes IS 'Code/info par place : slot_codes[1] = Profil 1, etc.';
ALTER TABLE public.digital_orders ADD COLUMN slot_index int;
COMMENT ON COLUMN public.digital_orders.slot_index IS 'Numéro de la place attribuée (1 = Profil 1)';

DROP FUNCTION IF EXISTS public.get_digital_credentials(uuid);

CREATE OR REPLACE FUNCTION public.admin_add_digital_account(p_product_id uuid, p_login text, p_password text, p_slots_total int, p_expires_at timestamptz, p_slot_codes text[] DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_k text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  IF coalesce(btrim(p_login),'') = '' OR coalesce(p_password,'') = '' THEN RAISE EXCEPTION 'Identifiants requis'; END IF;
  SELECT k INTO v_k FROM private.digital_keys WHERE id = 1;
  INSERT INTO public.digital_accounts (product_id, login, password, slots_total, expires_at, slot_codes)
  VALUES (p_product_id, btrim(p_login), extensions.pgp_sym_encrypt(p_password, v_k), greatest(coalesce(p_slots_total,1),1), p_expires_at, coalesce(p_slot_codes,'{}'))
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE FUNCTION public.get_digital_credentials(p_order_id uuid)
RETURNS TABLE(login text, password text, slot_code text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_k text;
BEGIN
  SELECT k INTO v_k FROM private.digital_keys WHERE id = 1;
  RETURN QUERY
  SELECT a.login, extensions.pgp_sym_decrypt(a.password, v_k),
         CASE WHEN o.slot_index IS NOT NULL THEN a.slot_codes[o.slot_index] ELSE NULL END
  FROM public.digital_orders o JOIN public.digital_accounts a ON a.id = o.account_id
  WHERE o.id = p_order_id AND (o.user_id = auth.uid() OR public.is_admin())
    AND (public.is_admin() OR o.status = 'actif');
END $$;
GRANT EXECUTE ON FUNCTION public.get_digital_credentials(uuid) TO authenticated;

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
  INSERT INTO public.digital_orders (user_id, product_id, account_id, slot_label, slot_index, price_fcfa, whatsapp_number, expires_at)
  VALUES (v_user, p_product_id, v_acc, 'Profil ' || v_slot, v_slot, v_p.price_fcfa, nullif(btrim(p_whatsapp),''), v_exp)
  RETURNING id INTO v_order;
  INSERT INTO public.wallet_transactions (user_id, type, amount, description, payment_method, status, provider, provider_reference)
  VALUES (v_user, 'purchase', v_p.price_fcfa, 'Abonnement ' || v_p.platform || ' – ' || v_p.title, 'wallet', 'completed', 'digital', v_order::text);
  INSERT INTO public.notifications (user_id, message_type, message_body)
  VALUES (v_user, 'ABONNEMENT_NUMERIQUE', '✅ Votre abonnement ' || v_p.platform || ' est actif jusqu''au ' || to_char(v_exp, 'DD/MM/YYYY') || '.');
  RETURN jsonb_build_object('success', true, 'order_id', v_order, 'expires_at', v_exp);
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
  UPDATE public.digital_orders SET account_id = v_acc, slot_label = 'Profil ' || v_slot, slot_index = v_slot, status = 'actif' WHERE id = p_order_id;
  INSERT INTO public.notifications (user_id, message_type, message_body)
  VALUES (v_o.user_id, 'ABONNEMENT_NUMERIQUE', '🔄 Votre abonnement a été transféré vers un nouveau compte. Consultez vos nouveaux identifiants dans Mes abonnements.');
  RETURN jsonb_build_object('success', true);
END $$;