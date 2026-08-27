import { useEffect, useState, useCallback } from 'react'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Spinner } from '../components/ui/Spinner'
import { RefreshButton } from '../components/ui/RefreshButton'
import { ReportExportButtons } from '../components/reports/ReportExportButtons'
import { getProfitAndLoss, getIncomeExpenseTransactions, type IncomeExpenseLine, type TransactionDetail } from '../lib/accounting'
import { useAuth } from '../hooks/useAuth'
import { formatCurrency, formatDate } from '../lib/utils'
import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, Search, ChevronDown, ChevronUp } from 'lucide-react'

export default function IncomeExpensePage() {
  const { samitiId } = useAuth()
  const { t } = useTranslation()
  const currentYear = new Date().getFullYear()
  const [fromDate, setFromDate] = useState(`${currentYear}-01-01`)
  const [toDate, setToDate] = useState(`${currentYear}-12-31`)
  const [income, setIncome] = useState<IncomeExpenseLine[]>([])
  const [expenses, setExpenses] = useState<IncomeExpenseLine[]>([])
  const [totalIncome, setTotalIncome] = useState(0)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [netProfit, setNetProfit] = useState(0)
  const [transactions, setTransactions] = useState<TransactionDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [txSearch, setTxSearch] = useState('')
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set())

  const loadReport = useCallback(async () => {
    if (!samitiId) return
    setLoading(true)
    setError(null)
    try {
      const [result, txs] = await Promise.all([
        getProfitAndLoss({ samitiId, fromDate, toDate }),
        getIncomeExpenseTransactions({ samitiId, fromDate, toDate }),
      ])
      setIncome(result.income)
      setExpenses(result.expenses)
      setTotalIncome(result.totalIncome)
      setTotalExpenses(result.totalExpenses)
      setNetProfit(result.netProfit)
      setTransactions(txs)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : t('reports.loadFailed'))
    }
    setLoading(false)
  }, [samitiId, fromDate, toDate])

  useEffect(() => { loadReport() }, [loadReport])

  const toggleAccount = (code: string) => {
    setExpandedAccounts((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code); else next.add(code)
      return next
    })
  }

  const filteredTx = transactions.filter((tx) =>
    !txSearch ||
    tx.description.toLowerCase().includes(txSearch.toLowerCase()) ||
    tx.account_name.toLowerCase().includes(txSearch.toLowerCase()) ||
    tx.account_code.toLowerCase().includes(txSearch.toLowerCase())
  )

  // Group transactions by account for the account detail section
  const txByAccount: Record<string, TransactionDetail[]> = {}
  for (const tx of transactions) {
    const key = tx.account_code
    if (!txByAccount[key]) txByAccount[key] = []
    txByAccount[key].push(tx)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('accounting.incomeStatement')}</h1>
        <div className="flex items-center gap-2">
          <ReportExportButtons
            filename={`income-expense-${fromDate}-${toDate}`}
            title={t('accounting.incomeStatement')}
            subtitle={t('accounting.reportPeriodRange', { from: fromDate, to: toDate })}
            headers={[t('common.date'), t('accounting.description'), t('accounting.account'), t('common.type'), t('common.amount')]}
            rows={filteredTx.map((tx) => [
              formatDate(tx.date),
              tx.description,
              `${tx.account_name} (${tx.account_code})`,
              tx.type,
              `${tx.type === 'income' ? '+' : '-'}${formatCurrency(tx.amount)}`,
            ])}
            totals={[
              { label: t('accounting.totalIncome'), value: formatCurrency(totalIncome) },
              { label: t('accounting.totalExpense'), value: formatCurrency(totalExpenses) },
              { label: t('accounting.netProfitLoss'), value: formatCurrency(netProfit) },
            ]}
          />
          <RefreshButton onRefresh={loadReport} />
        </div>
      </div>

      {/* Date filter */}
      <Card>
        <div className="flex items-end gap-3 flex-wrap">
          <Input
            id="from"
            label={t('reports.fromDate')}
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-44"
          />
          <Input
            id="to"
            label={t('reports.toDate')}
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-44"
          />
          <Button onClick={loadReport} loading={loading}>{t('accounting.runReport')}</Button>
        </div>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <Spinner size="md" />
      ) : (
        <>
          {/* ── Summary Cards ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-green-500">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm text-gray-500">{t('accounting.totalIncome')}</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
                </div>
              </div>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <div className="flex items-center gap-3">
                <TrendingDown className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-sm text-gray-500">{t('accounting.totalExpense')}</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
                </div>
              </div>
            </Card>
            <Card className={`border-l-4 ${netProfit >= 0 ? 'border-l-blue-500' : 'border-l-red-500'}`}>
              <div className="flex items-center gap-3">
                <DollarSign className={`h-8 w-8 ${netProfit >= 0 ? 'text-blue-500' : 'text-red-500'}`} />
                <div>
                  <p className="text-sm text-gray-500">{t('accounting.netProfitLoss')}</p>
                  <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {formatCurrency(netProfit)}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* ── Per-Account Breakdown with Transaction Drill-down ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title={t('accounting.incomeAccountsCount', { accounts: income.length, entries: transactions.filter(t => t.type === 'income').length })}>
              {income.length === 0 ? (
                <p className="text-sm text-gray-500">{t('accounting.noIncomeRecorded')}</p>
              ) : (
                <div className="space-y-1 text-sm">
                  {income.map((i) => {
                    const acctTxs = txByAccount[i.code]?.filter(t => t.type === 'income') || []
                    const isOpen = expandedAccounts.has(i.code)
                    return (
                      <div key={i.code}>
                        <div
                          className="flex justify-between py-1.5 border-b hover:bg-green-50 cursor-pointer px-1 rounded transition-colors"
                          onClick={() => toggleAccount(i.code)}
                        >
                          <span className="text-gray-700 flex items-center gap-1.5">
                            {acctTxs.length > 0 && (
                              isOpen ? <ChevronUp className="h-3 w-3 text-gray-400" /> : <ChevronDown className="h-3 w-3 text-gray-400" />
                            )}
                            {i.name} <span className="text-gray-400 font-mono text-xs">({i.code})</span>
                          </span>
                          <span className="font-medium text-green-600">{formatCurrency(i.amount)}</span>
                        </div>
                        {isOpen && acctTxs.length > 0 && (
                          <div className="bg-green-50/50 rounded-b px-3 py-1 space-y-0.5">
                            {acctTxs.map((tx) => (
                              <div key={tx.id} className="flex justify-between text-xs text-gray-600 py-0.5">
                                <span>
                                  <span className="text-gray-400">{formatDate(tx.date)}</span>
                                  <span className="ml-2">{tx.description}</span>
                                </span>
                                <span className="font-medium text-green-600">{formatCurrency(tx.amount)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between text-xs font-semibold text-green-700 border-t border-green-200 pt-0.5 mt-0.5">
                              <span>{t('common.total')}</span>
                              <span>{formatCurrency(i.amount)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>{t('accounting.totalIncome')}</span>
                    <span className="text-green-600">{formatCurrency(totalIncome)}</span>
                  </div>
                </div>
              )}
            </Card>

            <Card title={t('accounting.expenseAccountsCount', { accounts: expenses.length, entries: transactions.filter(t => t.type === 'expense').length })}>
              {expenses.length === 0 ? (
                <p className="text-sm text-gray-500">{t('accounting.noExpensesRecorded')}</p>
              ) : (
                <div className="space-y-1 text-sm">
                  {expenses.map((e) => {
                    const acctTxs = txByAccount[e.code]?.filter(t => t.type === 'expense') || []
                    const isOpen = expandedAccounts.has(e.code)
                    return (
                      <div key={e.code}>
                        <div
                          className="flex justify-between py-1.5 border-b hover:bg-red-50 cursor-pointer px-1 rounded transition-colors"
                          onClick={() => toggleAccount(e.code)}
                        >
                          <span className="text-gray-700 flex items-center gap-1.5">
                            {acctTxs.length > 0 && (
                              isOpen ? <ChevronUp className="h-3 w-3 text-gray-400" /> : <ChevronDown className="h-3 w-3 text-gray-400" />
                            )}
                            {e.name} <span className="text-gray-400 font-mono text-xs">({e.code})</span>
                          </span>
                          <span className="font-medium text-red-600">{formatCurrency(e.amount)}</span>
                        </div>
                        {isOpen && acctTxs.length > 0 && (
                          <div className="bg-red-50/50 rounded-b px-3 py-1 space-y-0.5">
                            {acctTxs.map((tx) => (
                              <div key={tx.id} className="flex justify-between text-xs text-gray-600 py-0.5">
                                <span>
                                  <span className="text-gray-400">{formatDate(tx.date)}</span>
                                  <span className="ml-2">{tx.description}</span>
                                </span>
                                <span className="font-medium text-red-600">{formatCurrency(tx.amount)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between text-xs font-semibold text-red-700 border-t border-red-200 pt-0.5 mt-0.5">
                              <span>{t('common.total')}</span>
                              <span>{formatCurrency(e.amount)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>{t('accounting.totalExpense')}</span>
                    <span className="text-red-600">{formatCurrency(totalExpenses)}</span>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* ── Full Transaction Ledger ── */}
          <Card
            title={
              <div className="flex items-center justify-between w-full">
                <span>{t('accounting.allTransactions')} ({transactions.length})</span>
                <div className="relative w-64">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('accounting.searchTransactionsPlaceholder')}
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            }
          >
            {filteredTx.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">{t('accounting.noTransactionsFound')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs font-medium text-gray-500 uppercase">
                      <th className="pb-3 pr-4">{t('common.date')}</th>
                      <th className="pb-3 pr-4">{t('accounting.description')}</th>
                      <th className="pb-3 pr-4">{t('accounting.account')}</th>
                      <th className="pb-3 pr-4">{t('common.type')}</th>
                      <th className="pb-3 pr-4 text-right">{t('common.amount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTx.map((tx) => (
                      <tr key={tx.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-2.5 pr-4 text-gray-500 whitespace-nowrap">{formatDate(tx.date)}</td>
                        <td className="py-2.5 pr-4 font-medium">{tx.description}</td>
                        <td className="py-2.5 pr-4">
                          {tx.account_name} <span className="text-gray-400 font-mono text-xs">({tx.account_code})</span>
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge variant={tx.type === 'income' ? 'success' : 'danger'}>{t(`txnType.${tx.type}`)}</Badge>
                        </td>
                        <td className={`py-2.5 pr-4 text-right font-medium ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-semibold">
                      <td className="pt-3 pr-4" colSpan={4}>{t('accounting.totalIncomeExpense')}</td>
                      <td className="pt-3 pr-4 text-right">
                        <span className="text-green-600">{formatCurrency(totalIncome)}</span>
                        {' / '}
                        <span className="text-red-600">{formatCurrency(totalExpenses)}</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
