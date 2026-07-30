-- =============================================================
-- Audit Trigger — automatically logs all writes to financial tables
-- Run this in SQL Editor after the full_setup.sql
-- =============================================================

CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  v_samiti_id UUID;
  v_actor_id UUID;
BEGIN
  -- Get actor from current session
  v_actor_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID);

  -- Try to extract samiti_id from the record
  BEGIN
    IF TG_OP = 'DELETE' THEN
      v_samiti_id := OLD.samiti_id;
    ELSE
      v_samiti_id := NEW.samiti_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_samiti_id := NULL;
  END;

  INSERT INTO audit_log (samiti_id, actor_id, action, table_name, record_id, old_data, new_data)
  VALUES (
    v_samiti_id,
    v_actor_id,
    TG_OP,
    TG_TABLE_NAME,
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD)::jsonb ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW)::jsonb ELSE NULL END
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Members
CREATE TRIGGER audit_members
  AFTER INSERT OR UPDATE OR DELETE ON members
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Savings accounts
CREATE TRIGGER audit_savings_accounts
  AFTER INSERT OR UPDATE OR DELETE ON savings_accounts
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Savings transactions
CREATE TRIGGER audit_savings_transactions
  AFTER INSERT OR UPDATE OR DELETE ON savings_transactions
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Loans
CREATE TRIGGER audit_loans
  AFTER INSERT OR UPDATE OR DELETE ON loans
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Loan EMI schedule
CREATE TRIGGER audit_loan_emi
  AFTER INSERT OR UPDATE OR DELETE ON loan_emi_schedule
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Journal entries
CREATE TRIGGER audit_journal_entries
  AFTER INSERT OR UPDATE OR DELETE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Journal entry lines
CREATE TRIGGER audit_journal_entry_lines
  AFTER INSERT OR UPDATE OR DELETE ON journal_entry_lines
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Profit distributions
CREATE TRIGGER audit_profit_distributions
  AFTER INSERT OR UPDATE OR DELETE ON profit_distributions
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Profit distribution items
CREATE TRIGGER audit_profit_distribution_items
  AFTER INSERT OR UPDATE OR DELETE ON profit_distribution_items
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
