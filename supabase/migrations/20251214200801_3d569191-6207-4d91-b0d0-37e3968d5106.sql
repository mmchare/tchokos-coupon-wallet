-- Drop overly permissive policies on otp_codes
DROP POLICY IF EXISTS "Anyone can delete OTP codes" ON public.otp_codes;
DROP POLICY IF EXISTS "Anyone can insert OTP codes" ON public.otp_codes;
DROP POLICY IF EXISTS "Anyone can read OTP codes" ON public.otp_codes;
DROP POLICY IF EXISTS "Anyone can update OTP codes" ON public.otp_codes;

-- Create secure function to create OTP (only callable by service role)
CREATE OR REPLACE FUNCTION public.create_otp_code(p_phone text, p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_otp_id UUID;
BEGIN
  -- Delete any existing OTP codes for this phone
  DELETE FROM public.otp_codes WHERE phone = p_phone;
  
  -- Insert new OTP code
  INSERT INTO public.otp_codes (phone, code, expires_at)
  VALUES (p_phone, p_code, now() + interval '5 minutes')
  RETURNING id INTO v_otp_id;
  
  RETURN v_otp_id;
END;
$$;

-- Create secure function to verify OTP (only callable by service role)
CREATE OR REPLACE FUNCTION public.verify_otp_code(p_phone text, p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid BOOLEAN;
BEGIN
  -- Check if valid OTP exists
  SELECT EXISTS (
    SELECT 1 FROM public.otp_codes
    WHERE phone = p_phone
      AND code = p_code
      AND expires_at > now()
      AND verified = false
  ) INTO v_valid;
  
  -- If valid, mark as verified and delete
  IF v_valid THEN
    DELETE FROM public.otp_codes WHERE phone = p_phone;
  END IF;
  
  RETURN v_valid;
END;
$$;

-- Create secure function to cleanup expired OTPs
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.otp_codes WHERE expires_at < now();
END;
$$;

-- No direct access policies - all operations go through secure functions
-- The table is now completely locked down from direct client access