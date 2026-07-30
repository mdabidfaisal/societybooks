CREATE OR REPLACE FUNCTION auth.user_samiti_id()
RETURNS UUID
LANGUAGE SQL STABLE
AS $$
  SELECT COALESCE(
    (SELECT raw_user_meta_data->>'samiti_id' FROM auth.users WHERE id = auth.uid()),
    (SELECT raw_app_meta_data->>'samiti_id' FROM auth.users WHERE id = auth.uid())
  )::UUID;
$$;

CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT
LANGUAGE SQL STABLE
AS $$
  SELECT COALESCE(
    raw_user_meta_data->>'role',
    raw_app_meta_data->>'role'
  ) FROM auth.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION auth.user_member_id()
RETURNS UUID
LANGUAGE SQL STABLE
AS $$
  SELECT (raw_user_meta_data->>'member_id')::UUID FROM auth.users WHERE id = auth.uid();
$$;

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

-- samiti_settings policies
CREATE POLICY super_admin_all_samiti ON samiti_settings
  FOR ALL USING (auth.user_role() = 'super_admin');
CREATE POLICY admin_view_samiti ON samiti_settings
  FOR SELECT USING (auth.user_role() = 'society_admin' AND auth.user_samiti_id() = id);

-- members policies
CREATE POLICY member_self ON members
  FOR SELECT USING (
    auth.user_role() = 'member' AND auth.user_member_id() = id
  );
CREATE POLICY staff_samiti ON members
  FOR ALL USING (
    auth.user_role() IN ('manager', 'society_admin')
    AND auth.user_samiti_id() = samiti_id
  );
CREATE POLICY super_admin_all_members ON members
  FOR ALL USING (auth.user_role() = 'super_admin');

-- savings_accounts policies
CREATE POLICY member_own_savings ON savings_accounts
  FOR SELECT USING (
    auth.user_role() = 'member' AND member_id = auth.user_member_id()
  );
CREATE POLICY staff_savings ON savings_accounts
  FOR ALL USING (
    auth.user_role() IN ('manager', 'society_admin')
    AND auth.user_samiti_id() = samiti_id
  );
CREATE POLICY super_admin_savings ON savings_accounts
  FOR ALL USING (auth.user_role() = 'super_admin');

-- savings_transactions policies
CREATE POLICY member_own_transactions ON savings_transactions
  FOR SELECT USING (
    auth.user_role() = 'member'
    AND savings_account_id IN (
      SELECT id FROM savings_accounts WHERE member_id = auth.user_member_id()
    )
  );
CREATE POLICY staff_transactions ON savings_transactions
  FOR ALL USING (
    auth.user_role() IN ('manager', 'society_admin')
    AND auth.user_samiti_id() = samiti_id
  );
CREATE POLICY super_admin_transactions ON savings_transactions
  FOR ALL USING (auth.user_role() = 'super_admin');

-- loans policies
CREATE POLICY member_own_loans ON loans
  FOR SELECT USING (
    auth.user_role() = 'member' AND member_id = auth.user_member_id()
  );
CREATE POLICY member_insert_loans ON loans
  FOR INSERT WITH CHECK (
    auth.user_role() = 'member' AND member_id = auth.user_member_id()
  );
CREATE POLICY staff_loans ON loans
  FOR ALL USING (
    auth.user_role() IN ('manager', 'society_admin')
    AND auth.user_samiti_id() = samiti_id
  );
CREATE POLICY super_admin_loans ON loans
  FOR ALL USING (auth.user_role() = 'super_admin');

-- loan_emi_schedule policies
CREATE POLICY member_own_emi ON loan_emi_schedule
  FOR SELECT USING (
    auth.user_role() = 'member'
    AND loan_id IN (SELECT id FROM loans WHERE member_id = auth.user_member_id())
  );
CREATE POLICY staff_emi ON loan_emi_schedule
  FOR ALL USING (
    auth.user_role() IN ('manager', 'society_admin')
    AND loan_id IN (SELECT id FROM loans WHERE samiti_id = auth.user_samiti_id())
  );
CREATE POLICY super_admin_emi ON loan_emi_schedule
  FOR ALL USING (auth.user_role() = 'super_admin');

-- chart_of_accounts policies
CREATE POLICY admin_accounts ON chart_of_accounts
  FOR ALL USING (
    auth.user_role() = 'society_admin' AND auth.user_samiti_id() = samiti_id
  );
CREATE POLICY staff_view_accounts ON chart_of_accounts
  FOR SELECT USING (
    auth.user_role() = 'manager' AND auth.user_samiti_id() = samiti_id
  );
CREATE POLICY super_admin_accounts ON chart_of_accounts
  FOR ALL USING (auth.user_role() = 'super_admin');

-- journal_entries policies
CREATE POLICY admin_journal ON journal_entries
  FOR ALL USING (
    auth.user_role() = 'society_admin' AND auth.user_samiti_id() = samiti_id
  );
CREATE POLICY staff_view_journal ON journal_entries
  FOR SELECT USING (
    auth.user_role() = 'manager' AND auth.user_samiti_id() = samiti_id
  );
CREATE POLICY super_admin_journal ON journal_entries
  FOR ALL USING (auth.user_role() = 'super_admin');

-- journal_entry_lines policies (same scoping as parent)
CREATE POLICY admin_journal_lines ON journal_entry_lines
  FOR ALL USING (
    auth.user_role() = 'society_admin'
    AND journal_entry_id IN (SELECT id FROM journal_entries WHERE samiti_id = auth.user_samiti_id())
  );
CREATE POLICY staff_view_journal_lines ON journal_entry_lines
  FOR SELECT USING (
    auth.user_role() = 'manager'
    AND journal_entry_id IN (SELECT id FROM journal_entries WHERE samiti_id = auth.user_samiti_id())
  );
CREATE POLICY super_admin_journal_lines ON journal_entry_lines
  FOR ALL USING (auth.user_role() = 'super_admin');

-- profit_distributions policies
CREATE POLICY admin_profit_dist ON profit_distributions
  FOR ALL USING (
    auth.user_role() = 'society_admin' AND auth.user_samiti_id() = samiti_id
  );
CREATE POLICY super_admin_profit_dist ON profit_distributions
  FOR ALL USING (auth.user_role() = 'super_admin');

-- profit_distribution_items policies
CREATE POLICY admin_profit_items ON profit_distribution_items
  FOR ALL USING (
    auth.user_role() = 'society_admin'
    AND profit_distribution_id IN (SELECT id FROM profit_distributions WHERE samiti_id = auth.user_samiti_id())
  );
CREATE POLICY super_admin_profit_items ON profit_distribution_items
  FOR ALL USING (auth.user_role() = 'super_admin');

-- audit_log policies
CREATE POLICY admin_audit ON audit_log
  FOR SELECT USING (
    auth.user_role() = 'society_admin' AND auth.user_samiti_id() = samiti_id
  );
CREATE POLICY super_admin_audit ON audit_log
  FOR ALL USING (auth.user_role() = 'super_admin');
