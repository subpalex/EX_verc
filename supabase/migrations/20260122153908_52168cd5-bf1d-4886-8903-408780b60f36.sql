-- Create upload_logs table for tracking upload attempts and failures
CREATE TABLE public.upload_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  upload_id TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  status TEXT NOT NULL CHECK (status IN ('pending', 'uploading', 'success', 'failed')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  storage_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.upload_logs ENABLE ROW LEVEL SECURITY;

-- Vendors can insert their own upload logs
CREATE POLICY "Vendors can insert their own upload logs"
ON public.upload_logs
FOR INSERT
WITH CHECK (auth.uid() = vendor_id);

-- Vendors can view their own upload logs
CREATE POLICY "Vendors can view their own upload logs"
ON public.upload_logs
FOR SELECT
USING (auth.uid() = vendor_id);

-- Vendors can update their own upload logs
CREATE POLICY "Vendors can update their own upload logs"
ON public.upload_logs
FOR UPDATE
USING (auth.uid() = vendor_id);

-- Officers can view all upload logs
CREATE POLICY "Officers can view all upload logs"
ON public.upload_logs
FOR SELECT
USING (has_role(auth.uid(), 'officer'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_upload_logs_vendor_id ON public.upload_logs(vendor_id);
CREATE INDEX idx_upload_logs_status ON public.upload_logs(status);
CREATE INDEX idx_upload_logs_created_at ON public.upload_logs(created_at DESC);