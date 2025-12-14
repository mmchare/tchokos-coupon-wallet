-- Create table for shared coupons
CREATE TABLE public.shared_coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  items JSONB NOT NULL,
  creator_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days')
);

-- Enable RLS
ALTER TABLE public.shared_coupons ENABLE ROW LEVEL SECURITY;

-- Anyone can view shared coupons (to load them)
CREATE POLICY "Anyone can view shared coupons"
ON public.shared_coupons
FOR SELECT
USING (true);

-- Authenticated users can create shared coupons
CREATE POLICY "Authenticated users can create shared coupons"
ON public.shared_coupons
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Users can delete their own shared coupons
CREATE POLICY "Users can delete their own shared coupons"
ON public.shared_coupons
FOR DELETE
USING (auth.uid() = creator_id);

-- Create index for faster code lookups
CREATE INDEX idx_shared_coupons_code ON public.shared_coupons(code);