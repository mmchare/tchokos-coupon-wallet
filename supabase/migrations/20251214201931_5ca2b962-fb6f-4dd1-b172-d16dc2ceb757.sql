-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view referral codes" ON public.referral_codes;

-- Create restrictive policy: users can only view their own referral code
CREATE POLICY "Users can view their own referral code"
ON public.referral_codes
FOR SELECT
USING (auth.uid() = user_id);

-- Create secure function to validate referral codes without exposing user_id
-- Returns the referrer_id if valid, NULL if invalid (for internal use only)
CREATE OR REPLACE FUNCTION public.validate_referral_code(p_code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id 
  FROM public.referral_codes 
  WHERE code = p_code
  LIMIT 1
$$;

-- Create function to check if a referral code exists (returns boolean for client use)
CREATE OR REPLACE FUNCTION public.check_referral_code_exists(p_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.referral_codes 
    WHERE code = p_code
  )
$$;