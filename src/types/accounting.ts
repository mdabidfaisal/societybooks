import type { ChartOfAccountRow, JournalEntryRow, JournalEntryLineRow } from './database'

export type ChartOfAccount = ChartOfAccountRow
export type JournalEntry = JournalEntryRow
export type JournalEntryLine = JournalEntryLineRow

export interface JournalEntryWithLines extends JournalEntry {
  lines?: (JournalEntryLine & { account?: ChartOfAccount })[]
}

export interface ProfitLossReport {
  income: { code: string; name: string; amount: number }[]
  expenses: { code: string; name: string; amount: number }[]
  totalIncome: number
  totalExpenses: number
  netProfit: number
}
