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
