-- Indique au client où retrouver ses identifiants après un achat numérique
CREATE OR REPLACE FUNCTION public.purchase_digital_product(p_product_id uuid, p_whatsapp text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  VALUES (v_user, 'ABONNEMENT_NUMERIQUE',
    '✅ Votre abonnement ' || v_p.platform || ' est actif jusqu''au ' || to_char(v_exp, 'DD/MM/YYYY')
    || '. Ouvrez Profil → Mes abonnements pour voir votre email, votre mot de passe et votre code.');

  RETURN jsonb_build_object('success', true, 'order_id', v_order, 'expires_at', v_exp);
END
$function$;

GRANT EXECUTE ON FUNCTION public.purchase_digital_product(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_digital_product(uuid, text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.purchase_digital_product(uuid, text) FROM anon;