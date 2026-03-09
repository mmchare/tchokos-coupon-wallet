
-- Table for quick sale listings
CREATE TABLE public.quick_sale_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price NUMERIC NOT NULL,
  images TEXT[] DEFAULT '{}'::text[],
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quick_sale_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own listings" ON public.quick_sale_listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own listings" ON public.quick_sale_listings FOR SELECT USING (auth.uid() = user_id OR status = 'active');
CREATE POLICY "Users can update their own listings" ON public.quick_sale_listings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own listings" ON public.quick_sale_listings FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all listings" ON public.quick_sale_listings FOR ALL USING (is_admin());

-- Table for custom orders / sourcing requests
CREATE TABLE public.custom_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_link TEXT,
  product_name TEXT NOT NULL,
  budget_min NUMERIC,
  budget_max NUMERIC,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create custom orders" ON public.custom_orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own custom orders" ON public.custom_orders FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Users can update their own pending orders" ON public.custom_orders FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Admins can update all custom orders" ON public.custom_orders FOR UPDATE USING (is_admin());
