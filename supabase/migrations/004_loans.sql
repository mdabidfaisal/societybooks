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
