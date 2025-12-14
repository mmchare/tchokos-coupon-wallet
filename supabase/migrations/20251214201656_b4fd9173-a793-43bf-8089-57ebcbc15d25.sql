-- Add user_id column to admin_users for secure admin identification
ALTER TABLE public.admin_users 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Populate user_id from existing phone matches (for migration)
UPDATE public.admin_users au
SET user_id = p.id
FROM public.profiles p
WHERE p.phone = au.phone AND au.user_id IS NULL;

-- Create hardened is_admin() function that uses user_id directly
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = auth.uid()
  )
$$;

-- Add unique constraint on user_id to prevent duplicates
ALTER TABLE public.admin_users 
DROP CONSTRAINT IF EXISTS admin_users_user_id_key;

ALTER TABLE public.admin_users 
ADD CONSTRAINT admin_users_user_id_key UNIQUE (user_id);