CREATE TABLE IF NOT EXISTS system_account_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  samiti_id UUID NOT NULL REFERENCES samiti_settings(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'savings_deposit', 'savings_withdrawal', 'savings_profit',
    'loan_disbursement', 'loan_repayment_principal', 'loan_repayment_profit'
  )),
  debit_account_code TEXT NOT NULL,
  credit_account_code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(samiti_id, transaction_type)
);

ALTER TABLE system_account_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_account_mappings ON system_account_mappings FOR ALL USING (
  public.user_role() IN ('manager', 'society_admin') AND samiti_id = public.user_samiti_id()
);
CREATE POLICY super_admin_account_mappings ON system_account_mappings FOR ALL USING (
  public.user_role() = 'super_admin'
);
