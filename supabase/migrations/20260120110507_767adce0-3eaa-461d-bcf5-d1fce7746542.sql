-- Drop existing policies
DROP POLICY IF EXISTS "Users can delete their own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can update their own categories" ON public.categories;

-- Create new DELETE policy that allows deleting own categories OR default categories (user_id IS NULL)
CREATE POLICY "Users can delete their own categories" 
ON public.categories 
FOR DELETE 
USING (auth.uid() = user_id OR user_id IS NULL);

-- Create new UPDATE policy that allows updating own categories OR default categories (user_id IS NULL)
CREATE POLICY "Users can update their own categories" 
ON public.categories 
FOR UPDATE 
USING (auth.uid() = user_id OR user_id IS NULL);