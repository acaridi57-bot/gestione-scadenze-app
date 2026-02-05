-- Add paid_amount column to reminders table for partial payments tracking
ALTER TABLE public.reminders 
ADD COLUMN paid_amount numeric DEFAULT 0;