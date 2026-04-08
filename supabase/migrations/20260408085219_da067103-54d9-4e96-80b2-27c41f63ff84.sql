
-- Create seller verification status enum
CREATE TYPE public.seller_status AS ENUM ('pending', 'verified', 'rejected');

-- Create seller escrow status enum  
CREATE TYPE public.escrow_status AS ENUM ('held', 'released', 'refunded');

-- ============================================
-- 1. SELLER PROFILES
-- ============================================
CREATE TABLE public.seller_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  chinese_phone TEXT NOT NULL,
  chinese_phone_verified BOOLEAN NOT NULL DEFAULT false,
  residence_document_url TEXT,
  verification_status public.seller_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID,
  shop_name TEXT,
  shop_description TEXT,
  total_sales INTEGER NOT NULL DEFAULT 0,
  rating NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;

-- Function to check if user is a verified seller
CREATE OR REPLACE FUNCTION public.is_verified_seller(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.seller_profiles
    WHERE user_id = p_user_id
      AND verification_status = 'verified'
  )
$$;

-- Seller profiles policies
CREATE POLICY "Users can view verified seller profiles"
  ON public.seller_profiles FOR SELECT
  USING (verification_status = 'verified' OR auth.uid() = user_id OR is_admin());

CREATE POLICY "Authenticated users can apply as seller"
  ON public.seller_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending profile"
  ON public.seller_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND verification_status = 'pending');

CREATE POLICY "Admins can update any seller profile"
  ON public.seller_profiles FOR UPDATE
  USING (is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_seller_profiles_updated_at
  BEFORE UPDATE ON public.seller_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 2. SELLER WALLETS
-- ============================================
CREATE TABLE public.seller_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL UNIQUE REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  pending_balance NUMERIC NOT NULL DEFAULT 0.00,
  available_balance NUMERIC NOT NULL DEFAULT 0.00,
  total_earned NUMERIC NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view their own wallet"
  ON public.seller_wallets FOR SELECT
  TO authenticated
  USING (seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid()) OR is_admin());

CREATE POLICY "Only system can modify wallets"
  ON public.seller_wallets FOR UPDATE
  USING (is_admin());

CREATE POLICY "System creates wallet on seller verification"
  ON public.seller_wallets FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE TRIGGER update_seller_wallets_updated_at
  BEFORE UPDATE ON public.seller_wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 3. SELLER ESCROW
-- ============================================
CREATE TABLE public.seller_escrow (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id),
  gross_amount NUMERIC NOT NULL,
  commission_rate NUMERIC NOT NULL DEFAULT 0.20,
  commission_amount NUMERIC NOT NULL,
  net_amount NUMERIC NOT NULL,
  status public.escrow_status NOT NULL DEFAULT 'held',
  released_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_escrow ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view their own escrow"
  ON public.seller_escrow FOR SELECT
  TO authenticated
  USING (seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid()) OR is_admin());

CREATE POLICY "Only admins can manage escrow"
  ON public.seller_escrow FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Only admins can update escrow"
  ON public.seller_escrow FOR UPDATE
  USING (is_admin());

-- ============================================
-- 4. ADD seller_id TO PRODUCTS
-- ============================================
ALTER TABLE public.products ADD COLUMN seller_id UUID REFERENCES public.seller_profiles(id);

-- Update products RLS: verified sellers can manage their own products
CREATE POLICY "Verified sellers can insert their own products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (
    seller_id IS NOT NULL 
    AND seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid() AND verification_status = 'verified')
  );

CREATE POLICY "Sellers can update their own products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (
    seller_id IS NOT NULL 
    AND seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Sellers can delete their own products"
  ON public.products FOR DELETE
  TO authenticated
  USING (
    seller_id IS NOT NULL 
    AND seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid())
  );

-- ============================================
-- 5. AUTO-CREATE WALLET ON SELLER VERIFICATION
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_seller_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.verification_status = 'verified' AND OLD.verification_status != 'verified' THEN
    INSERT INTO public.seller_wallets (seller_id)
    VALUES (NEW.id)
    ON CONFLICT (seller_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_seller_verified
  AFTER UPDATE ON public.seller_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_seller_verified();

-- ============================================
-- 6. AUTO-RELEASE ESCROW AT LOGISTICS STEP 3
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_escrow_release()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_escrow RECORD;
BEGIN
  IF NEW.logistics_step >= 3 AND OLD.logistics_step < 3 THEN
    FOR v_escrow IN 
      SELECT * FROM public.seller_escrow 
      WHERE order_id = NEW.id AND status = 'held'
    LOOP
      -- Release escrow
      UPDATE public.seller_escrow 
      SET status = 'released', released_at = now()
      WHERE id = v_escrow.id;
      
      -- Credit seller wallet
      UPDATE public.seller_wallets
      SET 
        pending_balance = pending_balance - v_escrow.net_amount,
        available_balance = available_balance + v_escrow.net_amount,
        total_earned = total_earned + v_escrow.net_amount
      WHERE seller_id = v_escrow.seller_id;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_order_step_3_release_escrow
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_escrow_release();
