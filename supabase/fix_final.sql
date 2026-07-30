-- =============================================================
-- FINAL FIX: recreate ALL functions with correct auth schema
-- =============================================================

-- 1. Clean up corrupted test user
DELETE FROM auth.identities WHERE identity_data->>'email' = 'wyzeekllc@gmail.com';
DELETE FROM auth.users WHERE email = 'wyzeekllc@gmail.com';

-- 2. Recreate create_manager_login with FULL identity_data
DROP FUNCTION IF EXISTS public.create_manager_login;
CREATE OR REPLACE FUNCTION public.create_manager_login(
  p_email TEXT, p_password TEXT, p_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
DECLARE
  v_user_id UUID := gen_random_uuid();
  v_samiti_id UUID := public.user_samiti_id();
BEGIN
  IF public.user_role() NOT IN ('society_admin', 'super_admin') THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, confirmation_sent_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, aud, role
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(), now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('role', 'manager', 'samiti_id', v_samiti_id, 'name', p_name),
    now(), now(),
    'authenticated', 'authenticated'
  );

  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    p_email,
    v_user_id,
    jsonb_build_object(
      'sub', v_user_id,
      'email', p_email,
      'email_verified', false,
      'phone_verified', false
    ),
    'email',
    now(), now(), now()
  );

  RETURN v_user_id;
END;
$$;

-- 3. Recreate create_member_login with FULL identity_data
DROP FUNCTION IF EXISTS public.create_member_login;
CREATE OR REPLACE FUNCTION public.create_member_login(
  p_email TEXT, p_password TEXT, p_member_id UUID, p_samiti_id UUID, p_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
DECLARE v_user_id UUID := gen_random_uuid();
BEGIN
  IF public.user_role() NOT IN ('society_admin', 'super_admin') THEN
    RAISE EXCEPTION 'permission denied';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM members WHERE id = p_member_id AND samiti_id = p_samiti_id AND status = 'active') THEN
    RAISE EXCEPTION 'member not found or not active';
  END IF;

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, confirmation_sent_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, aud, role
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(), now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('role', 'member', 'samiti_id', p_samiti_id, 'member_id', p_member_id, 'name', p_name),
    now(), now(),
    'authenticated', 'authenticated'
  );

  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    p_email,
    v_user_id,
    jsonb_build_object(
      'sub', v_user_id,
      'email', p_email,
      'email_verified', false,
      'phone_verified', false
    ),
    'email',
    now(), now(), now()
  );

  RETURN v_user_id;
END;
$$;

-- 4. Recreate list_samiti_users
DROP FUNCTION IF EXISTS public.list_samiti_users;
CREATE OR REPLACE FUNCTION public.list_samiti_users()
RETURNS TABLE(id UUID, email TEXT, role TEXT, name TEXT, member_id UUID, created_at TIMESTAMPTZ, last_sign_in_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
DECLARE v_samiti_id UUID := public.user_samiti_id();
BEGIN
  IF public.user_role() NOT IN ('society_admin', 'super_admin') THEN
    RAISE EXCEPTION 'permission denied';
  END IF;
  RETURN QUERY
  SELECT u.id, u.email::TEXT,
    (u.raw_user_meta_data ->> 'role')::TEXT,
    (u.raw_user_meta_data ->> 'name')::TEXT,
    (u.raw_user_meta_data ->> 'member_id')::UUID,
    u.created_at, u.last_sign_in_at
  FROM auth.users u
  WHERE u.raw_user_meta_data ->> 'samiti_id' = v_samiti_id::TEXT
    AND u.raw_user_meta_data ->> 'role' IN ('manager', 'member');
END;
$$;
