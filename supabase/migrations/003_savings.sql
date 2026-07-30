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
