-- Make profile-avatars bucket public for direct URL access
UPDATE storage.buckets 
SET public = true 
WHERE id = 'profile-avatars';

-- Ensure storage policies allow public read
DROP POLICY IF EXISTS "Anyone can view profile avatars" ON storage.objects;
CREATE POLICY "Anyone can view profile avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-avatars');

-- Ensure authenticated users can manage their own avatars
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);