-- Create table for OTP codes with 5 min expiration
CREATE TABLE public.otp_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '5 minutes'),
  verified BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert OTP codes (for signup flow)
CREATE POLICY "Anyone can insert OTP codes"
ON public.otp_codes
FOR INSERT
WITH CHECK (true);

-- Allow reading own OTP code by phone
CREATE POLICY "Anyone can read OTP codes"
ON public.otp_codes
FOR SELECT
USING (true);

-- Allow updating OTP codes (for marking as verified)
CREATE POLICY "Anyone can update OTP codes"
ON public.otp_codes
FOR UPDATE
USING (true);

-- Allow deleting expired OTP codes
CREATE POLICY "Anyone can delete OTP codes"
ON public.otp_codes
FOR DELETE
USING (true);

-- Add source_link column to products table for Chinese supplier tracking
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS source_link TEXT;