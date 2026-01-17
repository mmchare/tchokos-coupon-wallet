-- Phase 2: Corrections de sécurité RLS

-- 1. Ajouter des politiques RLS pour otp_codes (table critique sans protection)
-- D'abord, supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "System can manage otp codes" ON public.otp_codes;

-- Politique pour permettre l'insertion de codes OTP (via edge functions)
CREATE POLICY "Anyone can insert otp codes"
ON public.otp_codes
FOR INSERT
WITH CHECK (true);

-- Politique pour permettre la lecture des codes OTP (pour vérification)
CREATE POLICY "Anyone can read otp codes"
ON public.otp_codes
FOR SELECT
USING (true);

-- Politique pour permettre la mise à jour des codes OTP (pour marquer comme vérifié)
CREATE POLICY "Anyone can update otp codes"
ON public.otp_codes
FOR UPDATE
USING (true);

-- Politique pour permettre la suppression des codes OTP expirés
CREATE POLICY "Anyone can delete otp codes"
ON public.otp_codes
FOR DELETE
USING (true);

-- 2. Corriger la politique permissive sur referrals
-- La politique actuelle "System can insert referrals" avec WITH CHECK (true) est trop permissive
DROP POLICY IF EXISTS "System can insert referrals" ON public.referrals;

-- Nouvelle politique: seuls les utilisateurs authentifiés peuvent créer des referrals
-- et seulement si le referred_id correspond à leur propre ID
CREATE POLICY "Users can be referred"
ON public.referrals
FOR INSERT
WITH CHECK (auth.uid() = referred_id);

-- 3. Ajouter les index de performance
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON public.orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_logistics_step ON public.orders(logistics_step);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_product ON public.favorites(user_id, product_id);

-- 4. Créer une vue sécurisée pour les reviews publiques (masquer user_id)
CREATE OR REPLACE VIEW public.public_reviews AS
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