-- Create plans table for installment tracking
CREATE TABLE public.plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  installments INTEGER NOT NULL CHECK (installments >= 1 AND installments <= 12),
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'yearly')),
  start_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on plans
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- RLS policies for plans
CREATE POLICY "Users can view their own plans"
ON public.plans FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plans"
ON public.plans FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own plans"
ON public.plans FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plans"
ON public.plans FOR DELETE
USING (auth.uid() = user_id);

-- Add installment tracking columns to transactions
ALTER TABLE public.transactions
ADD COLUMN plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
ADD COLUMN installment_index INTEGER,
ADD COLUMN installment_total INTEGER;