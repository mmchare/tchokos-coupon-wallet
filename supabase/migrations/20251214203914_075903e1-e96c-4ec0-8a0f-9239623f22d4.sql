-- Fix 1: Allow admins to read all profiles for campaigns
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (is_admin());

-- Fix 2: Allow admins to read referral codes for user management
CREATE POLICY "Admins can view all referral codes"
ON public.referral_codes
FOR SELECT
USING (is_admin());