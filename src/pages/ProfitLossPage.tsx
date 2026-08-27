import { useEffect, useState, useCallback } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Spinner } from '../components/ui/Spinner'
import { RefreshButton } from '../components/ui/RefreshButton'
import { ReportExportButtons } from '../components/reports/ReportExportButtons'
import { getProfitAndLoss, type IncomeExpenseLine } from '../lib/accounting'
import { useAuth } from '../hooks/useAuth'
import { formatCurrency } from '../lib/utils'
import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react'

export default function ProfitLossPage() {
  const { samitiId } = useAuth()
  const { t } = useTranslation()
  const currentYear = new Date().getFullYear()
  const [fromDate, setFromDate] = useState(`${currentYear}-01-01`)
  const [toDate, setToDate] = useState(`${currentYear}-12-31`)
  const [report, setReport] = useState<{
    totalIncome: number
    totalExpenses: number
    netProfit: number
  } | null>(null)
  const [incomeLines, setIncomeLines] = useState<IncomeExpenseLine[]>([])
  const [expenseLines, setExpenseLines] = useState<IncomeExpenseLine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadReport = useCallback(async () => {
    if (!samitiId) return
    setLoading(true)
    setError(null)
    try {
      const result = await getProfitAndLoss({ samitiId, fromDate, toDate })
      setReport({
        totalIncome: result.totalIncome,
        totalExpenses: result.totalExpenses,
        netProfit: result.netProfit,
      })
      setIncomeLines(result.income)
      setExpenseLines(result.expenses)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : t('reports.loadFailed'))
    }
    setLoading(false)
  }, [samitiId, fromDate, toDate])

  useEffect(() => { loadReport() }, [loadReport])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('accounting.profitLossStatement')}</h1>
        <div className="flex items-center gap-2">
          <ReportExportButtons
            filename={`profit-loss-${fromDate}-${toDate}`}
            title={t('accounting.profitLossStatement')}
            subtitle={t('accounting.reportPeriodRange', { from: fromDate, to: toDate })}
            headers={[t('accounting.item'), t('common.amount')]}
            rows={[
              ...incomeLines.map((i) => [`${t('accounting.income')} - ${i.name}`, formatCurrency(i.amount)]),
              ...expenseLines.map((e) => [`${t('accounting.expense')} - ${e.name}`, formatCurrency(e.amount)]),
            ]}
            totals={[
              { label: t('accounting.totalIncome'), value: formatCurrency(report?.totalIncome || 0) },
              { label: t('accounting.totalExpense'), value: formatCurrency(report?.totalExpenses || 0) },
              { label: t('accounting.netProfitLoss'), value: formatCurrency(report?.netProfit || 0) },
            ]}
          />
          <RefreshButton onRefresh={loadReport} />
        </div>
      </div>

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
      ) : report ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-green-500">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-gray-500">{t('accounting.totalIncome')}</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(report.totalIncome)}</p>
              </div>
            </div>
          </Card>
          <Card className="border-l-4 border-l-red-500">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm text-gray-500">{t('accounting.totalExpense')}</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(report.totalExpenses)}</p>
              </div>
            </div>
          </Card>
          <Card className={`border-l-4 ${report.netProfit >= 0 ? 'border-l-blue-500' : 'border-l-red-500'}`}>
            <div className="text-center">
              <p className="text-sm text-gray-500">{t('accounting.netProfitLoss')}</p>
              <p className={`text-3xl font-bold ${report.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatCurrency(report.netProfit)}
              </p>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
