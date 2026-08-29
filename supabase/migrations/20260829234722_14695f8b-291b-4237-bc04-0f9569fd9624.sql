CREATE OR REPLACE FUNCTION public.verify_admin_password(input_password text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN input_password = '@xyzCharec14411441';
END;
$function$;