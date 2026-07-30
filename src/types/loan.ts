import type { LoanRow, LoanEMIRow } from './database'

export type Loan = LoanRow
export type LoanEMI = LoanEMIRow

export interface LoanWithDetails extends Loan {
  member_name?: string
  member_number?: string
  total_paid?: number
  outstanding_balance?: number
  emi_schedule?: LoanEMI[]
}

export interface LoanApplicationInput {
  amount: number
  purpose: string
  tenure_months: number
  profit_method: 'flat' | 'reducing_balance'
  profit_rate?: number
}
