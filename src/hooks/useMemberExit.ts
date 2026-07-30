import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { postJournalEntry } from '../lib/accounting'

export interface ExitEligibility {
  eligible: boolean
  reason: string | null
  savingsBalance: number
  profitReceived: number
  outstandingLoan: number
  netSettlement: number
}

export function useMemberExit() {
  const { samitiId } = useAuth()

  const checkExitEligibility = useCallback(async (memberId: string): Promise<ExitEligibility> => {
    let savingsBalance = 0
    let profitReceived = 0
    let outstandingLoan = 0

    // 1. Savings balance from savings_accounts
    const { data: savingsAccounts } = await supabase
      .from('savings_accounts')
      .select('id')
      .eq('member_id', memberId)
      .eq('status', 'active')

    if (savingsAccounts) {
      for (const acct of savingsAccounts) {
        const { data: txns } = await supabase
          .from('savings_transactions')
          .select('balance_after')
          .eq('savings_account_id', acct.id)
          .order('created_at', { ascending: false })
          .limit(1)
        if (txns && txns.length > 0) {
          savingsBalance += Number((txns[0] as { balance_after: number }).balance_after) || 0
        }
      }
    }

    // 2. Profit distributions received
    const { data: profitItems } = await supabase
      .from('profit_distribution_items')
      .select('distribution_amount')
      .eq('member_id', memberId)
    if (profitItems) {
      profitReceived = profitItems.reduce((s, i) => s + Number(i.distribution_amount), 0)
    }

    // 3. Outstanding loan balance (unpaid EMIs)
    const { data: loans } = await supabase
      .from('loans')
      .select('id')
      .eq('member_id', memberId)
      .in('status', ['approved', 'disbursed'])

    if (loans && loans.length > 0) {
      const loanIds = loans.map((l) => l.id)
      const { data: emis } = await supabase
        .from('loan_emi_schedule')
        .select('total_amount, paid_amount')
        .in('loan_id', loanIds)
        .neq('status', 'paid')
      if (emis) {
        outstandingLoan = emis.reduce((s, e) => {
          const eObj = e as { total_amount: number; paid_amount: number }
          return s + (Number(eObj.total_amount) - Number(eObj.paid_amount || 0))
        }, 0)
      }
    }

    const netSettlement = savingsBalance + profitReceived - outstandingLoan

    return {
      eligible: true,
      reason: null,
      savingsBalance,
      profitReceived,
      outstandingLoan,
      netSettlement,
    }
  }, [])

  const processExit = useCallback(async (memberId: string, note: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !samitiId) throw new Error('Not authenticated')

    // Re-check eligibility to get latest numbers
    const eligibility = await checkExitEligibility(memberId)

    // 1. Close savings accounts and record exit_settlement transactions
    const { data: savingsAccounts } = await supabase
      .from('savings_accounts')
      .select('id, account_number')
      .eq('member_id', memberId)
      .eq('status', 'active')

    const savingsTxIds: string[] = []
    if (savingsAccounts) {
      for (const acct of savingsAccounts) {
        const { data: lastTx } = await supabase
          .from('savings_transactions')
          .select('balance_after')
          .eq('savings_account_id', acct.id)
          .order('created_at', { ascending: false })
          .limit(1)
        const bal = (lastTx && lastTx.length > 0) ? Number((lastTx[0] as { balance_after: number }).balance_after) || 0 : 0

        if (bal > 0) {
          const { data: txResult, error: txError } = await supabase.from('savings_transactions').insert({
            samiti_id: samitiId,
            savings_account_id: acct.id,
            transaction_type: 'exit_settlement',
            amount: bal,
            balance_after: 0,
            reference: `Exit settlement for member ${memberId}`,
            reason_note: note,
            performed_by: user.id,
          }).select().single()

          if (txError) throw txError
          if (txResult) savingsTxIds.push((txResult as { id: string }).id)
        }

        await supabase.from('savings_accounts').update({ status: 'closed' }).eq('id', acct.id)
      }
    }

    // 2. Close active loans
    const { data: activeLoans } = await supabase
      .from('loans')
      .select('id')
      .eq('member_id', memberId)
      .in('status', ['approved', 'disbursed'])

    if (activeLoans && activeLoans.length > 0) {
      for (const ln of activeLoans) {
        await supabase.from('loans').update({
          status: 'closed',
        }).eq('id', ln.id)
      }
    }

    // 3. Update member status
    const { data: memberData, error: memberError } = await supabase.from('members').update({
      status: 'exited',
      exit_date: new Date().toISOString().split('T')[0],
      exit_settlement_amount: Math.abs(eligibility.netSettlement),
      exit_note: note,
    }).eq('id', memberId).select().single()

    if (memberError) throw memberError

    // 4. Create journal entry for exit settlement
    // Dr SAVINGS_LIABILITY = savingsBalance
    // Cr LOANS_RECEIVABLE = outstandingLoan (if any)
    // Cr CASH = netSettlement (if positive) OR Dr CASH = |netSettlement| (if negative)
    const lines: { account_code: string; debit: number; credit: number }[] = []

    // Reverse savings liability
    if (eligibility.savingsBalance > 0) {
      lines.push({ account_code: 'SAVINGS_LIABILITY', debit: eligibility.savingsBalance, credit: 0 })
    }

    // Close out loan
    if (eligibility.outstandingLoan > 0) {
      lines.push({ account_code: 'LOANS_RECEIVABLE', debit: 0, credit: eligibility.outstandingLoan })
    }

    // Net cash effect
    if (eligibility.netSettlement > 0) {
      // Society pays member
      lines.push({ account_code: 'CASH', debit: 0, credit: eligibility.netSettlement })
    } else if (eligibility.netSettlement < 0) {
      // Member pays society
      lines.push({ account_code: 'CASH', debit: Math.abs(eligibility.netSettlement), credit: 0 })
    }

    if (lines.length > 0) {
      // Ensure default system accounts exist before posting
      try { await supabase.rpc('ensure_default_accounts', { p_samiti_id: samitiId }) } catch {}
      await postJournalEntry({
        samitiId,
        entryType: 'exit_settlement',
        description: `Exit settlement for member${note ? ': ' + note : ''}`,
        referenceId: memberId,
        referenceTable: 'members',
        lines,
        performedBy: user.id,
      })
    }

    return { data: memberData, error: null }
  }, [samitiId, checkExitEligibility])

  return { checkExitEligibility, processExit }
}
