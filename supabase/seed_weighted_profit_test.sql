-- =============================================================
-- SEED TEST DATA — Weighted Savings Balance (time-held) profit distribution
-- =============================================================
-- Purpose: Verify that the "Weighted Savings Balance" distribution basis
-- correctly weights each member's savings by how long the money was held.
--
-- Scenario: 5 members each deposit 100,000 BDT, but at DIFFERENT dates
-- (Jan → Jul 2026). All members end with the same 100,000 balance, yet the
-- time-weighted average differs, so the profit shares must differ.
--
--   Member | Deposit date | Days held* | Weighted avg (approx)
--   A      | 2026-01-05   | ~237       | 97,685
--   B      | 2026-02-05   | ~207       | 85,340
--   C      | 2026-03-05   | ~179       | 73,818
--   D      | 2026-05-05   | ~118       | 48,714
--   E      | 2026-07-05   | ~57        | 23,611
--   *over the period 2026-01-01 .. 2026-08-31 (243 days)
--
-- Expected result (income 250,000; distribute 70% = 175,000):
--   A ~51,933 | B ~45,370 | C ~39,245 | D ~25,898 | E ~12,553
--   (exact amounts shift a little with the app timezone, but A should get
--   roughly 4x what E gets — equal deposit, different time held)
--
-- HOW TO CHECK IN THE APP
--   1. Log in as society_admin of samiti c7f8faa1-c095-4f8d-93bd-3a748e518e98
--   2. Go to Accounting → Profit Distribution → New Distribution
--   3. Set date range from 2026-01-01 to 2026-08-31 (the app defaults to the
--      configured profit period; override it with these dates)
--   4. Basis = "Weighted Savings Balance", distribute ~70%
--   5. Preview — the Avg Balance column must match the table above and the
--      distribution amounts must be proportional to time held, NOT equal shares.
--
-- NOTE: This script is re-runnable (guards remove the previous test rows and
-- re-create the no-delete triggers). It references the samiti and admin user id
-- from your existing data — change them at the top if you use another samiti.
-- =============================================================

DO $$
DECLARE
  v_samiti_id UUID := 'c7f8faa1-c095-4f8d-93bd-3a748e518e98';
  v_admin_id  UUID := '79ba3f2b-6f92-46a9-bda8-a8e4ca17639e';
  v_cash_id UUID;
  v_income_id UUID;
  v_entry_id UUID;
BEGIN
  -- ── 0. Clean previous test rows (fixed IDs) ─────────────────────────────
  -- Temporarily drop no-delete triggers so the seed can be re-run cleanly.
  DROP TRIGGER IF EXISTS protect_savings_transactions ON savings_transactions;
  DROP TRIGGER IF EXISTS protect_journal_entries ON journal_entries;
  DROP TRIGGER IF EXISTS protect_journal_entry_lines ON journal_entry_lines;
  DROP TRIGGER IF EXISTS protect_profit_distributions ON profit_distributions;

  DELETE FROM profit_distribution_items
    WHERE member_id IN (
      '10000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000002',
      '10000000-0000-0000-0000-000000000003',
      '10000000-0000-0000-0000-000000000004',
      '10000000-0000-0000-0000-000000000005'
    );
  DELETE FROM profit_distributions
    WHERE samiti_id = v_samiti_id AND notes LIKE '%Weighted test%';

  -- Auto-generated journal entries for the seeded savings transactions
  DELETE FROM journal_entry_lines
    WHERE journal_entry_id IN (
      SELECT id FROM journal_entries
      WHERE samiti_id = v_samiti_id AND reference_id IN (
        '30000000-0000-0000-0000-000000000001',
        '30000000-0000-0000-0000-000000000002',
        '30000000-0000-0000-0000-000000000003',
        '30000000-0000-0000-0000-000000000004',
        '30000000-0000-0000-0000-000000000005'
      )
    );
  DELETE FROM journal_entries
    WHERE samiti_id = v_samiti_id AND reference_id IN (
      '30000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000002',
      '30000000-0000-0000-0000-000000000003',
      '30000000-0000-0000-0000-000000000004',
      '30000000-0000-0000-0000-000000000005'
    );
  DELETE FROM journal_entry_lines WHERE journal_entry_id = '40000000-0000-0000-0000-000000000001';
  DELETE FROM journal_entries WHERE id = '40000000-0000-0000-0000-000000000001';

  DELETE FROM savings_transactions WHERE id IN (
    '30000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000005'
  );
  DELETE FROM savings_accounts WHERE id IN (
    '20000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000004',
    '20000000-0000-0000-0000-000000000005'
  );
  DELETE FROM members WHERE id IN (
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000005'
  );

  -- ── 1. Members (5 active) ───────────────────────────────────────────────
  INSERT INTO members (id, samiti_id, member_number, name, join_date, status)
  VALUES
    ('10000000-0000-0000-0000-000000000001', v_samiti_id, 'MB-2026-9101', 'Weighted Test A', '2026-01-01', 'active'),
    ('10000000-0000-0000-0000-000000000002', v_samiti_id, 'MB-2026-9102', 'Weighted Test B', '2026-01-01', 'active'),
    ('10000000-0000-0000-0000-000000000003', v_samiti_id, 'MB-2026-9103', 'Weighted Test C', '2026-01-01', 'active'),
    ('10000000-0000-0000-0000-000000000004', v_samiti_id, 'MB-2026-9104', 'Weighted Test D', '2026-01-01', 'active'),
    ('10000000-0000-0000-0000-000000000005', v_samiti_id, 'MB-2026-9105', 'Weighted Test E', '2026-01-01', 'active');

  -- ── 2. Savings accounts (1 per member) ──────────────────────────────────
  INSERT INTO savings_accounts (id, samiti_id, member_id, account_type, account_number, opened_date, status)
  VALUES
    ('20000000-0000-0000-0000-000000000001', v_samiti_id, '10000000-0000-0000-0000-000000000001', 'general', 'SAV-2026-9101', '2026-01-01', 'active'),
    ('20000000-0000-0000-0000-000000000002', v_samiti_id, '10000000-0000-0000-0000-000000000002', 'general', 'SAV-2026-9102', '2026-01-01', 'active'),
    ('20000000-0000-0000-0000-000000000003', v_samiti_id, '10000000-0000-0000-0000-000000000003', 'general', 'SAV-2026-9103', '2026-01-01', 'active'),
    ('20000000-0000-0000-0000-000000000004', v_samiti_id, '10000000-0000-0000-0000-000000000004', 'general', 'SAV-2026-9104', '2026-01-01', 'active'),
    ('20000000-0000-0000-0000-000000000005', v_samiti_id, '10000000-0000-0000-0000-000000000005', 'general', 'SAV-2026-9105', '2026-01-01', 'active');

  -- ── 3. Deposits at staggered dates (each member holds 100,000) ───────────
  -- auto_journalize_savings trigger will post the Dr Cash / Cr Member Savings
  -- journal entries automatically.
  INSERT INTO savings_transactions (id, samiti_id, savings_account_id, transaction_type, amount, balance_after, performed_by, created_at)
  VALUES
    ('30000000-0000-0000-0000-000000000001', v_samiti_id, '20000000-0000-0000-0000-000000000001', 'deposit', 100000.00, 100000.00, v_admin_id, '2026-01-05T09:00:00+00'),
    ('30000000-0000-0000-0000-000000000002', v_samiti_id, '20000000-0000-0000-0000-000000000002', 'deposit', 100000.00, 100000.00, v_admin_id, '2026-02-05T09:00:00+00'),
    ('30000000-0000-0000-0000-000000000003', v_samiti_id, '20000000-0000-0000-0000-000000000003', 'deposit', 100000.00, 100000.00, v_admin_id, '2026-03-05T09:00:00+00'),
    ('30000000-0000-0000-0000-000000000004', v_samiti_id, '20000000-0000-0000-0000-000000000004', 'deposit', 100000.00, 100000.00, v_admin_id, '2026-05-05T09:00:00+00'),
    ('30000000-0000-0000-0000-000000000005', v_samiti_id, '20000000-0000-0000-0000-000000000005', 'deposit', 100000.00, 100000.00, v_admin_id, '2026-07-05T09:00:00+00');

  -- ── 4. Income so there is distributable profit in the period ─────────────
  -- Dr Cash / Cr Loan Profit Income for 250,000 within 2026-01-01..08-31
  -- so netProfit = 250,000 and 70% distribution = 175,000.
  PERFORM public.ensure_default_accounts(v_samiti_id);

  SELECT id INTO v_cash_id   FROM chart_of_accounts WHERE samiti_id = v_samiti_id AND account_code = 'CASH';
  SELECT id INTO v_income_id FROM chart_of_accounts WHERE samiti_id = v_samiti_id AND account_code = 'LOAN_PROFIT_INCOME';

  INSERT INTO journal_entries (
    id, samiti_id, entry_number, entry_date, description, entry_type,
    total_debit, total_credit, performed_by
  ) VALUES (
    '40000000-0000-0000-0000-000000000001', v_samiti_id, 'JE-WEIGHTED-TEST-1', '2026-06-30',
    'Weighted test income (Loan Profit)', 'income', 250000.00, 250000.00, v_admin_id
  )
  RETURNING id INTO v_entry_id;

  INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount)
  VALUES
    (v_entry_id, v_cash_id,   250000.00, 0),
    (v_entry_id, v_income_id, 0,         250000.00);

  -- ── 5. Re-create the no-delete triggers ──────────────────────────────────
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
END $$;
