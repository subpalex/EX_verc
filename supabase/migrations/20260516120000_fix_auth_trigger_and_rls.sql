-- ─── Fix 1: Add ON CONFLICT guards + exception handler to handle_new_user ─────
-- Without ON CONFLICT, a retry signup attempt (network hiccup, double-click)
-- crashes the trigger on the primary key, returning "database error saving new user".
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Upsert profile — safe against duplicate calls / retries
  INSERT INTO public.profiles (id, full_name, role, market_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'vendor'),
    new.raw_user_meta_data->>'market_name'
  )
  ON CONFLICT (id) DO UPDATE
    SET
      full_name   = COALESCE(EXCLUDED.full_name, profiles.full_name),
      role        = COALESCE(EXCLUDED.role, profiles.role),
      market_name = COALESCE(EXCLUDED.market_name, profiles.market_name);

  -- Upsert user role — safe against duplicates
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    new.id,
    COALESCE((new.raw_user_meta_data->>'role')::text::app_role, 'vendor')
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN new;

EXCEPTION WHEN OTHERS THEN
  -- Never block auth user creation even if profile upsert fails
  RAISE WARNING 'handle_new_user error for user %: %', new.id, SQLERRM;
  RETURN new;
END;
$$;

-- ─── Fix 2: Allow authenticated users to upsert their own profile ──────────────
-- This lets the frontend create a missing profile row after login as a recovery
-- path (e.g. users whose trigger failed on first signup).
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
