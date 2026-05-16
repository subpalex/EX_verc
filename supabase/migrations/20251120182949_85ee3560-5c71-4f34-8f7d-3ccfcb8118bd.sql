-- Fix the handle_new_user function to match the actual profiles table schema
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert into profiles table (no email column - only full_name, role, market_name)
  INSERT INTO public.profiles (id, full_name, role, market_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'vendor'),
    new.raw_user_meta_data->>'market_name'
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