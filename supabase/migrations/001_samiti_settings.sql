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
