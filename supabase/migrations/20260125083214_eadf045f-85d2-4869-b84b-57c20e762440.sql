-- Add Stripe subscription columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS subscription_plan TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.stripe_customer_id IS 'Stripe customer ID for billing';
COMMENT ON COLUMN public.profiles.subscription_status IS 'Subscription status: active, inactive';
COMMENT ON COLUMN public.profiles.subscription_plan IS 'Subscription plan: monthly, annual';