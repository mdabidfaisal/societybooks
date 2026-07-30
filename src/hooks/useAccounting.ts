import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface ChartOfAccountData {
  id: string
  samiti_id: string
  account_code: string
  account_name: string
  account_type: string
  is_system: boolean
  is_active: boolean
  created_at: string
}

export interface JournalEntryData {
  id: string
  samiti_id: string
  entry_number: string
  entry_date: string
  description: string
  entry_type: string
  reference_id: string | null
  reference_table: string | null
  total_debit: number
  total_credit: number
  performed_by: string
  created_at: string
}

export function useAccounting() {
  const { samitiId } = useAuth()
  const [accounts, setAccounts] = useState<ChartOfAccountData[]>([])
  const [entries, setEntries] = useState<JournalEntryData[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAccounts = useCallback(async () => {
    if (!samitiId) return
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('samiti_id', samitiId)
      .eq('is_active', true)
      .order('account_code', { ascending: true })
    if (!error && data) setAccounts(data as ChartOfAccountData[])
  }, [samitiId])

  const fetchEntries = useCallback(async () => {
    if (!samitiId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('samiti_id', samitiId)
      .order('created_at', { ascending: false })
      .limit(100)
    if (!error && data) setEntries(data as JournalEntryData[])
    setLoading(false)
  }, [samitiId])

  useEffect(() => {
    fetchAccounts()
    fetchEntries()
  }, [fetchAccounts, fetchEntries])

  const createAccount = async (account: {
    account_code: string
    account_name: string
    account_type: string
  }) => {
    const { data, error } = await supabase.from('chart_of_accounts').insert({
      samiti_id: samitiId,
      account_code: account.account_code,
      account_name: account.account_name,
      account_type: account.account_type,
    } as never).select().single()
    if (!error && data) {
      setAccounts(prev => [...prev, data as ChartOfAccountData])
    }
    return { data: data as ChartOfAccountData | null, error }
  }

  const getEntry = useCallback(async (entryId: string) => {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('id', entryId)
      .single()
    return { data: data as JournalEntryData | null, error }
  }, [])

  return { accounts, entries, loading, fetchAccounts, fetchEntries, createAccount, getEntry }
}
