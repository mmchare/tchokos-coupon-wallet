-- Create categories table to store category metadata including icons
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT 'Package',
  bg_color TEXT NOT NULL DEFAULT 'bg-gray-100 dark:bg-gray-800/50',
  icon_color TEXT NOT NULL DEFAULT 'text-gray-600 dark:text-gray-400',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read categories
CREATE POLICY "Categories are viewable by everyone" 
ON public.categories 
FOR SELECT 
USING (true);

-- Only admins can manage categories
CREATE POLICY "Admins can insert categories" 
ON public.categories 
FOR INSERT 
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update categories" 
ON public.categories 
FOR UPDATE 
USING (public.is_admin());

CREATE POLICY "Admins can delete categories" 
ON public.categories 
FOR DELETE 
USING (public.is_admin());

-- Add trigger for updated_at
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories with icons and colors
INSERT INTO public.categories (name, icon, bg_color, icon_color) VALUES
  ('Électronique', 'Smartphone', 'bg-purple-100 dark:bg-purple-900/30', 'text-purple-600 dark:text-purple-400'),
  ('Mode & Vêtements', 'Shirt', 'bg-pink-100 dark:bg-pink-900/30', 'text-pink-600 dark:text-pink-400'),
  ('Maison & Jardin', 'Home', 'bg-green-100 dark:bg-green-900/30', 'text-green-600 dark:text-green-400'),
  ('Beauté & Santé', 'Sparkles', 'bg-rose-100 dark:bg-rose-900/30', 'text-rose-600 dark:text-rose-400'),
  ('Sport & Loisirs', 'Dumbbell', 'bg-orange-100 dark:bg-orange-900/30', 'text-orange-600 dark:text-orange-400'),
  ('Jouets & Enfants', 'Baby', 'bg-sky-100 dark:bg-sky-900/30', 'text-sky-600 dark:text-sky-400'),
  ('Accessoires', 'Watch', 'bg-teal-100 dark:bg-teal-900/30', 'text-teal-600 dark:text-teal-400'),
  ('Sacs & Bagages', 'Briefcase', 'bg-amber-100 dark:bg-amber-900/30', 'text-amber-600 dark:text-amber-400'),
  ('Montres & Bijoux', 'Gem', 'bg-violet-100 dark:bg-violet-900/30', 'text-violet-600 dark:text-violet-400'),
  ('Auto & Moto', 'Car', 'bg-slate-100 dark:bg-slate-900/30', 'text-slate-600 dark:text-slate-400'),
  ('Ordinateurs', 'Laptop', 'bg-indigo-100 dark:bg-indigo-900/30', 'text-indigo-600 dark:text-indigo-400'),
  ('Pixels', 'Smartphone', 'bg-cyan-100 dark:bg-cyan-900/30', 'text-cyan-600 dark:text-cyan-400'),
  ('Audio', 'Headphones', 'bg-fuchsia-100 dark:bg-fuchsia-900/30', 'text-fuchsia-600 dark:text-fuchsia-400'),
  ('Photo', 'Camera', 'bg-lime-100 dark:bg-lime-900/30', 'text-lime-600 dark:text-lime-400'),
  ('Gaming', 'Gamepad2', 'bg-red-100 dark:bg-red-900/30', 'text-red-600 dark:text-red-400')
ON CONFLICT (name) DO NOTHING;