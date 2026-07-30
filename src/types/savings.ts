import type { SavingsAccountRow, SavingsTransactionRow } from './database'

export type SavingsAccount = SavingsAccountRow
export type SavingsTransaction = SavingsTransactionRow

export interface SavingsAccountWithBalance extends SavingsAccount {
  current_balance: number
  member_name?: string
  member_number?: string
}
