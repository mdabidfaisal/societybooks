-- Function: delete a samiti and all dependent data in correct order
DROP FUNCTION IF EXISTS public.delete_samiti_cascade;
CREATE OR REPLACE FUNCTION public.delete_samiti_cascade(
  p_samiti_id UUID
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
BEGIN
  IF public.user_role() != 'super_admin' THEN
    RAISE EXCEPTION 'Only super_admin can delete samitis';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM samiti_settings WHERE id = p_samiti_id) THEN
    RAISE EXCEPTION 'Samiti not found';
  END IF;

  -- Delete leaf tables first (deepest dependencies)
  DELETE FROM loan_emi_schedule
  WHERE loan_id IN (SELECT id FROM loans WHERE samiti_id = p_samiti_id);

  DELETE FROM savings_transactions
  WHERE savings_account_id IN (SELECT id FROM savings_accounts WHERE samiti_id = p_samiti_id);

  DELETE FROM journal_entry_lines
  WHERE journal_entry_id IN (SELECT id FROM journal_entries WHERE samiti_id = p_samiti_id);

  DELETE FROM profit_distribution_items
  WHERE profit_distribution_id IN (SELECT id FROM profit_distributions WHERE samiti_id = p_samiti_id);

  -- Delete mid-level tables
  DELETE FROM loans WHERE samiti_id = p_samiti_id;
  DELETE FROM savings_accounts WHERE samiti_id = p_samiti_id;
  DELETE FROM journal_entries WHERE samiti_id = p_samiti_id;
  DELETE FROM profit_distributions WHERE samiti_id = p_samiti_id;
  DELETE FROM members WHERE samiti_id = p_samiti_id;
  DELETE FROM chart_of_accounts WHERE samiti_id = p_samiti_id;
  DELETE FROM audit_log WHERE samiti_id = p_samiti_id;

  -- Finally delete the samiti itself
  DELETE FROM samiti_settings WHERE id = p_samiti_id;
END;
$$;
