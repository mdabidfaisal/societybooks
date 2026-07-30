import { supabase } from './supabase'
import { generateEntryNumber } from './utils'

export interface AccountMapping {
  id: string
  samiti_id: string
  transaction_type: string
  debit_account_code: string
  credit_account_code: string
}

// Mapping helpers shared between client and DB triggers
export const TRANSACTION_ENTRY_TYPE: Record<string, string> = {
  savings_deposit: 'deposit',
  savings_withdrawal: 'withdrawal',
  savings_profit: 'profit_posting',
  loan_disbursement: 'loan_disbursement',
  loan_repayment_principal: 'loan_repayment',
  loan_repayment_profit: 'loan_repayment',
}

const DEFAULT_MAPPINGS: Record<string, { debit: string; credit: string }> = {
  savings_deposit:           { debit: 'CASH', credit: 'SAVINGS_LIABILITY' },
  savings_withdrawal:        { debit: 'SAVINGS_LIABILITY', credit: 'CASH' },
  savings_profit:            { debit: 'SAVINGS_PROFIT_EXP', credit: 'SAVINGS_LIABILITY' },
  loan_disbursement:         { debit: 'LOANS_RECEIVABLE', credit: 'CASH' },
  loan_repayment_principal:  { debit: 'CASH', credit: 'LOANS_RECEIVABLE' },
  loan_repayment_profit:     { debit: 'CASH', credit: 'LOAN_PROFIT_INCOME' },
}

export async function autoJournalize(params: {
  samitiId: string
  transactionType: string
  description: string
  amount: number
  referenceId?: string
  referenceTable?: string
  performedBy: string
  entryDate?: string
  extraLines?: { account_code: string; debit: number; credit: number }[]
}) {
  // Best-effort client-side auto-journalize.
  // The authoritative source is the DB trigger (023_auto_journalize_triggers.sql).
  // This provides immediate UI feedback but is not required for correctness.

  const entryType = TRANSACTION_ENTRY_TYPE[params.transactionType]
  if (!entryType) return null

  // Try admin mapping first, then fall back to defaults
  let debit: string | undefined
  let credit: string | undefined

  const { data: adminMapping } = await supabase
    .from('system_account_mappings')
    .select('debit_account_code, credit_account_code')
    .eq('samiti_id', params.samitiId)
    .eq('transaction_type', params.transactionType)
    .maybeSingle()

  if (adminMapping) {
    const m = adminMapping as { debit_account_code: string; credit_account_code: string }
    const { data: dAcct } = await supabase.from('chart_of_accounts').select('id').eq('samiti_id', params.samitiId).eq('account_code', m.debit_account_code).maybeSingle()
    const { data: cAcct } = await supabase.from('chart_of_accounts').select('id').eq('samiti_id', params.samitiId).eq('account_code', m.credit_account_code).maybeSingle()
    if (dAcct && cAcct) { debit = m.debit_account_code; credit = m.credit_account_code }
  }

  if (!debit) {
    const def = DEFAULT_MAPPINGS[params.transactionType]
    if (def) { debit = def.debit; credit = def.credit }
  }

  if (!debit || !credit) return null

  const lines: JournalLineInput[] = [
    { account_code: debit, debit: params.amount, credit: 0 },
    { account_code: credit, debit: 0, credit: params.amount },
  ]
  if (params.extraLines) {
    for (const el of params.extraLines) lines.push({ account_code: el.account_code, debit: el.debit, credit: el.credit })
  }

  try {
    return await postJournalEntry({ ...params, entryType, lines })
  } catch {
    return null
  }
}

export interface JournalLineInput {
  account_code: string
  debit: number
  credit: number
  description?: string
}

export async function postJournalEntry(params: {
  samitiId: string
  entryType: string
  description: string
  entryDate?: string
  referenceId?: string
  referenceTable?: string
  lines: JournalLineInput[]
  performedBy: string
}) {
  const totalDebit = params.lines.reduce((sum, l) => sum + l.debit, 0)
  const totalCredit = params.lines.reduce((sum, l) => sum + l.credit, 0)

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Debit (${totalDebit}) and credit (${totalCredit}) must match`)
  }

  const entryNumber = generateEntryNumber()

  const { data: entry, error: entryError } = await supabase
    .from('journal_entries')
    .insert({
      samiti_id: params.samitiId,
      entry_number: entryNumber,
      entry_date: params.entryDate || new Date().toISOString().split('T')[0],
      description: params.description,
      entry_type: params.entryType,
      reference_id: params.referenceId || null,
      reference_table: params.referenceTable || null,
      total_debit: totalDebit,
      total_credit: totalCredit,
      performed_by: params.performedBy,
    })
    .select()
    .single()

  if (entryError) throw entryError

  // Validate and filter lines before inserting
  const validLines = params.lines.filter((line) => {
    if (!line.account_code) return false
    if (line.debit <= 0 && line.credit <= 0) return false
    if (line.debit > 0 && line.credit > 0) return false
    return true
  })

  if (validLines.length === 0) {
    throw new Error('No valid journal lines provided')
  }

  for (const line of validLines) {
    const { data: account, error: acctError } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('samiti_id', params.samitiId)
      .eq('account_code', line.account_code)
      .maybeSingle()

    if (acctError || !account) {
      // Clean up the created entry
      await supabase.from('journal_entries').delete().eq('id', entry.id)
      throw new Error(`Account "${line.account_code}" not found in chart of accounts`)
    }

    const { error: insertError } = await supabase.from('journal_entry_lines').insert({
      journal_entry_id: entry.id,
      account_id: account.id,
      debit_amount: line.debit,
      credit_amount: line.credit,
      description: line.description || null,
    })

    if (insertError) {
      // Clean up the created entry
      await supabase.from('journal_entries').delete().eq('id', entry.id)
      throw new Error(`Failed to insert journal line: ${insertError.message}`)
    }
  }

  return { entry, error: null }
}

export interface IncomeExpenseLine {
  code: string
  name: string
  amount: number
}

export interface TransactionDetail {
  id: string
  date: string
  description: string
  account_code: string
  account_name: string
  type: 'income' | 'expense'
  amount: number
  source: 'journal' | 'loan_profit' | 'savings_profit'
}

export interface ProfitLossResult {
  income: IncomeExpenseLine[]
  expenses: IncomeExpenseLine[]
  totalIncome: number
  totalExpenses: number
  netProfit: number
}

export async function getProfitAndLoss(params: {
  samitiId: string
  fromDate: string
  toDate: string
}): Promise<ProfitLossResult> {
  const incomeMap = new Map<string, { name: string; amount: number }>()
  const expenseMap = new Map<string, { name: string; amount: number }>()

  const isInRange = (dateStr: string) => {
    if (!params.fromDate && !params.toDate) return true
    if (params.fromDate && dateStr < params.fromDate) return false
    if (params.toDate && dateStr > params.toDate) return false
    return true
  }

  // ── 1. Income from loan profit (EMI schedule) ──
  const { data: loans } = await supabase
    .from('loans')
    .select('id')
    .eq('samiti_id', params.samitiId)

  if (loans && loans.length > 0) {
    const loanIds = loans.map((l: { id: string }) => l.id)

    const { data: emiData } = await supabase
      .from('loan_emi_schedule')
      .select('profit_amount, paid_amount, total_amount, paid_at')
      .in('loan_id', loanIds)
      .gt('paid_amount', 0)

    if (emiData) {
      let totalLoanProfit = 0
      for (const emi of emiData) {
        const e = emi as { profit_amount: number; paid_amount: number; total_amount: number; paid_at: string | null }
        if (!e.paid_at) continue
        if (!isInRange(e.paid_at)) continue
        const ratio = Math.min(e.paid_amount / e.total_amount, 1)
        totalLoanProfit += e.profit_amount * ratio
      }
      if (totalLoanProfit > 0) {
        incomeMap.set('loan_profit', { name: 'Loan Profit (Interest)', amount: Math.round(totalLoanProfit * 100) / 100 })
      }
    }
  }

  // ── 2. Income/Expense from savings transactions ──
  const { data: savingsTx } = await supabase
    .from('savings_transactions')
    .select('transaction_type, amount, created_at')
    .eq('samiti_id', params.samitiId)

  if (savingsTx) {
    let totalSavingProfitExpense = 0
    for (const tx of savingsTx) {
      if (!isInRange((tx as { created_at: string }).created_at.split('T')[0])) continue
      const t = tx as { transaction_type: string; amount: number }
      if (t.transaction_type === 'profit') {
        // Profit credited to member savings = expense for cooperative
        totalSavingProfitExpense += t.amount
      }
    }
    if (totalSavingProfitExpense > 0) {
      expenseMap.set('savings_profit', { name: 'Savings Profit Paid', amount: totalSavingProfitExpense })
    }
  }

  // ── 3. Income/Expense from journal entries (manual) ──
  let entriesQuery = supabase
    .from('journal_entries')
    .select('id, entry_date')
    .eq('samiti_id', params.samitiId)

  if (params.fromDate) entriesQuery = entriesQuery.gte('entry_date', params.fromDate)
  if (params.toDate) entriesQuery = entriesQuery.lte('entry_date', params.toDate)

  const { data: filteredEntries } = await entriesQuery

  if (filteredEntries && filteredEntries.length > 0) {
    const entryIds = filteredEntries.map((e: { id: string }) => e.id)

    const { data: lines } = await supabase
      .from('journal_entry_lines')
      .select('debit_amount, credit_amount, account_id')
      .in('journal_entry_id', entryIds)

    if (lines && lines.length > 0) {
      const accountIds = [...new Set(lines.map((l: { account_id: string }) => l.account_id))]

      const { data: accounts } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name, account_type')
        .eq('samiti_id', params.samitiId)
        .in('id', accountIds)

      if (accounts) {
        const accountMap = new Map(accounts.map((a: { id: string }) => [a.id, a]))

        const journalIncome = new Map<string, { name: string; amount: number }>()
        const journalExpense = new Map<string, { name: string; amount: number }>()

        for (const line of lines) {
          const acct = accountMap.get(line.account_id)
          if (!acct) continue

          const a = acct as unknown as { account_code: string; account_name: string; account_type: string }
          const balance = (line.credit_amount as number) - (line.debit_amount as number)

          if (a.account_type === 'income') {
            const existing = journalIncome.get(a.account_code)
            journalIncome.set(a.account_code, {
              name: a.account_name,
              amount: (existing?.amount || 0) + balance,
            })
          } else if (a.account_type === 'expense') {
            const existing = journalExpense.get(a.account_code)
            journalExpense.set(a.account_code, {
              name: a.account_name,
              amount: (existing?.amount || 0) + Math.abs(balance),
            })
          }
        }

        for (const [code, val] of journalIncome) {
          incomeMap.set(`je_${code}`, val)
        }
        for (const [code, val] of journalExpense) {
          expenseMap.set(`je_${code}`, val)
        }
      }
    }
  }

  // ── 4. Income from exit settlement fees (if any profit realised) ──
  const { data: exits } = await supabase
    .from('members')
    .select('exit_settlement_amount, exit_date')
    .eq('samiti_id', params.samitiId)
    .not('exit_settlement_amount', 'is', null)

  if (exits) {
    // Exit settlements reduce member equity, any positive amount means the
    // cooperative pays out – this is already captured if journalized.
  }

  const income = [...incomeMap.entries()]
    .filter(([, v]) => v.amount > 0)
    .map(([code, v]) => ({ code, name: v.name, amount: Math.round(v.amount * 100) / 100 }))

  const expenses = [...expenseMap.entries()]
    .filter(([, v]) => v.amount > 0)
    .map(([code, v]) => ({ code, name: v.name, amount: Math.round(v.amount * 100) / 100 }))

  const totalIncome = income.reduce((s, i) => s + i.amount, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)

  return {
    income,
    expenses,
    totalIncome,
    totalExpenses,
    netProfit: Math.round((totalIncome - totalExpenses) * 100) / 100,
  }
}

export async function getIncomeExpenseTransactions(params: {
  samitiId: string
  fromDate: string
  toDate: string
}): Promise<TransactionDetail[]> {
  const transactions: TransactionDetail[] = []

  const isInRange = (dateStr: string) => {
    if (!params.fromDate && !params.toDate) return true
    const d = dateStr.slice(0, 10)
    if (params.fromDate && d < params.fromDate) return false
    if (params.toDate && d > params.toDate) return false
    return true
  }

  // ── 1. Loan profit from EMI schedule ──
  const { data: loans } = await supabase
    .from('loans')
    .select('id')
    .eq('samiti_id', params.samitiId)

  if (loans && loans.length > 0) {
    const loanIds = loans.map((l: { id: string }) => l.id)

    const { data: emiData } = await supabase
      .from('loan_emi_schedule')
      .select('id, profit_amount, paid_amount, total_amount, paid_at, installment_no')
      .in('loan_id', loanIds)
      .gt('paid_amount', 0)

    if (emiData) {
      for (const emi of emiData) {
        const e = emi as { id: string; profit_amount: number; paid_amount: number; total_amount: number; paid_at: string | null; installment_no: number }
        if (!e.paid_at || !isInRange(e.paid_at)) continue
        const ratio = Math.min(e.paid_amount / e.total_amount, 1)
        const realizedProfit = Math.round(e.profit_amount * ratio * 100) / 100
        if (realizedProfit <= 0) continue
        transactions.push({
          id: `emi_${e.id}`,
          date: e.paid_at.slice(0, 10),
          description: `Loan EMI #${e.installment_no} profit`,
          account_code: 'loan_profit',
          account_name: 'Loan Profit (Interest)',
          type: 'income',
          amount: realizedProfit,
          source: 'loan_profit',
        })
      }
    }
  }

  // ── 2. Savings profit expense transactions ──
  const { data: savingsTx } = await supabase
    .from('savings_transactions')
    .select('id, amount, created_at')
    .eq('samiti_id', params.samitiId)
    .eq('transaction_type', 'profit')

  if (savingsTx) {
    for (const tx of savingsTx) {
      const t = tx as { id: string; amount: number; created_at: string }
      if (!isInRange(t.created_at)) continue
      transactions.push({
        id: `savings_${t.id}`,
        date: t.created_at.slice(0, 10),
        description: 'Savings profit credited to member',
        account_code: 'savings_profit',
        account_name: 'Savings Profit Paid',
        type: 'expense',
        amount: Math.round(t.amount * 100) / 100,
        source: 'savings_profit',
      })
    }
  }

  // ── 3. Journal entry lines (income/expense accounts) ──
  let entriesQuery = supabase
    .from('journal_entries')
    .select('id, entry_date, description')
    .eq('samiti_id', params.samitiId)

  if (params.fromDate) entriesQuery = entriesQuery.gte('entry_date', params.fromDate)
  if (params.toDate) entriesQuery = entriesQuery.lte('entry_date', params.toDate)

  const { data: filteredEntries } = await entriesQuery

  if (filteredEntries && filteredEntries.length > 0) {
    const entryIds = filteredEntries.map((e: { id: string }) => e.id)
    const entryMap = new Map(filteredEntries.map((e: { id: string; entry_date: string; description: string }) => [e.id, e]))

    const { data: lines } = await supabase
      .from('journal_entry_lines')
      .select('id, debit_amount, credit_amount, account_id, journal_entry_id')
      .in('journal_entry_id', entryIds)

    if (lines && lines.length > 0) {
      const accountIds = [...new Set(lines.map((l: { account_id: string }) => l.account_id))]

      const { data: accounts } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name, account_type')
        .eq('samiti_id', params.samitiId)
        .in('id', accountIds)

      if (accounts) {
        const accountMap = new Map(accounts.map((a: { id: string }) => [a.id, a]))

        for (const line of lines) {
          const l = line as { id: string; debit_amount: number; credit_amount: number; account_id: string; journal_entry_id: string }
          const acct = accountMap.get(l.account_id)
          if (!acct) continue

          const a = acct as unknown as { account_code: string; account_name: string; account_type: string }
          if (a.account_type !== 'income' && a.account_type !== 'expense') continue

          const entry = entryMap.get(l.journal_entry_id)
          const balance = (l.credit_amount) - (l.debit_amount)
          const absAmount = Math.abs(balance)

          if (absAmount <= 0) continue

          transactions.push({
            id: `je_${l.id}`,
            date: entry?.entry_date || '',
            description: entry?.description || 'Journal entry',
            account_code: a.account_code,
            account_name: a.account_name,
            type: a.account_type as 'income' | 'expense',
            amount: absAmount,
            source: 'journal',
          })
        }
      }
    }
  }

  transactions.sort((a, b) => b.date.localeCompare(a.date))
  return transactions
}
