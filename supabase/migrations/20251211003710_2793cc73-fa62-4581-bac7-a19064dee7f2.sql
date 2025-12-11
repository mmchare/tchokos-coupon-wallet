-- Add product_name column to orders table to store product name at order time
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS product_name TEXT;

-- Add product_image column to store the first image URL
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS product_image TEXT;