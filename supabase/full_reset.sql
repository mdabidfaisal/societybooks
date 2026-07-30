-- =============================================================
-- Delete all data from ALL tables (full reset)
-- WARNING: This removes everything including samiti settings
-- auth.identities.user_id = uuid, auth.sessions.user_id = uuid
-- auth.refresh_tokens.user_id = varchar
-- =============================================================

-- 1. Delete all auth users except super_admin
DELETE FROM auth.identities
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE COALESCE(raw_user_meta_data->>'role', '') != 'super_admin'
);
DELETE FROM auth.sessions
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE COALESCE(raw_user_meta_data->>'role', '') != 'super_admin'
);
DELETE FROM auth.refresh_tokens
WHERE user_id::uuid IN (
  SELECT id FROM auth.users
  WHERE COALESCE(raw_user_meta_data->>'role', '') != 'super_admin'
);
DELETE FROM auth.users
WHERE COALESCE(raw_user_meta_data->>'role', '') != 'super_admin';

-- 2. Drop no-delete triggers temporarily
DROP TRIGGER IF EXISTS protect_savings_transactions ON savings_transactions;
DROP TRIGGER IF EXISTS protect_journal_entries ON journal_entries;
DROP TRIGGER IF EXISTS protect_journal_entry_lines ON journal_entry_lines;
DROP TRIGGER IF EXISTS protect_profit_distributions ON profit_distributions;

-- 3. Delete all app data in FK-safe order
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
DELETE FROM chart_of_accounts;
DELETE FROM samiti_settings;

-- 4. Recreate protect triggers
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
