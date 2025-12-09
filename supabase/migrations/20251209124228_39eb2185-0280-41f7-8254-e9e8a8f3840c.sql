-- Phase 4: JinBao V2.0 Database Infrastructure

-- Products table with auction support
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  original_price NUMERIC,
  category TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_auction BOOLEAN NOT NULL DEFAULT false,
  auction_end_date TIMESTAMP WITH TIME ZONE,
  stock_available INTEGER NOT NULL DEFAULT 1,
  images TEXT[] DEFAULT '{}',
  video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bids table for auctions
CREATE TABLE public.bids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Orders table with logistics tracking
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  total_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  city TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  logistics_step INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Products: Public read, admin write
CREATE POLICY "Anyone can view products" 
ON public.products FOR SELECT 
USING (true);

CREATE POLICY "Only admins can insert products" 
ON public.products FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update products" 
ON public.products FOR UPDATE 
USING (is_admin());

CREATE POLICY "Only admins can delete products" 
ON public.products FOR DELETE 
USING (is_admin());

-- Bids: Users can create and view their own, admins can view all
CREATE POLICY "Users can view their own bids" 
ON public.bids FOR SELECT 
USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Authenticated users can create bids" 
ON public.bids FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Orders: Users can view/create their own, admins can manage all
CREATE POLICY "Users can view their own orders" 
ON public.orders FOR SELECT 
USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Authenticated users can create orders" 
ON public.orders FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update orders" 
ON public.orders FOR UPDATE 
USING (is_admin());

-- Enable realtime for bids (for auction feature)
ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();