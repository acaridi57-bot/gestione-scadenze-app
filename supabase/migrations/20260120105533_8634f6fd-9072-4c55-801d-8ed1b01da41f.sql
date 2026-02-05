-- Drop the existing delete policy that blocks default categories
DROP POLICY IF EXISTS "Users can delete their own categories" ON public.categories;

-- Create a new policy that allows users to delete ANY of their own categories (including defaults)
CREATE POLICY "Users can delete their own categories" 
ON public.categories 
FOR DELETE 
USING (auth.uid() = user_id);

-- Also update the update policy to allow modifying all categories
DROP POLICY IF EXISTS "Users can update their own categories" ON public.categories;

CREATE POLICY "Users can update their own categories" 
ON public.categories 
FOR UPDATE 
USING (auth.uid() = user_id);