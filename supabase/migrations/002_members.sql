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
