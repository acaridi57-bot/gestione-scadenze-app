-- Create storage bucket for custom category icons
INSERT INTO storage.buckets (id, name, public)
VALUES ('category-icons', 'category-icons', true)
ON CONFLICT (id) DO NOTHING;

-- Allow users to view all category icons (public bucket)
CREATE POLICY "Category icons are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'category-icons');

-- Allow authenticated users to upload their own icons
CREATE POLICY "Users can upload their own category icons" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'category-icons' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to update their own icons
CREATE POLICY "Users can update their own category icons" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'category-icons' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own icons
CREATE POLICY "Users can delete their own category icons" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'category-icons' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add custom_icon_url column to categories table
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS custom_icon_url TEXT DEFAULT NULL;