import { useState } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { getProfitAndLoss } from '../../lib/accounting'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency } from '../../lib/utils'

export function ProfitAndLoss() {
  const { samitiId } = useAuth()
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [report, setReport] = useState<{
    income: { code: string; name: string; amount: number }[]
    expenses: { code: string; name: string; amount: number }[]
    totalIncome: number
    totalExpenses: number
    netProfit: number
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const runReport = async () => {
    if (!fromDate || !toDate || !samitiId) return
    setLoading(true)
    try {
      const result = await getProfitAndLoss({ samitiId, fromDate, toDate })
      setReport(result)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <span className="text-gray-400">to</span>
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <Button onClick={runReport} loading={loading} size="sm">Run Report</Button>
      </div>

      {report && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="Income">
            {report.income.length === 0 ? <p className="text-sm text-gray-500">No income recorded.</p> : (
              <div className="space-y-2 text-sm">
                {report.income.map((i) => (
                  <div key={i.code} className="flex justify-between"><span>{i.name}</span><span className="font-medium text-green-600">{formatCurrency(i.amount)}</span></div>
                ))}
                <div className="border-t pt-2 flex justify-between font-semibold"><span>Total Income</span><span className="text-green-600">{formatCurrency(report.totalIncome)}</span></div>
              </div>
            )}
          </Card>

          <Card title="Expenses">
            {report.expenses.length === 0 ? <p className="text-sm text-gray-500">No expenses recorded.</p> : (
              <div className="space-y-2 text-sm">
                {report.expenses.map((e) => (
                  <div key={e.code} className="flex justify-between"><span>{e.name}</span><span className="font-medium text-red-600">{formatCurrency(e.amount)}</span></div>
                ))}
                <div className="border-t pt-2 flex justify-between font-semibold"><span>Total Expenses</span><span className="text-red-600">{formatCurrency(report.totalExpenses)}</span></div>
              </div>
            )}
          </Card>

          <Card className="md:col-span-2">
            <div className="text-center">
              <p className="text-sm text-gray-500">Net Profit / Loss</p>
              <p className={`text-3xl font-bold ${report.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(report.netProfit)}
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
