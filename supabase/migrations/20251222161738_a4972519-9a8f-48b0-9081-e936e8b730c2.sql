-- Add UPDATE policy for storage objects (needed for resumable/chunked uploads)
CREATE POLICY "Vendors can update their own photos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'market-photos' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'market-photos' AND (auth.uid())::text = (storage.foldername(name))[1]);