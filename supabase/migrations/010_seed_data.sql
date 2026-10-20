-- Create a demo samiti
INSERT INTO samiti_settings (id, samiti_name, samiti_code, shares_enabled, share_value, default_profit_method, default_profit_rate)
VALUES (
  gen_random_uuid(),
  'SocietyBooks Demo',
  'SAM001',
  false,
  0,
  'reducing_balance',
  12.00
);

-- Seed system chart of accounts (run after samiti is created, replace <samiti-uuid>)
-- INSERT INTO chart_of_accounts (samiti_id, account_code, account_name, account_type, is_system) VALUES
--   ('<samiti-uuid>', '1001', 'Cash & Bank', 'asset', true),
--   ('<samiti-uuid>', '1002', 'Loans Receivable', 'asset', true),
--   ('<samiti-uuid>', '2001', 'Member Savings', 'liability', true),
--   ('<samiti-uuid>', '2002', 'Profit Payable', 'liability', true),
--   ('<samiti-uuid>', '3001', 'Retained Earnings', 'equity', true),
--   ('<samiti-uuid>', '4001', 'Loan Profit Income', 'income', true),
--   ('<samiti-uuid>', '4002', 'Savings Profit Income', 'income', true),
--   ('<samiti-uuid>', '4003', 'Other Income', 'income', true),
--   ('<samiti-uuid>', '5001', 'Operating Expense', 'expense', true),
--   ('<samiti-uuid>', '5002', 'Administrative Expense', 'expense', true);
