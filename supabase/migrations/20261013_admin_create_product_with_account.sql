-- Create an atomic server-side function to insert a digital product and optionally an associated account in a single transaction.
-- This ensures we don't end up with a product without its account if account creation fails.

CREATE OR REPLACE FUNCTION public.admin_create_product_with_account(
  p_platform text,
  p_title text,
  p_description text DEFAULT NULL,
  p_logo_url text DEFAULT NULL,
  p_keywords text[] DEFAULT NULL,
  p_duration_months int DEFAULT 1,
  p_profile_type text DEFAULT 'partagé',
  p_price_fcfa numeric DEFAULT 0,
  p_is_active boolean DEFAULT true,

  p_account_login text DEFAULT NULL,
  p_account_password text DEFAULT NULL,
  p_account_slots_total int DEFAULT 1,
  p_account_expires_at timestamptz DEFAULT NULL,
  p_account_slot_codes text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_product_id uuid;
  v_account_id uuid := NULL;
  v_exp timestamptz := coalesce(p_account_expires_at, now());
BEGIN
  -- Only admins may call this
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  INSERT INTO public.digital_products (platform, title, description, logo_url, keywords, duration_months, profile_type, price_fcfa, is_active)
  VALUES (
    p_platform, p_title, p_description, p_logo_url, coalesce(p_keywords,'{}'), p_duration_months, p_profile_type, p_price_fcfa, p_is_active
  )
  RETURNING id INTO v_product_id;

  -- If account info provided, create the account using existing admin RPC (will inherit checks and encryption)
  IF coalesce(btrim(p_account_login),'') <> '' AND coalesce(p_account_password,'') IS NOT NULL THEN
    v_account_id := public.admin_add_digital_account(v_product_id, p_account_login, p_account_password, greatest(coalesce(p_account_slots_total,1),1), v_exp, p_account_slot_codes);
  END IF;

  RETURN jsonb_build_object('success', true, 'product_id', v_product_id, 'account_id', v_account_id);

EXCEPTION WHEN OTHERS THEN
  -- Bubble up the real error so client sees why it failed. The surrounding transaction will rollback.
  RAISE;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_create_product_with_account(text,text,text,text,text[],int,text,numeric,boolean,text,text,int,timestamptz,text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_product_with_account(text,text,text,text,text[],int,text,numeric,boolean,text,text,int,timestamptz,text[]) TO service_role;
REVOKE EXECUTE ON FUNCTION public.admin_create_product_with_account(text,text,text,text,text[],int,text,numeric,boolean,text,text,int,timestamptz,text[]) FROM anon;
