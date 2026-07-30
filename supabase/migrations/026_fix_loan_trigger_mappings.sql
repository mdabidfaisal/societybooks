-- Fix loan repayment/disbursement triggers to check system_account_mappings
-- (consistent with how the savings trigger already works)

-- ── Loan repayment trigger ──
CREATE OR REPLACE FUNCTION public.auto_journalize_loan_repayment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_principal_code TEXT; v_profit_code TEXT;
  v_principal_debit TEXT; v_principal_credit TEXT;
  v_profit_debit TEXT; v_profit_credit TEXT;
  v_principal_debit_id UUID; v_principal_credit_id UUID;
  v_profit_debit_id UUID; v_profit_credit_id UUID;
  v_entry_id UUID;
  v_loan_number TEXT;
BEGIN
  IF NEW.principal_amount <= 0 AND NEW.profit_amount <= 0 THEN RETURN NEW; END IF;

  SELECT loan_number INTO v_loan_number FROM loans WHERE id = NEW.loan_id;

  -- Check admin mapping for principal portion
  SELECT debit_account_code, credit_account_code
    INTO v_principal_debit, v_principal_credit
    FROM system_account_mappings
    WHERE samiti_id = NEW.samiti_id AND transaction_type = 'loan_repayment_principal';

  IF v_principal_debit IS NULL THEN
    v_principal_debit  := 'CASH'; v_principal_credit := 'LOANS_RECEIVABLE';
  END IF;

  -- Check admin mapping for profit portion
  SELECT debit_account_code, credit_account_code
    INTO v_profit_debit, v_profit_credit
    FROM system_account_mappings
    WHERE samiti_id = NEW.samiti_id AND transaction_type = 'loan_repayment_profit';

  IF v_profit_debit IS NULL THEN
    v_profit_debit  := 'CASH'; v_profit_credit := 'LOAN_PROFIT_INCOME';
  END IF;

  v_principal_debit_id  := public.resolve_account(NEW.samiti_id, v_principal_debit, v_principal_debit, 'asset');
  v_principal_credit_id := public.resolve_account(NEW.samiti_id, v_principal_credit, v_principal_credit, 'asset');
  v_profit_debit_id     := public.resolve_account(NEW.samiti_id, v_profit_debit, v_profit_debit, 'asset');
  v_profit_credit_id    := public.resolve_account(NEW.samiti_id, v_profit_credit, v_profit_credit, 'income');

  INSERT INTO journal_entries (
    samiti_id, entry_number, entry_date, description,
    entry_type, reference_id, reference_table,
    total_debit, total_credit, performed_by
  ) VALUES (
    NEW.samiti_id,
    'AUTO-' || to_char(NEW.created_at, 'YYYYMMDD') || '-' || NEW.id,
    NEW.created_at::date,
    'Loan repayment' || COALESCE(' (' || v_loan_number || ')', ''),
    'loan_repayment',
    NEW.id,
    'loan_transactions',
    NEW.amount,
    NEW.amount,
    NEW.performed_by
  )
  RETURNING id INTO v_entry_id;

  IF NEW.principal_amount > 0 THEN
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount)
    VALUES
      (v_entry_id, v_principal_debit_id,  NEW.principal_amount, 0),
      (v_entry_id, v_principal_credit_id, 0, NEW.principal_amount);
  END IF;

  IF NEW.profit_amount > 0 THEN
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount)
    VALUES
      (v_entry_id, v_profit_debit_id,  NEW.profit_amount, 0),
      (v_entry_id, v_profit_credit_id, 0, NEW.profit_amount);
  END IF;

  RETURN NEW;
END;
$$;

-- ── Loan disbursement trigger ──
CREATE OR REPLACE FUNCTION public.auto_journalize_loan_disbursement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_debit_code TEXT;
  v_credit_code TEXT;
  v_debit_id UUID;
  v_credit_id UUID;
  v_entry_id UUID;
BEGIN
  IF NEW.status != 'disbursed' OR OLD.status = 'disbursed' THEN RETURN NEW; END IF;

  -- Check admin mapping
  SELECT debit_account_code, credit_account_code
    INTO v_debit_code, v_credit_code
    FROM system_account_mappings
    WHERE samiti_id = NEW.samiti_id AND transaction_type = 'loan_disbursement';

  IF v_debit_code IS NULL THEN
    v_debit_code  := 'LOANS_RECEIVABLE'; v_credit_code := 'CASH';
  END IF;

  v_debit_id  := public.resolve_account(NEW.samiti_id, v_debit_code, v_debit_code, 'asset');
  v_credit_id := public.resolve_account(NEW.samiti_id, v_credit_code, v_credit_code, 'asset');

  IF v_debit_id IS NULL OR v_credit_id IS NULL THEN
    RAISE WARNING 'auto_journalize_loan_disbursement: could not resolve accounts';
    RETURN NEW;
  END IF;

  INSERT INTO journal_entries (
    samiti_id, entry_number, entry_date, description,
    entry_type, reference_id, reference_table,
    total_debit, total_credit, performed_by
  ) VALUES (
    NEW.samiti_id,
    'AUTO-' || to_char(NOW(), 'YYYYMMDD') || '-' || NEW.id,
    CURRENT_DATE,
    'Loan disbursement (' || NEW.loan_number || ')',
    'loan_disbursement',
    NEW.id,
    'loans',
    NEW.amount,
    NEW.amount,
    NEW.approved_by
  )
  RETURNING id INTO v_entry_id;

  INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount)
  VALUES
    (v_entry_id, v_debit_id,  NEW.amount, 0),
    (v_entry_id, v_credit_id, 0, NEW.amount);

  RETURN NEW;
END;
$$;
