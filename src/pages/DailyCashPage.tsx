import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { RefreshButton } from '../components/ui/RefreshButton'
import { ReportExportButtons } from '../components/reports/ReportExportButtons'
import { formatCurrency } from '../lib/utils'
import { useTranslation } from 'react-i18next'
import { DollarSign, ArrowDownCircle, ArrowUpCircle, TrendingUp } from 'lucide-react'

export default function DailyCashPage() {
  const { samitiId } = useAuth()
  const { t } = useTranslation()
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [loading, setLoading] = useState(true)
  const [deposits, setDeposits] = useState(0)
  const [withdrawals, setWithdrawals] = useState(0)
  const [profitCredited, setProfitCredited] = useState(0)
  const [loanDisbursements, setLoanDisbursements] = useState(0)
  const [loanRepayments, setLoanRepayments] = useState(0)
  const [netCashFlow, setNetCashFlow] = useState(0)
  const [transactions, setTransactions] = useState<{ desc: string; debit: number; credit: number }[]>([])

  const loadData = useCallback(async () => {
    if (!samitiId) return
    setLoading(true)

    // Get journal entries for the date
    const { data: entries } = await supabase
      .from('journal_entries')
      .select('id, description')
      .eq('samiti_id', samitiId)
      .eq('entry_date', date)

    if (!entries || entries.length === 0) {
      setDeposits(0); setWithdrawals(0); setProfitCredited(0)
      setLoanDisbursements(0); setLoanRepayments(0)
      setNetCashFlow(0); setTransactions([])
      setLoading(false); return
    }

    const entryIds = entries.map((e: { id: string }) => e.id)
    const entryMap = new Map(entries.map((e: { id: string; description: string }) => [e.id, e.description]))

    // Get CASH account ID
    const { data: cashAcct } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('samiti_id', samitiId)
      .eq('account_code', 'CASH')
      .maybeSingle()

    if (!cashAcct) { setLoading(false); return }

    // Get all lines from these entries
    const { data: allLines } = await supabase
      .from('journal_entry_lines')
      .select('debit_amount, credit_amount, account_id, journal_entry_id')
      .in('journal_entry_id', entryIds)

    if (!allLines) { setLoading(false); return }

    // Cash lines only
    const cashLines = allLines.filter((l: { account_id: string }) => l.account_id === cashAcct.id)

    let dep = 0, wd = 0

    for (const l of cashLines as { debit_amount: number; credit_amount: number; journal_entry_id: string }[]) {
      if (l.debit_amount > 0) dep += Number(l.debit_amount)
      if (l.credit_amount > 0) wd += Number(l.credit_amount)
    }

    // Categorize all lines (not just cash) by entry type
    const entryTypes = new Map<string, string>()
    for (const e of entries) {
      const desc = e.description.toLowerCase()
      if (desc.includes('savings') && desc.includes('deposit')) entryTypes.set(e.id, 'deposit')
      else if (desc.includes('savings') && desc.includes('withdrawal')) entryTypes.set(e.id, 'withdrawal')
      else if (desc.includes('savings') && (desc.includes('profit') || desc.includes('distrib'))) entryTypes.set(e.id, 'profit')
      else if (desc.includes('disbursement')) entryTypes.set(e.id, 'disbursement')
      else if (desc.includes('repayment')) entryTypes.set(e.id, 'repayment')
      else entryTypes.set(e.id, 'other')
    }

    let sd = 0, sw = 0, sp = 0, ld = 0, lr = 0
    const txns: { desc: string; debit: number; credit: number }[] = []

    for (const l of allLines as { debit_amount: number; credit_amount: number; account_id: string; journal_entry_id: string }[]) {
      if (l.account_id !== cashAcct.id) continue
      const type = entryTypes.get(l.journal_entry_id) || 'other'
      const d = Number(l.debit_amount)
      const c = Number(l.credit_amount)
      const desc = entryMap.get(l.journal_entry_id) || ''

      if (type === 'deposit') { sd += d }
      else if (type === 'withdrawal') { sw += c }
      else if (type === 'profit') { sp += d }
      else if (type === 'disbursement') { ld += c }
      else if (type === 'repayment') { lr += d }

      if (d > 0 || c > 0) {
        txns.push({ desc, debit: d, credit: c })
      }
    }

    setDeposits(Math.round(sd * 100) / 100)
    setWithdrawals(Math.round(sw * 100) / 100)
    setProfitCredited(Math.round(sp * 100) / 100)
    setLoanDisbursements(Math.round(ld * 100) / 100)
    setLoanRepayments(Math.round(lr * 100) / 100)
    setNetCashFlow(Math.round((sd + lr - sw - ld) * 100) / 100)
    setTransactions(txns)
    setLoading(false)
  }, [samitiId, date])

  useEffect(() => { loadData() }, [loadData])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('dailyCash.title')}</h1>
        <div className="flex items-center gap-2">
          <ReportExportButtons
            filename={`daily-cash-${date}`}
            title={t('dailyCash.title')}
            subtitle={t('dailyCash.exportDate', { date })}
            headers={[t('dailyCash.description'), t('dailyCash.debitIn'), t('dailyCash.creditOut')]}
            rows={transactions.map((t) => [t.desc, t.debit > 0 ? formatCurrency(t.debit) : '', t.credit > 0 ? formatCurrency(t.credit) : ''])}
            totals={[
              { label: t('dailyCash.cashDeposits'), value: formatCurrency(deposits) },
              { label: t('dailyCash.cashWithdrawals'), value: formatCurrency(withdrawals) },
              { label: t('dailyCash.profitCredited'), value: formatCurrency(profitCredited) },
              { label: t('dailyCash.loanDisbursed'), value: formatCurrency(loanDisbursements) },
              { label: t('dailyCash.loanRepayments'), value: formatCurrency(loanRepayments) },
              { label: t('dailyCash.netCashFlow'), value: formatCurrency(netCashFlow) },
            ]}
          />
          <RefreshButton onRefresh={loadData} />
        </div>
      </div>

      <Card>
        <div className="flex items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('dailyCash.date')}</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <Button onClick={loadData} variant="secondary">{t('dailyCash.load')}</Button>
        </div>
      </Card>

      {loading ? (
        <Spinner size="lg" />
      ) : transactions.length === 0 ? (
        <EmptyState title={t('dailyCash.noTxTitle')} description={t('dailyCash.noTxDesc', { date })} />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card title={t('dailyCash.cashDeposits')} className="border-l-4 border-l-green-500">
              <p className="text-2xl font-bold text-green-700">{formatCurrency(deposits)}</p>
            </Card>
            <Card title={t('dailyCash.cashWithdrawals')} className="border-l-4 border-l-red-500">
              <p className="text-2xl font-bold text-red-700">{formatCurrency(withdrawals)}</p>
            </Card>
            <Card title={t('dailyCash.profitCredited')} className="border-l-4 border-l-blue-500">
              <p className="text-2xl font-bold text-blue-700">{formatCurrency(profitCredited)}</p>
            </Card>
            <Card title={t('dailyCash.loanDisbursed')} className="border-l-4 border-l-orange-500">
              <p className="text-2xl font-bold text-orange-700">{formatCurrency(loanDisbursements)}</p>
            </Card>
            <Card title={t('dailyCash.loanRepayments')} className="border-l-4 border-l-purple-500">
              <p className="text-2xl font-bold text-purple-700">{formatCurrency(loanRepayments)}</p>
            </Card>
            <Card title={t('dailyCash.netCashFlow')} className={`border-l-4 ${netCashFlow >= 0 ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
              <p className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {formatCurrency(netCashFlow)}
              </p>
            </Card>
          </div>

          <Card title={t('dailyCash.transactionDetail', { date })}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                    <th className="py-2 px-3">{t('dailyCash.description')}</th>
                    <th className="py-2 px-3 text-right">{t('dailyCash.debitIn')}</th>
                    <th className="py-2 px-3 text-right">{t('dailyCash.creditOut')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((txn, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-900">{txn.desc}</td>
                      <td className="py-2 px-3 text-right text-green-700 font-medium">{txn.debit > 0 ? formatCurrency(txn.debit) : '-'}</td>
                      <td className="py-2 px-3 text-right text-red-700 font-medium">{txn.credit > 0 ? formatCurrency(txn.credit) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
