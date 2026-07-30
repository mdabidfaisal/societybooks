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
