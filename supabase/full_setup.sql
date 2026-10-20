-- =============================================================
-- SocietyBooks — Full Database Setup
-- Paste this entire file into Supabase SQL Editor and run once.
-- =============================================================

-- 1. TABLES
-- ---------

CREATE TABLE samiti_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  samiti_name TEXT NOT NULL,
  samiti_code TEXT UNIQUE NOT NULL,
  shares_enabled BOOLEAN NOT NULL DEFAULT false,
  share_value DECIMAL(12,2) DEFAULT 0,
  default_profit_method TEXT CHECK (default_profit_method IN ('flat', 'reducing_balance')) DEFAULT 'reducing_balance',
  default_profit_rate DECIMAL(5,2) DEFAULT 12.00,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE samiti_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  samiti_id UUID NOT NULL REFERENCES samiti_settings(id),
  member_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  guardian_name TEXT,
  nid TEXT,
  phone TEXT,
  address TEXT,
  photo_url TEXT,
  join_date DATE DEFAULT CURRENT_DATE,
  status TEXT CHECK (status IN ('active', 'inactive', 'exited')) DEFAULT 'active',
  exit_date DATE,
  exit_settlement_amount DECIMAL(12,2),
  exit_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE TABLE savings_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  samiti_id UUID NOT NULL REFERENCES samiti_settings(id),
  member_id UUID NOT NULL REFERENCES members(id),
  account_type TEXT CHECK (account_type IN ('general', 'recurring', 'fixed_deposit')) DEFAULT 'general',
  account_number TEXT UNIQUE NOT NULL,
  opened_date DATE DEFAULT CURRENT_DATE,
  status TEXT CHECK (status IN ('active', 'closed')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE savings_accounts ENABLE ROW LEVEL SECURITY;

CREATE TABLE savings_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  samiti_id UUID NOT NULL REFERENCES samiti_settings(id),
  savings_account_id UUID NOT NULL REFERENCES savings_accounts(id),
  transaction_type TEXT CHECK (transaction_type IN ('deposit', 'withdrawal', 'profit', 'correction', 'exit_settlement')) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  reference TEXT,
  reason_note TEXT,
  performed_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE savings_transactions ENABLE ROW LEVEL SECURITY;

CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  samiti_id UUID NOT NULL REFERENCES samiti_settings(id),
  member_id UUID NOT NULL REFERENCES members(id),
  loan_number TEXT UNIQUE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  purpose TEXT,
  tenure_months INT NOT NULL,
  profit_method TEXT CHECK (profit_method IN ('flat', 'reducing_balance')) NOT NULL,
  profit_rate DECIMAL(5,2) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'disbursed', 'closed')) DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  disbursed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

CREATE TABLE loan_emi_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES loans(id),
  installment_no INT NOT NULL,
  due_date DATE NOT NULL,
  principal_amount DECIMAL(12,2) NOT NULL,
  profit_amount DECIMAL(12,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  paid_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('pending', 'paid', 'partial', 'overdue')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE loan_emi_schedule ENABLE ROW LEVEL SECURITY;

CREATE TABLE chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  samiti_id UUID NOT NULL REFERENCES samiti_settings(id),
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT CHECK (account_type IN ('income', 'expense', 'asset', 'liability', 'equity')) NOT NULL,
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(samiti_id, account_code)
);
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;

CREATE SEQUENCE entry_number_seq START 1;

CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  samiti_id UUID NOT NULL REFERENCES samiti_settings(id),
  entry_number TEXT UNIQUE NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  entry_type TEXT CHECK (entry_type IN ('loan_disbursement', 'loan_repayment', 'deposit', 'withdrawal', 'profit_posting', 'profit_distribution', 'expense', 'income', 'exit_settlement', 'correction')) NOT NULL,
  reference_id UUID,
  reference_table TEXT,
  total_debit DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_credit DECIMAL(12,2) NOT NULL DEFAULT 0,
  performed_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE TABLE journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id),
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
  debit_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  credit_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (debit_amount >= 0 AND credit_amount >= 0),
  CHECK ((debit_amount > 0 AND credit_amount = 0) OR (credit_amount > 0 AND debit_amount = 0))
);
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;

CREATE TABLE profit_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  samiti_id UUID NOT NULL REFERENCES samiti_settings(id),
  distribution_number TEXT UNIQUE NOT NULL,
  distribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_profit_amount DECIMAL(12,2) NOT NULL,
  distribution_basis TEXT CHECK (distribution_basis IN ('share', 'savings', 'equal')) NOT NULL,
  status TEXT CHECK (status IN ('draft', 'distributed')) DEFAULT 'draft',
  notes TEXT,
  performed_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE profit_distributions ENABLE ROW LEVEL SECURITY;

CREATE TABLE profit_distribution_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profit_distribution_id UUID NOT NULL REFERENCES profit_distributions(id),
  member_id UUID NOT NULL REFERENCES members(id),
  basis_amount DECIMAL(12,2) NOT NULL,
  distribution_amount DECIMAL(12,2) NOT NULL,
  savings_transaction_id UUID REFERENCES savings_transactions(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE profit_distribution_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  samiti_id UUID REFERENCES samiti_settings(id),
  actor_id UUID NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- 2. HELPER FUNCTIONS
-- -------------------

CREATE OR REPLACE FUNCTION public.user_samiti_id()
RETURNS UUID
LANGUAGE SQL STABLE
AS $$
  SELECT COALESCE(
    (SELECT raw_user_meta_data->>'samiti_id' FROM auth.users WHERE id = auth.uid()),
    (SELECT raw_app_meta_data->>'samiti_id' FROM auth.users WHERE id = auth.uid())
  )::UUID;
$$;

CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT
LANGUAGE SQL STABLE
AS $$
  SELECT COALESCE(
    raw_user_meta_data->>'role',
    raw_app_meta_data->>'role'
  ) FROM auth.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.user_member_id()
RETURNS UUID
LANGUAGE SQL STABLE
AS $$
  SELECT (raw_user_meta_data->>'member_id')::UUID FROM auth.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.heartbeat()
RETURNS boolean
LANGUAGE sql
AS $$ SELECT true; $$;

-- 3. NO-DELETE TRIGGERS
-- ---------------------

CREATE OR REPLACE FUNCTION public.prevent_financial_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Hard deletes are not allowed on financial records. Use a correction entry instead.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER protect_savings_transactions
  BEFORE DELETE ON savings_transactions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_delete();

CREATE TRIGGER protect_journal_entries
  BEFORE DELETE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_delete();

CREATE TRIGGER protect_journal_entry_lines
  BEFORE DELETE ON journal_entry_lines
  FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_delete();

-- 4. ROW LEVEL SECURITY POLICIES
-- ------------------------------

-- samiti_settings
CREATE POLICY super_admin_all_samiti ON samiti_settings
  FOR ALL USING (public.user_role() = 'super_admin');
CREATE POLICY admin_view_samiti ON samiti_settings
  FOR SELECT USING (public.user_role() = 'society_admin' AND public.user_samiti_id() = id);

-- members
CREATE POLICY member_self ON members
  FOR SELECT USING (public.user_role() = 'member' AND public.user_member_id() = id);
CREATE POLICY staff_samiti ON members
  FOR ALL USING (public.user_role() IN ('manager', 'society_admin') AND public.user_samiti_id() = samiti_id);
CREATE POLICY super_admin_all_members ON members
  FOR ALL USING (public.user_role() = 'super_admin');

-- savings_accounts
CREATE POLICY member_own_savings ON savings_accounts
  FOR SELECT USING (public.user_role() = 'member' AND member_id = public.user_member_id());
CREATE POLICY staff_savings ON savings_accounts
  FOR ALL USING (public.user_role() IN ('manager', 'society_admin') AND public.user_samiti_id() = samiti_id);
CREATE POLICY super_admin_savings ON savings_accounts
  FOR ALL USING (public.user_role() = 'super_admin');

-- savings_transactions
CREATE POLICY member_own_transactions ON savings_transactions
  FOR SELECT USING (
    public.user_role() = 'member'
    AND savings_account_id IN (SELECT id FROM savings_accounts WHERE member_id = public.user_member_id())
  );
CREATE POLICY staff_transactions ON savings_transactions
  FOR ALL USING (public.user_role() IN ('manager', 'society_admin') AND public.user_samiti_id() = samiti_id);
CREATE POLICY super_admin_transactions ON savings_transactions
  FOR ALL USING (public.user_role() = 'super_admin');

-- loans
CREATE POLICY member_own_loans ON loans
  FOR SELECT USING (public.user_role() = 'member' AND member_id = public.user_member_id());
CREATE POLICY member_insert_loans ON loans
  FOR INSERT WITH CHECK (public.user_role() = 'member' AND member_id = public.user_member_id());
CREATE POLICY staff_loans ON loans
  FOR ALL USING (public.user_role() IN ('manager', 'society_admin') AND public.user_samiti_id() = samiti_id);
CREATE POLICY super_admin_loans ON loans
  FOR ALL USING (public.user_role() = 'super_admin');

-- loan_emi_schedule
CREATE POLICY member_own_emi ON loan_emi_schedule
  FOR SELECT USING (
    public.user_role() = 'member'
    AND loan_id IN (SELECT id FROM loans WHERE member_id = public.user_member_id())
  );
CREATE POLICY staff_emi ON loan_emi_schedule
  FOR ALL USING (
    public.user_role() IN ('manager', 'society_admin')
    AND loan_id IN (SELECT id FROM loans WHERE samiti_id = public.user_samiti_id())
  );
CREATE POLICY super_admin_emi ON loan_emi_schedule
  FOR ALL USING (public.user_role() = 'super_admin');

-- chart_of_accounts
CREATE POLICY admin_accounts ON chart_of_accounts
  FOR ALL USING (public.user_role() = 'society_admin' AND public.user_samiti_id() = samiti_id);
CREATE POLICY staff_view_accounts ON chart_of_accounts
  FOR SELECT USING (public.user_role() = 'manager' AND public.user_samiti_id() = samiti_id);
CREATE POLICY super_admin_accounts ON chart_of_accounts
  FOR ALL USING (public.user_role() = 'super_admin');

-- journal_entries
CREATE POLICY admin_journal ON journal_entries
  FOR ALL USING (public.user_role() = 'society_admin' AND public.user_samiti_id() = samiti_id);
CREATE POLICY staff_view_journal ON journal_entries
  FOR SELECT USING (public.user_role() = 'manager' AND public.user_samiti_id() = samiti_id);
CREATE POLICY super_admin_journal ON journal_entries
  FOR ALL USING (public.user_role() = 'super_admin');

-- journal_entry_lines
CREATE POLICY admin_journal_lines ON journal_entry_lines
  FOR ALL USING (
    public.user_role() = 'society_admin'
    AND journal_entry_id IN (SELECT id FROM journal_entries WHERE samiti_id = public.user_samiti_id())
  );
CREATE POLICY staff_view_journal_lines ON journal_entry_lines
  FOR SELECT USING (
    public.user_role() = 'manager'
    AND journal_entry_id IN (SELECT id FROM journal_entries WHERE samiti_id = public.user_samiti_id())
  );
CREATE POLICY super_admin_journal_lines ON journal_entry_lines
  FOR ALL USING (public.user_role() = 'super_admin');

-- profit_distributions
CREATE POLICY admin_profit_dist ON profit_distributions
  FOR ALL USING (public.user_role() = 'society_admin' AND public.user_samiti_id() = samiti_id);
CREATE POLICY super_admin_profit_dist ON profit_distributions
  FOR ALL USING (public.user_role() = 'super_admin');

-- profit_distribution_items
CREATE POLICY admin_profit_items ON profit_distribution_items
  FOR ALL USING (
    public.user_role() = 'society_admin'
    AND profit_distribution_id IN (SELECT id FROM profit_distributions WHERE samiti_id = public.user_samiti_id())
  );
CREATE POLICY super_admin_profit_items ON profit_distribution_items
  FOR ALL USING (public.user_role() = 'super_admin');

-- audit_log
CREATE POLICY admin_audit ON audit_log
  FOR SELECT USING (public.user_role() = 'society_admin' AND public.user_samiti_id() = samiti_id);
CREATE POLICY super_admin_audit ON audit_log
  FOR ALL USING (public.user_role() = 'super_admin');

-- 5. SEED DATA (samiti + chart of accounts in one block)
-- -------------------------------------------------------

DO $$
DECLARE
  v_samiti_id UUID;
BEGIN
  -- Insert demo samiti
  INSERT INTO samiti_settings (id, samiti_name, samiti_code, shares_enabled, share_value, default_profit_method, default_profit_rate)
  VALUES (gen_random_uuid(), 'SocietyBooks Demo', 'SAM001', false, 0, 'reducing_balance', 12.00)
  RETURNING id INTO v_samiti_id;

  -- Seed chart of accounts for this samiti
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

  RAISE NOTICE 'Samiti created with ID: %', v_samiti_id;
END $$;
