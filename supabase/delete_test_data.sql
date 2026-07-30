-- =============================================================
-- Delete all test data & users — keeps samiti + chart of accounts
-- auth.identities.user_id = uuid, auth.sessions.user_id = uuid
-- auth.refresh_tokens.user_id = varchar
-- =============================================================

-- 1. Delete test auth users (manager, member) + their identities/sessions
DELETE FROM auth.identities
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE COALESCE(raw_user_meta_data->>'role', '') IN ('manager', 'member')
);
DELETE FROM auth.sessions
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE COALESCE(raw_user_meta_data->>'role', '') IN ('manager', 'member')
);
DELETE FROM auth.refresh_tokens
WHERE user_id::uuid IN (
  SELECT id FROM auth.users
  WHERE COALESCE(raw_user_meta_data->>'role', '') IN ('manager', 'member')
);
DELETE FROM auth.users
WHERE COALESCE(raw_user_meta_data->>'role', '') IN ('manager', 'member');

-- 2. Temporarily drop no-delete triggers for cleanup
DROP TRIGGER IF EXISTS protect_savings_transactions ON savings_transactions;
DROP TRIGGER IF EXISTS protect_journal_entries ON journal_entries;
DROP TRIGGER IF EXISTS protect_journal_entry_lines ON journal_entry_lines;
DROP TRIGGER IF EXISTS protect_profit_distributions ON profit_distributions;

-- 3. Delete app data in FK-safe order (keeps samiti_settings + chart_of_accounts)
DELETE FROM profit_distribution_items;
DELETE FROM profit_distributions;
DELETE FROM journal_entry_lines;
DELETE FROM journal_entries;
DELETE FROM loan_emi_schedule;
DELETE FROM loans;
DELETE FROM savings_transactions;
DELETE FROM savings_accounts;
DELETE FROM members;
DELETE FROM audit_log;

-- 4. Delete any corrupted test users by email
DELETE FROM auth.identities WHERE identity_data->>'email' = 'wyzeekllc@gmail.com';
DELETE FROM auth.users WHERE email = 'wyzeekllc@gmail.com';

-- 5. Recreate protect triggers
CREATE TRIGGER protect_savings_transactions
  BEFORE DELETE ON savings_transactions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_delete();
CREATE TRIGGER protect_journal_entries
  BEFORE DELETE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_delete();
CREATE TRIGGER protect_journal_entry_lines
  BEFORE DELETE ON journal_entry_lines
  FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_delete();
CREATE TRIGGER protect_profit_distributions
  BEFORE DELETE ON profit_distributions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_delete();
