CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Creates a Supabase Auth user for an existing member
-- Only society_admin and super_admin can call this
CREATE OR REPLACE FUNCTION public.create_member_login(
  p_email TEXT,
  p_password TEXT,
  p_member_id UUID,
  p_samiti_id UUID,
  p_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
DECLARE
  v_user_id UUID := gen_random_uuid();
BEGIN
  -- Check caller is admin
  IF public.user_role() NOT IN ('society_admin', 'super_admin') THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  -- Check member exists and is active
  IF NOT EXISTS (SELECT 1 FROM members WHERE id = p_member_id AND samiti_id = p_samiti_id AND status = 'active') THEN
    RAISE EXCEPTION 'member not found or not active';
  END IF;

  -- Create user in auth.users
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, confirmation_sent_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, aud, role
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(p_password, extensions.gen_salt('bf')),
    now(), now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object(
      'role', 'member',
      'samiti_id', p_samiti_id,
      'member_id', p_member_id,
      'name', p_name
    ),
    now(), now(),
    'authenticated',
    'authenticated'
  );

  -- Create identity entry for email provider login
  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    p_email,
    v_user_id,
    jsonb_build_object('sub', v_user_id, 'email', p_email),
    'email',
    now(), now(), now()
  );

  RETURN v_user_id;
END;
$$;
