-- ============================================================
-- PRODUCTION CLEANUP: Remove all demo data, keep superadmin only
-- Run this via Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Disable all triggers and FK constraints for this session
SET session_replication_role = 'replica';

-- 2. Delete application data (reverse FK order)
DELETE FROM profit_distribution_items;
DELETE FROM profit_distributions;
DELETE FROM loan_transactions;
DELETE FROM loan_emi_schedule;
DELETE FROM loans;
DELETE FROM savings_transactions;
DELETE FROM savings_accounts;
DELETE FROM journal_entry_lines;
DELETE FROM journal_entries;
DELETE FROM audit_log;
DELETE FROM system_account_mappings;
DELETE FROM chart_of_accounts;
DELETE FROM members;
DELETE FROM samiti_settings;

-- 3. Re-enable triggers and FK constraints
SET session_replication_role = 'origin';

-- 4. Reset sequences
ALTER SEQUENCE entry_number_seq RESTART WITH 1;

-- 5. Delete all auth users EXCEPT super_admin
DELETE FROM auth.users
WHERE id NOT IN (
  SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'super_admin'
);

-- 6. Verify only superadmin remains
SELECT id, email, raw_user_meta_data->>'role' AS role
FROM auth.users;
