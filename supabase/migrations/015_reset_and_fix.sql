-- =============================================================
-- Reset test data + fix helper functions + recreate auth functions
-- =============================================================

-- 1. Enable pgcrypto (needed for gen_salt / crypt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Temporarily drop no-delete triggers for cleanup
DROP TRIGGER IF EXISTS protect_savings_transactions ON savings_transactions;
DROP TRIGGER IF EXISTS protect_journal_entries ON journal_entries;
DROP TRIGGER IF EXISTS protect_journal_entry_lines ON journal_entry_lines;

-- 3. Delete all app data in FK-safe order (keeps samiti_settings + chart_of_accounts)
DELETE FROM profit_distribution_items;
DELETE FROM profit_distributions;
DELETE FROM journal_entry_lines;
DELETE FROM journal_entries;
DELETE FROM loan_emi_schedule;
DELETE FROM loans;
DELETE FROM savings_transactions;
DELETE FROM savings_accounts;
DELETE FROM members;
DELETE FROM audit_log;

-- 4. Recreate no-delete triggers
CREATE TRIGGER protect_savings_transactions
  BEFORE DELETE ON savings_transactions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_delete();
CREATE TRIGGER protect_journal_entries
  BEFORE DELETE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_delete();
CREATE TRIGGER protect_journal_entry_lines
  BEFORE DELETE ON journal_entry_lines
  FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_delete();

-- 5. Recreate helper functions using auth.jwt() instead of auth.users queries
CREATE OR REPLACE FUNCTION public.user_samiti_id()
RETURNS UUID
LANGUAGE SQL STABLE
AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'samiti_id')::UUID;
$$;

CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT
LANGUAGE SQL STABLE
AS $$
  SELECT auth.jwt() -> 'user_metadata' ->> 'role';
$$;

CREATE OR REPLACE FUNCTION public.user_member_id()
RETURNS UUID
LANGUAGE SQL STABLE
AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'member_id')::UUID;
$$;

-- 6. Add UPDATE policy for society_admin on samiti_settings
DROP POLICY IF EXISTS admin_update_samiti ON samiti_settings;
CREATE POLICY admin_update_samiti ON samiti_settings
  FOR UPDATE USING (public.user_role() = 'society_admin' AND public.user_samiti_id() = id);

-- 7. Recreate: create_member_login (for creating member auth users)
DROP FUNCTION IF EXISTS public.create_member_login;
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

-- 8. Recreate: create_manager_login
DROP FUNCTION IF EXISTS public.create_manager_login;
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

-- 9. Recreate: list_samiti_users
DROP FUNCTION IF EXISTS public.list_samiti_users;
CREATE OR REPLACE FUNCTION public.list_samiti_users()
RETURNS TABLE(
  id UUID, email TEXT, role TEXT, name TEXT,
  member_id UUID, created_at TIMESTAMPTZ, last_sign_in_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_samiti_id UUID := public.user_samiti_id();
BEGIN
  IF public.user_role() NOT IN ('society_admin', 'super_admin') THEN
    RAISE EXCEPTION 'permission denied';
  END IF;
  RETURN QUERY
  SELECT u.id, u.email,
    (u.raw_user_meta_data ->> 'role')::TEXT,
    (u.raw_user_meta_data ->> 'name')::TEXT,
    (u.raw_user_meta_data ->> 'member_id')::UUID,
    u.created_at, u.last_sign_in_at
  FROM auth.users u
  WHERE u.raw_user_meta_data ->> 'samiti_id' = v_samiti_id::TEXT
    AND u.raw_user_meta_data ->> 'role' IN ('manager', 'member');
END;
$$;
