-- Add trial_end_date column to profiles for 7-day trial tracking
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE;

-- Update comment for subscription_plan to reflect monthly-only
COMMENT ON COLUMN public.profiles.subscription_plan IS 'Subscription plan: monthly';