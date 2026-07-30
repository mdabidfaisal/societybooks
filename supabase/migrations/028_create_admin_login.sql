-- Create admin login RPC for super admin panel
CREATE OR REPLACE FUNCTION public.create_admin_login(
  p_email TEXT,
  p_password TEXT,
  p_name TEXT,
  p_samiti_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id UUID := gen_random_uuid();
BEGIN
  IF public.user_role() != 'super_admin' THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM samiti_settings WHERE id = p_samiti_id) THEN
    RAISE EXCEPTION 'samiti not found';
  END IF;

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, confirmation_sent_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, aud, role,
    is_sso_user, is_anonymous
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(), now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object(
      'role', 'society_admin',
      'samiti_id', p_samiti_id,
      'name', p_name
    ),
    now(), now(),
    'authenticated', 'authenticated',
    false, false
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_user_id,
    jsonb_build_object('sub', v_user_id, 'email', p_email, 'email_verified', false, 'phone_verified', false),
    'email', v_user_id::text, now(), now(), now()
  );

  RETURN v_user_id;
END;
$$;

-- Also fix existing create_member_login and create_manager_login (missing provider_id)
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
SET search_path = 'public'
AS $$
DECLARE
  v_user_id UUID := gen_random_uuid();
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
    created_at, updated_at, aud, role,
    is_sso_user, is_anonymous
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(), now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object(
      'role', 'member',
      'samiti_id', p_samiti_id,
      'member_id', p_member_id,
      'name', p_name
    ),
    now(), now(),
    'authenticated', 'authenticated',
    false, false
  );
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_user_id,
    jsonb_build_object('sub', v_user_id, 'email', p_email, 'email_verified', false, 'phone_verified', false),
    'email', v_user_id::text, now(), now(), now()
  );
  RETURN v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_manager_login(
  p_email TEXT,
  p_password TEXT,
  p_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
    created_at, updated_at, aud, role,
    is_sso_user, is_anonymous
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(), now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object(
      'role', 'manager',
      'samiti_id', v_samiti_id,
      'name', p_name
    ),
    now(), now(),
    'authenticated', 'authenticated',
    false, false
  );
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_user_id,
    jsonb_build_object('sub', v_user_id, 'email', p_email, 'email_verified', false, 'phone_verified', false),
    'email', v_user_id::text, now(), now(), now()
  );
  RETURN v_user_id;
END;
$$;
