-- Corrections de sécurité supplémentaires

-- 1. Supprimer la vue SECURITY DEFINER et la recréer en mode INVOKER (par défaut)
DROP VIEW IF EXISTS public.public_reviews;

-- Recréer la vue sans SECURITY DEFINER (utilise les permissions de l'utilisateur)
CREATE VIEW public.public_reviews 
WITH (security_invoker = true)
AS
SELECT 
  id,
  product_id,
  rating,
  user_name,
  comment,
  photos,
  is_verified_client,
  created_at
FROM public.reviews;

-- Accorder l'accès à la vue
GRANT SELECT ON public.public_reviews TO anon, authenticated;

-- 2. Supprimer les politiques permissives sur otp_codes et les recréer de manière plus restrictive
-- Les OTP sont gérés par des fonctions SECURITY DEFINER donc on peut garder RLS strict
DROP POLICY IF EXISTS "Anyone can insert otp codes" ON public.otp_codes;
DROP POLICY IF EXISTS "Anyone can read otp codes" ON public.otp_codes;
DROP POLICY IF EXISTS "Anyone can update otp codes" ON public.otp_codes;
DROP POLICY IF EXISTS "Anyone can delete otp codes" ON public.otp_codes;

-- Pas besoin de politiques RLS car les opérations sur otp_codes passent par des fonctions SECURITY DEFINER
-- Les fonctions create_otp_code, verify_otp_code et cleanup_expired_otps gèrent tout