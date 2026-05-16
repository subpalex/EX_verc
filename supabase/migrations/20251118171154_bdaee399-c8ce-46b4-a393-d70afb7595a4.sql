-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('vendor', 'officer', 'admin');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Migrate existing roles from profiles to user_roles (convert via text)
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::text::app_role
FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- Drop the problematic recursive policies on profiles
DROP POLICY IF EXISTS "Officers can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create new non-recursive policies on profiles using has_role
CREATE POLICY "Officers can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'officer') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Add missing INSERT policy on profiles
CREATE POLICY "Service role can insert profiles"
  ON public.profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Update market_photos policies to use has_role
DROP POLICY IF EXISTS "Officers can view all photos" ON public.market_photos;
DROP POLICY IF EXISTS "Officers can update photo status" ON public.market_photos;

CREATE POLICY "Officers can view all photos"
  ON public.market_photos
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'officer') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Officers can update photo status"
  ON public.market_photos
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'officer') OR 
    public.has_role(auth.uid(), 'admin')
  );

-- Update weekly_rankings policies to use has_role
DROP POLICY IF EXISTS "Officers can manage rankings" ON public.weekly_rankings;

CREATE POLICY "Officers can manage rankings"
  ON public.weekly_rankings
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'officer') OR 
    public.has_role(auth.uid(), 'admin')
  );

-- Add RLS policies on user_roles table
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Officers can view all user roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'officer') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Service role can manage user roles"
  ON public.user_roles
  FOR ALL
  TO service_role
  WITH CHECK (true);

-- Update handle_new_user function to use user_roles table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'vendor')
  );
  
  -- Insert into user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    new.id,
    COALESCE((new.raw_user_meta_data->>'role')::text::app_role, 'vendor')
  );
  
  RETURN new;
END;
$$;