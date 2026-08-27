-- ============================================================
-- REMOVE DUPLICATE CLIENT-SIDE JOURNAL ENTRIES
-- ============================================================
-- The DB triggers (023_auto_journalize_triggers.sql / 026) are the
-- authoritative source for auto-journalization. An older client build
-- ALSO posted journal entries in the browser (autoJournalize), so every
-- savings/loan transaction got TWO entries (an AUTO-... entry from the
-- trigger and a JE-... entry from the client).
--
-- This script deletes ONLY those client-created duplicates:
--   * entry_number does NOT start with 'AUTO-'
--   * they reference an auto-journalized source table
--   * entry_type is one of the auto-journalized types
--
-- Manual journal entries (posted via Journal > New Entry) are safe:
-- they never set reference_table, so they do NOT match.
--
-- Run via Supabase Dashboard > SQL Editor (bypasses RLS as owner).

-- 1. Disable delete-protection + FK triggers for this session
SET session_replication_role = 'replica';

-- 2. Delete journal lines of the duplicate entries first (FK)
DELETE FROM journal_entry_lines
WHERE journal_entry_id IN (
  SELECT id FROM journal_entries
  WHERE entry_number NOT LIKE 'AUTO-%'
    AND reference_table IN ('savings_transactions', 'loans', 'loan_transactions')
    AND entry_type IN ('deposit', 'withdrawal', 'profit_posting', 'loan_disbursement', 'loan_repayment')
);

-- 3. Delete the duplicate journal entries themselves
DELETE FROM journal_entries
WHERE entry_number NOT LIKE 'AUTO-%'
  AND reference_table IN ('savings_transactions', 'loans', 'loan_transactions')
  AND entry_type IN ('deposit', 'withdrawal', 'profit_posting', 'loan_disbursement', 'loan_repayment');

-- 4. Re-enable triggers
SET session_replication_role = 'origin';

-- 5. Verify: list remaining entries (should be AUTO- entries + manual JE- entries)
SELECT entry_number, entry_date, description, entry_type, reference_table
FROM journal_entries
ORDER BY created_at;

-- 6. Sanity check: each auto-journalized source should have exactly ONE journal entry now
SELECT reference_table, reference_id, COUNT(*) AS entry_count
FROM journal_entries
WHERE reference_table IS NOT NULL
GROUP BY reference_table, reference_id
HAVING COUNT(*) > 1;
