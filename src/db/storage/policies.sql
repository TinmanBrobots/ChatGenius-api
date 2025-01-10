-- Drop existing policies
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can download files from channels they are members of" ON storage.objects');
  EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects');
  EXECUTE format('DROP POLICY IF EXISTS "Users can delete their own files or if they are channel admins" ON storage.objects');
END $$;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create download policy
CREATE POLICY "Authenticated users can download files from channels they are members of" ON storage.objects
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.channel_members cm
    JOIN public.files f ON f.channel_id = cm.channel_id
    WHERE 
      cm.profile_id = auth.uid() 
      AND f.storage_path = storage.objects.name
  )
);

-- Create upload policy
CREATE POLICY "Authenticated users can upload files" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'files'
);

-- Create delete policy
CREATE POLICY "Users can delete their own files or if they are channel admins" ON storage.objects
FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.files f
    JOIN public.channel_members cm ON cm.channel_id = f.channel_id
    WHERE 
      f.storage_path = storage.objects.name
      AND (
        f.uploader_id = auth.uid()
        OR (cm.profile_id = auth.uid() AND cm.role IN ('admin', 'owner'))
      )
  )
); 