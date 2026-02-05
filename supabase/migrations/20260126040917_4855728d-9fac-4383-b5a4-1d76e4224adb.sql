-- Create or replace the trigger function to set trial_end_date on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, trial_end_date)
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'full_name',
    NOW() + INTERVAL '7 days'
  );
  RETURN new;
END;
$$;