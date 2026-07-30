import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useReports() {
  const { samitiId } = useAuth()

  const getDailyCashSummary = useCallback(async (date?: string) => {
    if (!samitiId) return null
    const targetDate = date || new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('savings_transactions')
      .select('transaction_type, amount')
      .eq('samiti_id', samitiId)
      .gte('created_at', `${targetDate}T00:00:00Z`)
      .lte('created_at', `${targetDate}T23:59:59Z`)

    const summary = {
      totalDeposits: 0,
      totalWithdrawals: 0,
      totalProfitCredited: 0,
      date: targetDate,
    }

    if (data) {
      for (const tx of data as Array<{ transaction_type: string; amount: number }>) {
        if (tx.transaction_type === 'deposit') summary.totalDeposits += tx.amount
        else if (tx.transaction_type === 'withdrawal') summary.totalWithdrawals += tx.amount
        else if (tx.transaction_type === 'profit') summary.totalProfitCredited += tx.amount
      }
    }

    return summary
  }, [samitiId])

  const getOverdueEMIs = useCallback(async () => {
    if (!samitiId) return { data: null, error: null }
    const { data, error } = await supabase
      .from('loan_emi_schedule')
      .select('*')
      .lt('due_date', new Date().toISOString().split('T')[0])
      .in('status', ['pending', 'partial'])
      .order('due_date', { ascending: true })
    return { data, error }
  }, [])

  const getSocietySummary = useCallback(async () => {
    if (!samitiId) return null

    const { data: membersData } = await supabase
      .from('members')
      .select('status')
      .eq('samiti_id', samitiId)

    const totalMembers = membersData?.length || 0
    const activeMembers = membersData?.filter((m: Record<string, unknown>) => m.status === 'active').length || 0

    const { data: loansData } = await supabase
      .from('loans')
      .select('amount')
      .eq('samiti_id', samitiId)
      .eq('status', 'disbursed')

    const totalLoansOutstanding = (loansData as Array<{ amount: number }> | null)
      ?.reduce((s, l) => s + l.amount, 0) || 0

    return { totalMembers, activeMembers, totalLoansOutstanding }
  }, [samitiId])

  return { getDailyCashSummary, getOverdueEMIs, getSocietySummary }
}
