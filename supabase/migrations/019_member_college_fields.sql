ALTER TABLE members ADD COLUMN IF NOT EXISTS name_bn TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS mother_name TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS spouse_name TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other'));
ALTER TABLE members ADD COLUMN IF NOT EXISTS blood_group TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS marital_status TEXT CHECK (marital_status IN ('married', 'unmarried', 'widowed', 'divorced'));

ALTER TABLE members ADD COLUMN IF NOT EXISTS college_name TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS college_code TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS designation TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS employee_id TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS mpo_index_number TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS mpo_enrolled_date DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS govt_service_date DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS present_college_joining_date DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS retirement_date DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS employment_status TEXT CHECK (employment_status IN ('permanent', 'deputation', 'contract', 'other'));

ALTER TABLE members ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS present_address TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS permanent_address TEXT;

ALTER TABLE members ADD COLUMN IF NOT EXISTS nominee_name TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS nominee_relation TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS nominee_nid TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS nominee_phone TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS nominee_address TEXT;

ALTER TABLE members ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS branch_name TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS routing_number TEXT;

ALTER TABLE members ADD COLUMN IF NOT EXISTS qualification TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS remarks TEXT;
