-- Add whatsapp_number column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS whatsapp_number text;

-- Create a view to allow admins to see all profiles (for admin management)
CREATE OR REPLACE VIEW public.admin_user_view AS
SELECT 
  p.id,
  p.full_name,
  p.avatar_url,
  p.notification_enabled,
  p.whatsapp_number,
  p.created_at,
  p.updated_at,
  COALESCE(ur.role, 'user'::app_role) as role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id;

-- Grant access to authenticated users (RLS will control access)
GRANT SELECT ON public.admin_user_view TO authenticated;