-- =============================================================
-- COMPLETE FIX: Recreate all functions with correct auth schema
-- Matches working super_admin record exactly
-- =============================================================

-- 1. Helper functions (JWT-based)
CREATE OR REPLACE FUNCTION public.user_samiti_id()
RETURNS UUID LANGUAGE SQL STABLE AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'samiti_id')::UUID;
$$;

CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT LANGUAGE SQL STABLE AS $$
  SELECT auth.jwt() -> 'user_metadata' ->> 'role';
$$;

CREATE OR REPLACE FUNCTION public.user_member_id()
RETURNS UUID LANGUAGE SQL STABLE AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'member_id')::UUID;
$$;

-- 2. list_samiti_users
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
  SELECT u.id, u.email::TEXT, (u.raw_user_meta_data ->> 'role')::TEXT,
    (u.raw_user_meta_data ->> 'name')::TEXT, (u.raw_user_meta_data ->> 'member_id')::UUID,
    u.created_at, u.last_sign_in_at
  FROM auth.users u
  WHERE u.raw_user_meta_data ->> 'samiti_id' = v_samiti_id::TEXT
    AND u.raw_user_meta_data ->> 'role' IN ('manager', 'member');
END;
$$;

-- 3. create_manager_login
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

  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, confirmation_sent_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role, is_sso_user, is_anonymous)
  VALUES (v_user_id, p_email, crypt(p_password, gen_salt('bf')), now(), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('role', 'manager', 'samiti_id', v_samiti_id, 'name', p_name), now(), now(), 'authenticated', 'authenticated', false, false);

  INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), v_user_id, v_user_id, jsonb_build_object('sub', v_user_id, 'email', p_email, 'email_verified', false, 'phone_verified', false), 'email', now(), now(), now());

  RETURN v_user_id;
END;
$$;

-- 4. create_member_login
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

  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, confirmation_sent_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role, is_sso_user, is_anonymous)
  VALUES (v_user_id, p_email, crypt(p_password, gen_salt('bf')), now(), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('role', 'member', 'samiti_id', p_samiti_id, 'member_id', p_member_id, 'name', p_name), now(), now(), 'authenticated', 'authenticated', false, false);

  INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), v_user_id, v_user_id, jsonb_build_object('sub', v_user_id, 'email', p_email, 'email_verified', false, 'phone_verified', false), 'email', now(), now(), now());

  RETURN v_user_id;
END;
$$;

-- 5. provision_samiti
DROP FUNCTION IF EXISTS public.provision_samiti;
CREATE OR REPLACE FUNCTION public.provision_samiti(
  p_samiti_name TEXT, p_samiti_code TEXT, p_admin_email TEXT, p_admin_password TEXT, p_admin_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
DECLARE
  v_samiti_id UUID := gen_random_uuid();
  v_user_id UUID := gen_random_uuid();
BEGIN
  IF public.user_role() != 'super_admin' THEN
    RAISE EXCEPTION 'Only super_admin can provision new samitis';
  END IF;
  IF EXISTS (SELECT 1 FROM samiti_settings WHERE samiti_code = p_samiti_code) THEN
    RAISE EXCEPTION 'Samiti code already exists';
  END IF;

  INSERT INTO samiti_settings (id, samiti_name, samiti_code, shares_enabled, share_value, default_profit_method, default_profit_rate)
  VALUES (v_samiti_id, p_samiti_name, p_samiti_code, false, 0, 'reducing_balance', 12.00);

  INSERT INTO chart_of_accounts (samiti_id, account_code, account_name, account_type, is_system) VALUES
    (v_samiti_id, '1001', 'Cash & Bank', 'asset', true),
    (v_samiti_id, '1002', 'Loans Receivable', 'asset', true),
    (v_samiti_id, '2001', 'Member Savings', 'liability', true),
    (v_samiti_id, '2002', 'Profit Payable', 'liability', true),
    (v_samiti_id, '3001', 'Retained Earnings', 'equity', true),
    (v_samiti_id, '4001', 'Loan Profit Income', 'income', true),
    (v_samiti_id, '4002', 'Savings Profit Income', 'income', true),
    (v_samiti_id, '4003', 'Other Income', 'income', true),
    (v_samiti_id, '5001', 'Operating Expense', 'expense', true),
    (v_samiti_id, '5002', 'Administrative Expense', 'expense', true);

  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, confirmation_sent_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role, is_sso_user, is_anonymous)
  VALUES (v_user_id, p_admin_email, crypt(p_admin_password, gen_salt('bf')), now(), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('role', 'society_admin', 'samiti_id', v_samiti_id, 'name', p_admin_name), now(), now(), 'authenticated', 'authenticated', false, false);

  INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), v_user_id, v_user_id, jsonb_build_object('sub', v_user_id, 'email', p_admin_email, 'email_verified', false, 'phone_verified', false), 'email', now(), now(), now());

  RETURN v_samiti_id;
END;
$$;

-- 6. RLS policies (all use public. helpers)
DROP POLICY IF EXISTS super_admin_all_samiti ON samiti_settings;
DROP POLICY IF EXISTS admin_view_samiti ON samiti_settings;
DROP POLICY IF EXISTS admin_update_samiti ON samiti_settings;
CREATE POLICY super_admin_all_samiti ON samiti_settings FOR ALL USING (public.user_role() = 'super_admin');
CREATE POLICY admin_view_samiti ON samiti_settings FOR SELECT USING (public.user_role() = 'society_admin' AND public.user_samiti_id() = id);
CREATE POLICY admin_update_samiti ON samiti_settings FOR UPDATE USING (public.user_role() = 'society_admin' AND public.user_samiti_id() = id);

DROP POLICY IF EXISTS member_self ON members;
DROP POLICY IF EXISTS staff_samiti ON members;
DROP POLICY IF EXISTS super_admin_all_members ON members;
CREATE POLICY member_self ON members FOR SELECT USING (public.user_role() = 'member' AND public.user_member_id() = id);
CREATE POLICY staff_samiti ON members FOR ALL USING (public.user_role() IN ('manager', 'society_admin') AND public.user_samiti_id() = samiti_id);
CREATE POLICY super_admin_all_members ON members FOR ALL USING (public.user_role() = 'super_admin');

DROP POLICY IF EXISTS member_own_savings ON savings_accounts;
DROP POLICY IF EXISTS staff_savings ON savings_accounts;
DROP POLICY IF EXISTS super_admin_savings ON savings_accounts;
CREATE POLICY member_own_savings ON savings_accounts FOR SELECT USING (public.user_role() = 'member' AND member_id = public.user_member_id());
CREATE POLICY staff_savings ON savings_accounts FOR ALL USING (public.user_role() IN ('manager', 'society_admin') AND public.user_samiti_id() = samiti_id);
CREATE POLICY super_admin_savings ON savings_accounts FOR ALL USING (public.user_role() = 'super_admin');

DROP POLICY IF EXISTS member_own_transactions ON savings_transactions;
DROP POLICY IF EXISTS staff_transactions ON savings_transactions;
DROP POLICY IF EXISTS super_admin_transactions ON savings_transactions;
CREATE POLICY member_own_transactions ON savings_transactions FOR SELECT USING (public.user_role() = 'member' AND savings_account_id IN (SELECT id FROM savings_accounts WHERE member_id = public.user_member_id()));
CREATE POLICY staff_transactions ON savings_transactions FOR ALL USING (public.user_role() IN ('manager', 'society_admin') AND public.user_samiti_id() = samiti_id);
CREATE POLICY super_admin_transactions ON savings_transactions FOR ALL USING (public.user_role() = 'super_admin');

DROP POLICY IF EXISTS member_own_loans ON loans;
DROP POLICY IF EXISTS member_insert_loans ON loans;
DROP POLICY IF EXISTS staff_loans ON loans;
DROP POLICY IF EXISTS super_admin_loans ON loans;
CREATE POLICY member_own_loans ON loans FOR SELECT USING (public.user_role() = 'member' AND member_id = public.user_member_id());
CREATE POLICY member_insert_loans ON loans FOR INSERT WITH CHECK (public.user_role() = 'member' AND member_id = public.user_member_id());
CREATE POLICY staff_loans ON loans FOR ALL USING (public.user_role() IN ('manager', 'society_admin') AND public.user_samiti_id() = samiti_id);
CREATE POLICY super_admin_loans ON loans FOR ALL USING (public.user_role() = 'super_admin');

DROP POLICY IF EXISTS member_own_emi ON loan_emi_schedule;
DROP POLICY IF EXISTS staff_emi ON loan_emi_schedule;
DROP POLICY IF EXISTS super_admin_emi ON loan_emi_schedule;
CREATE POLICY member_own_emi ON loan_emi_schedule FOR SELECT USING (public.user_role() = 'member' AND loan_id IN (SELECT id FROM loans WHERE member_id = public.user_member_id()));
CREATE POLICY staff_emi ON loan_emi_schedule FOR ALL USING (public.user_role() IN ('manager', 'society_admin') AND loan_id IN (SELECT id FROM loans WHERE samiti_id = public.user_samiti_id()));
CREATE POLICY super_admin_emi ON loan_emi_schedule FOR ALL USING (public.user_role() = 'super_admin');

DROP POLICY IF EXISTS admin_accounts ON chart_of_accounts;
DROP POLICY IF EXISTS staff_view_accounts ON chart_of_accounts;
DROP POLICY IF EXISTS super_admin_accounts ON chart_of_accounts;
CREATE POLICY admin_accounts ON chart_of_accounts FOR ALL USING (public.user_role() = 'society_admin' AND public.user_samiti_id() = samiti_id);
CREATE POLICY staff_view_accounts ON chart_of_accounts FOR SELECT USING (public.user_role() = 'manager' AND public.user_samiti_id() = samiti_id);
CREATE POLICY super_admin_accounts ON chart_of_accounts FOR ALL USING (public.user_role() = 'super_admin');

DROP POLICY IF EXISTS admin_journal ON journal_entries;
DROP POLICY IF EXISTS staff_view_journal ON journal_entries;
DROP POLICY IF EXISTS super_admin_journal ON journal_entries;
CREATE POLICY admin_journal ON journal_entries FOR ALL USING (public.user_role() = 'society_admin' AND public.user_samiti_id() = samiti_id);
CREATE POLICY staff_view_journal ON journal_entries FOR SELECT USING (public.user_role() = 'manager' AND public.user_samiti_id() = samiti_id);
CREATE POLICY super_admin_journal ON journal_entries FOR ALL USING (public.user_role() = 'super_admin');

DROP POLICY IF EXISTS admin_journal_lines ON journal_entry_lines;
DROP POLICY IF EXISTS staff_view_journal_lines ON journal_entry_lines;
DROP POLICY IF EXISTS super_admin_journal_lines ON journal_entry_lines;
CREATE POLICY admin_journal_lines ON journal_entry_lines FOR ALL USING (public.user_role() = 'society_admin' AND journal_entry_id IN (SELECT id FROM journal_entries WHERE samiti_id = public.user_samiti_id()));
CREATE POLICY staff_view_journal_lines ON journal_entry_lines FOR SELECT USING (public.user_role() = 'manager' AND journal_entry_id IN (SELECT id FROM journal_entries WHERE samiti_id = public.user_samiti_id()));
CREATE POLICY super_admin_journal_lines ON journal_entry_lines FOR ALL USING (public.user_role() = 'super_admin');

DROP POLICY IF EXISTS admin_profit_dist ON profit_distributions;
DROP POLICY IF EXISTS super_admin_profit_dist ON profit_distributions;
CREATE POLICY admin_profit_dist ON profit_distributions FOR ALL USING (public.user_role() = 'society_admin' AND public.user_samiti_id() = samiti_id);
CREATE POLICY super_admin_profit_dist ON profit_distributions FOR ALL USING (public.user_role() = 'super_admin');

DROP POLICY IF EXISTS admin_profit_items ON profit_distribution_items;
DROP POLICY IF EXISTS super_admin_profit_items ON profit_distribution_items;
CREATE POLICY admin_profit_items ON profit_distribution_items FOR ALL USING (public.user_role() = 'society_admin' AND profit_distribution_id IN (SELECT id FROM profit_distributions WHERE samiti_id = public.user_samiti_id()));
CREATE POLICY super_admin_profit_items ON profit_distribution_items FOR ALL USING (public.user_role() = 'super_admin');

DROP POLICY IF EXISTS admin_audit ON audit_log;
DROP POLICY IF EXISTS super_admin_audit ON audit_log;
CREATE POLICY admin_audit ON audit_log FOR SELECT USING (public.user_role() = 'society_admin' AND public.user_samiti_id() = samiti_id);
CREATE POLICY super_admin_audit ON audit_log FOR ALL USING (public.user_role() = 'super_admin');

-- 7. loan_transactions table (migration 016)
CREATE TABLE IF NOT EXISTS loan_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES loans(id),
  samiti_id UUID NOT NULL REFERENCES samiti_settings(id),
  emi_id UUID REFERENCES loan_emi_schedule(id),
  transaction_type TEXT CHECK (transaction_type IN ('repayment', 'prepayment', 'foreclosure', 'correction')) NOT NULL DEFAULT 'repayment',
  amount DECIMAL(12,2) NOT NULL,
  principal_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  profit_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  balance_after DECIMAL(12,2) NOT NULL,
  reference TEXT,
  reason_note TEXT,
  performed_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE loan_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS member_own_loan_tx ON loan_transactions;
DROP POLICY IF EXISTS member_view_loan_tx ON loan_transactions;
DROP POLICY IF EXISTS staff_loan_tx ON loan_transactions;
DROP POLICY IF EXISTS super_admin_loan_tx ON loan_transactions;
CREATE POLICY member_own_loan_tx ON loan_transactions FOR INSERT WITH CHECK (
  public.user_role() = 'member'
  AND loan_id IN (SELECT id FROM loans WHERE member_id = public.user_member_id())
);
CREATE POLICY member_view_loan_tx ON loan_transactions FOR SELECT USING (
  public.user_role() = 'member'
  AND loan_id IN (SELECT id FROM loans WHERE member_id = public.user_member_id())
);
CREATE POLICY staff_loan_tx ON loan_transactions FOR ALL USING (
  public.user_role() IN ('manager', 'society_admin')
  AND samiti_id = public.user_samiti_id()
);
CREATE POLICY super_admin_loan_tx ON loan_transactions FOR ALL USING (
  public.user_role() = 'super_admin'
);
