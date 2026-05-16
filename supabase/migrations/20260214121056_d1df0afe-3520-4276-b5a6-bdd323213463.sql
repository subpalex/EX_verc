
-- Fix 1: upload_logs RLS policies are all RESTRICTIVE (which means NO access since restrictive only narrows permissive policies, and there are none)
-- Drop all existing restrictive policies and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Officers can view all upload logs" ON public.upload_logs;
DROP POLICY IF EXISTS "Vendors can insert their own upload logs" ON public.upload_logs;
DROP POLICY IF EXISTS "Vendors can update their own upload logs" ON public.upload_logs;
DROP POLICY IF EXISTS "Vendors can view their own upload logs" ON public.upload_logs;

CREATE POLICY "Officers can view all upload logs"
ON public.upload_logs FOR SELECT
USING (has_role(auth.uid(), 'officer'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Vendors can insert their own upload logs"
ON public.upload_logs FOR INSERT
WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "Vendors can update their own upload logs"
ON public.upload_logs FOR UPDATE
USING (auth.uid() = vendor_id);

CREATE POLICY "Vendors can view their own upload logs"
ON public.upload_logs FOR SELECT
USING (auth.uid() = vendor_id);

-- Fix 2: Add unique constraint on upload_id so upsert works correctly
ALTER TABLE public.upload_logs ADD CONSTRAINT upload_logs_upload_id_unique UNIQUE (upload_id);
