-- Drop the security definer view and use RPC function instead (more secure)
DROP VIEW IF EXISTS public.admin_user_view;

-- Create secure function to get all users (admin only)
CREATE OR REPLACE FUNCTION public.get_all_users_for_admin()
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  notification_enabled boolean,
  whatsapp_number text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  role app_role
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if calling user is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  RETURN QUERY
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
END;
$$;

-- Create function to update user role (admin only)
CREATE OR REPLACE FUNCTION public.update_user_role(_target_user_id uuid, _new_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if calling user is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- Insert or update role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_target_user_id, _new_role)
  ON CONFLICT (user_id, role) 
  DO NOTHING;
  
  -- Remove other roles if changing to different role
  DELETE FROM public.user_roles 
  WHERE user_id = _target_user_id AND role != _new_role;
END;
$$;

-- Create function to update user profile (admin only)
CREATE OR REPLACE FUNCTION public.admin_update_profile(
  _target_user_id uuid, 
  _whatsapp_number text DEFAULT NULL,
  _notification_enabled boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if calling user is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  UPDATE public.profiles
  SET 
    whatsapp_number = COALESCE(_whatsapp_number, whatsapp_number),
    notification_enabled = COALESCE(_notification_enabled, notification_enabled),
    updated_at = now()
  WHERE id = _target_user_id;
END;
$$;