import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { generateAccountNumber } from '../lib/utils'

export interface SavingsAccountData {
  id: string
  samiti_id: string
  member_id: string
  account_type: string
  account_number: string
  opened_date: string
  status: string
  created_at: string
}

export interface SavingsAccountWithMember extends SavingsAccountData {
  member_name?: string
  member_number?: string
  balance?: number
}

export interface SavingsTransactionData {
  id: string
  samiti_id: string
  savings_account_id: string
  transaction_type: string
  amount: number
  balance_after: number
  reference: string | null
  reason_note: string | null
  payment_method: string | null
  performed_by: string
  created_at: string
}

export function useSavings() {
  const { samitiId, role, memberId } = useAuth()
  const [accounts, setAccounts] = useState<SavingsAccountData[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAccounts = useCallback(async () => {
    if (!samitiId) return
    setLoading(true)

    let query = supabase
      .from('savings_accounts')
      .select('*')
      .eq('samiti_id', samitiId)

    if (role === 'member' && memberId) {
      query = query.eq('member_id', memberId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (!error && data) setAccounts(data as SavingsAccountData[])
    setLoading(false)
  }, [samitiId, role, memberId])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  const fetchAccountsWithMembers = useCallback(async (): Promise<SavingsAccountWithMember[]> => {
    if (!samitiId) return []

    let query = supabase
      .from('savings_accounts')
      .select(`
        *,
        members!inner(name, member_number)
      `)
      .eq('samiti_id', samitiId)

    if (role === 'member' && memberId) {
      query = query.eq('member_id', memberId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error || !data) return []

    const result: SavingsAccountWithMember[] = []
    for (const row of data as SavingsAccountData[]) {
      const acct = row as unknown as SavingsAccountData & { members: { name: string; member_number: string } }
      const { data: tx } = await supabase
        .from('savings_transactions')
        .select('balance_after')
        .eq('savings_account_id', acct.id)
        .order('created_at', { ascending: false })
        .limit(1)

      result.push({
        ...acct,
        member_name: acct.members?.name,
        member_number: acct.members?.member_number,
        balance: (tx && tx.length > 0) ? (tx[0] as { balance_after: number }).balance_after : 0,
      })
    }

    return result
  }, [samitiId, role, memberId])

  const createAccount = async (memberId: string, accountType: string = 'general') => {
    const accountNumber = generateAccountNumber()
    const { data, error } = await supabase.from('savings_accounts').insert({
      samiti_id: samitiId,
      member_id: memberId,
      account_type: accountType,
      account_number: accountNumber,
      status: 'active',
    } as never).select().single()
    if (!error) {
      await fetchAccounts()
    }
    return { data: data as SavingsAccountData | null, error }
  }

  const getBalance = useCallback(async (accountId: string): Promise<number> => {
    const { data } = await supabase
      .from('savings_transactions')
      .select('balance_after')
      .eq('savings_account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(1)
    if (data && data.length > 0) {
      return (data[0] as { balance_after: number }).balance_after
    }
    return 0
  }, [])

  const recordTransaction = async (tx: {
    savings_account_id: string
    transaction_type: string
    amount: number
    reference?: string
    reason_note?: string
    payment_method?: string
  }) => {
    const currentBalance = await getBalance(tx.savings_account_id)
    const isCredit = tx.transaction_type === 'deposit' || tx.transaction_type === 'profit'
    const balanceAfter = isCredit ? currentBalance + tx.amount : currentBalance - tx.amount

    if (balanceAfter < 0) {
      throw new Error('Insufficient balance')
    }

    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('savings_transactions').insert({
      samiti_id: samitiId,
      savings_account_id: tx.savings_account_id,
      transaction_type: tx.transaction_type,
      amount: tx.amount,
      balance_after: balanceAfter,
      reference: tx.reference || null,
      reason_note: tx.reason_note || null,
      payment_method: tx.payment_method || null,
      performed_by: user?.id,
    } as never).select().single()
    if (!error && data && samitiId) {
      const { autoJournalize } = await import('../lib/accounting')
      let jTxType = ''
      if (tx.transaction_type === 'deposit') jTxType = 'savings_deposit'
      else if (tx.transaction_type === 'withdrawal') jTxType = 'savings_withdrawal'
      else if (tx.transaction_type === 'profit') jTxType = 'savings_profit'

      if (jTxType) {
        await autoJournalize({
          samitiId,
          transactionType: jTxType,
          description: `Savings ${tx.transaction_type} - ${tx.reference || data.id}`,
          amount: tx.amount,
          referenceId: data.id,
          referenceTable: 'savings_transactions',
          performedBy: user?.id || '',
          entryDate: new Date().toISOString().split('T')[0],
        })
      }
    }
    return { data: data as SavingsTransactionData | null, error }
  }

  const getTransactions = useCallback(async (accountId: string) => {
    const { data, error } = await supabase
      .from('savings_transactions')
      .select('*')
      .eq('savings_account_id', accountId)
      .order('created_at', { ascending: false })
    return { data: data as SavingsTransactionData[] | null, error }
  }, [])

  return { accounts, loading, fetchAccounts, fetchAccountsWithMembers, createAccount, getBalance, recordTransaction, getTransactions }
}
