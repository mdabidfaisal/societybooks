import { useEffect, useState, useCallback } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Spinner } from '../components/ui/Spinner'
import { RefreshButton } from '../components/ui/RefreshButton'
import { getProfitAndLoss } from '../lib/accounting'
import { useAuth } from '../hooks/useAuth'
import { formatCurrency } from '../lib/utils'
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react'

export default function ProfitLossPage() {
  const { samitiId } = useAuth()
  const currentYear = new Date().getFullYear()
  const [fromDate, setFromDate] = useState(`${currentYear}-01-01`)
  const [toDate, setToDate] = useState(`${currentYear}-12-31`)
  const [report, setReport] = useState<{
    totalIncome: number
    totalExpenses: number
    netProfit: number
  } | null>(null)
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
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to load report')
    }
    setLoading(false)
  }, [samitiId, fromDate, toDate])

  useEffect(() => { loadReport() }, [loadReport])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Profit & Loss Statement</h1>
        <RefreshButton onRefresh={loadReport} />
      </div>

      <Card>
        <div className="flex items-end gap-3 flex-wrap">
          <Input
            id="from"
            label="From Date"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-44"
          />
          <Input
            id="to"
            label="To Date"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-44"
          />
          <Button onClick={loadReport} loading={loading}>Run Report</Button>
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
                <p className="text-sm text-gray-500">Total Income</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(report.totalIncome)}</p>
              </div>
            </div>
          </Card>
          <Card className="border-l-4 border-l-red-500">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm text-gray-500">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(report.totalExpenses)}</p>
              </div>
            </div>
          </Card>
          <Card className={`border-l-4 ${report.netProfit >= 0 ? 'border-l-blue-500' : 'border-l-red-500'}`}>
            <div className="text-center">
              <p className="text-sm text-gray-500">Net Profit / Loss</p>
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
