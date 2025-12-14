-- Modifier la fonction de génération de code parrainage pour 5 caractères plus mémorables
CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Sans I, O, 0, 1 pour éviter confusion
BEGIN
  LOOP
    -- Générer un code de 5 caractères facile à retenir
    v_code := '';
    FOR i IN 1..5 LOOP
      v_code := v_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    -- Vérifier si le code existe déjà
    SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE code = v_code) INTO v_exists;
    
    EXIT WHEN NOT v_exists;
  END LOOP;
  
  RETURN v_code;
END;
$function$;