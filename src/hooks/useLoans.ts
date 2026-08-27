import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { calculateEMISchedule } from '../lib/profit'
import { generateLoanNumber } from '../lib/utils'
import type { LoanWithDetails } from '../types/loan'

export interface LoanData {
  id: string
  samiti_id: string
  member_id: string
  loan_number: string
  amount: number
  purpose: string | null
  tenure_months: number
  profit_method: 'flat' | 'reducing_balance'
  profit_rate: number
  status: 'pending' | 'approved' | 'rejected' | 'disbursed' | 'closed'
  approved_by: string | null
  approved_at: string | null
  disbursed_at: string | null
  created_at: string
  updated_at: string
}

export interface LoanEMIData {
  id: string
  loan_id: string
  installment_no: number
  due_date: string
  principal_amount: number
  profit_amount: number
  total_amount: number
  paid_amount: number
  paid_at: string | null
  status: string
  created_at: string
}

export interface LoanApplicationInput {
  amount: number
  purpose: string
  tenure_months: number
  profit_method: 'flat' | 'reducing_balance'
  profit_rate?: number
}

export function useLoans() {
  const { samitiId, role, memberId } = useAuth()
  const [loans, setLoans] = useState<LoanData[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLoans = useCallback(async () => {
    if (!samitiId) return
    setLoading(true)
    let query = supabase.from('loans').select('*').eq('samiti_id', samitiId)

    if (role === 'member' && memberId) {
      query = query.eq('member_id', memberId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (!error && data) setLoans(data as LoanData[])
    setLoading(false)
  }, [samitiId, role, memberId])

  useEffect(() => { fetchLoans() }, [fetchLoans])

  const fetchLoansWithDetails = useCallback(async (): Promise<LoanWithDetails[]> => {
    if (!samitiId) return []

    let query = supabase
      .from('loans')
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

    const enriched: LoanWithDetails[] = []
    for (const row of data) {
      const r = row as unknown as { members: { name: string; member_number: string } }
      const { data: tx } = await supabase
        .from('loan_emi_schedule')
        .select('total_amount, paid_amount')
        .eq('loan_id', (row as LoanData).id)

      const totalPaid = tx ? tx.reduce((s: number, e: { paid_amount: number }) => s + (e.paid_amount || 0), 0) : 0
      const totalDue = tx ? tx.reduce((s: number, e: { total_amount: number }) => s + (e.total_amount || 0), 0) : 0

      enriched.push({
        ...(row as LoanData),
        member_name: r.members?.name,
        member_number: r.members?.member_number,
        total_paid: totalPaid,
        outstanding_balance: totalDue - totalPaid,
      } as unknown as LoanWithDetails)
    }

    return enriched
  }, [samitiId, role, memberId])

  const applyForLoan = async (input: LoanApplicationInput) => {
    if (!memberId) throw new Error('Member ID not found')
    const { data, error } = await supabase.from('loans').insert({
      samiti_id: samitiId,
      member_id: memberId,
      loan_number: generateLoanNumber(),
      amount: input.amount,
      purpose: input.purpose,
      tenure_months: input.tenure_months,
      profit_method: input.profit_method,
      profit_rate: input.profit_rate || 12,
      status: 'pending',
    } as never).select().single()
    if (!error && data) {
      setLoans(prev => [data as LoanData, ...prev])
    }
    return { data: data as LoanData | null, error }
  }

  const approveLoan = async (loanId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('loans').update({
      status: 'approved',
      approved_by: user?.id,
      approved_at: new Date().toISOString(),
    }).eq('id', loanId).select().single()
    if (!error && data) {
      setLoans(prev => prev.map(l => l.id === loanId ? data as LoanData : l))
    }
    return { data: data as LoanData | null, error }
  }

  const rejectLoan = async (loanId: string) => {
    const { data, error } = await supabase.from('loans').update({
      status: 'rejected',
    }).eq('id', loanId).select().single()
    if (!error && data) {
      setLoans(prev => prev.map(l => l.id === loanId ? data as LoanData : l))
    }
    return { data: data as LoanData | null, error }
  }

  const disburseLoan = async (loanId: string) => {
    const loan = loans.find(l => l.id === loanId)
    if (!loan) throw new Error('Loan not found')

    const schedule = calculateEMISchedule(
      loan.amount,
      loan.profit_rate,
      loan.tenure_months,
      loan.profit_method as 'flat' | 'reducing_balance'
    )

    const { data, error } = await supabase.from('loans').update({
      status: 'disbursed',
      disbursed_at: new Date().toISOString(),
    }).eq('id', loanId).select().single()

    if (error) return { data: null, error }

    if (data) {
      const emiRows = schedule.map(emi => ({
        loan_id: loanId,
        installment_no: emi.installment_no,
        due_date: emi.due_date.toISOString().split('T')[0],
        principal_amount: emi.principal_amount,
        profit_amount: emi.profit_amount,
        total_amount: emi.total_amount,
        status: 'pending',
      }))

      await supabase.from('loan_emi_schedule').insert(emiRows as never)

      setLoans(prev => prev.map(l => l.id === loanId ? data as LoanData : l))
    }
    return { data: data as LoanData | null, error }
  }

  const getEMISchedule = useCallback(async (loanId: string) => {
    const { data, error } = await supabase
      .from('loan_emi_schedule')
      .select('*')
      .eq('loan_id', loanId)
      .order('installment_no', { ascending: true })
    return { data: data as LoanEMIData[] | null, error }
  }, [])

  return {
    loans, loading, fetchLoans, fetchLoansWithDetails, applyForLoan,
    approveLoan, rejectLoan, disburseLoan, getEMISchedule,
  }
}
