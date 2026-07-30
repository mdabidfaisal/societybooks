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
