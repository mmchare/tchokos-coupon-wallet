-- Create table to store admin phone numbers
CREATE TABLE public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if current user is admin
-- This prevents RLS recursion and securely checks admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users au
    JOIN public.profiles p ON p.phone = au.phone
    WHERE p.id = auth.uid()
  )
$$;

-- Policy: Only admins can view admin_users table
CREATE POLICY "Only admins can view admin users"
ON public.admin_users
FOR SELECT
USING (public.is_admin());

-- Policy: Only admins can insert admin users
CREATE POLICY "Only admins can insert admin users"
ON public.admin_users
FOR INSERT
WITH CHECK (public.is_admin());

-- Policy: Only admins can delete admin users
CREATE POLICY "Only admins can delete admin users"
ON public.admin_users
FOR DELETE
USING (public.is_admin());