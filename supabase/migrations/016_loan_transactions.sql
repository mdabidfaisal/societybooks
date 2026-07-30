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
