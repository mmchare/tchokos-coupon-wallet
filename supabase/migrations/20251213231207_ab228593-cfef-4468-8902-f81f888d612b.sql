-- Remove the unique constraint on phone to allow empty values
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_phone_key;

-- Make phone column nullable and allow empty strings
ALTER TABLE public.profiles ALTER COLUMN phone DROP NOT NULL;

-- Update the trigger to handle null phone properly
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, wallet_balance)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(COALESCE(NEW.raw_user_meta_data ->> 'phone', ''), ''),
    0.00
  );
  RETURN NEW;
END;
$function$;