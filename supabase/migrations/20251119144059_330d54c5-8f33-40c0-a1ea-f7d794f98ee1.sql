-- Remove email column from profiles table since it's already in auth.users
-- This prevents email harvesting if officer accounts are compromised
ALTER TABLE profiles DROP COLUMN email;