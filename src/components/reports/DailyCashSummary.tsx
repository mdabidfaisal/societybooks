import { useState, useEffect } from 'react'
import { Card } from '../ui/Card'
import { useReports } from '../../hooks/useReports'
import { formatCurrency } from '../../lib/utils'

export function DailyCashSummary() {
  const { getDailyCashSummary } = useReports()
  const [summary, setSummary] = useState<{
    totalDeposits: number
    totalWithdrawals: number
    totalProfitCredited: number
    date: string
  } | null>(null)

  useEffect(() => {
    getDailyCashSummary().then(setSummary)
  }, [getDailyCashSummary])

  if (!summary) return <p className="text-sm text-gray-500">No data for today.</p>

  const netCash = summary.totalDeposits - summary.totalWithdrawals

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <p className="text-xs text-gray-500 uppercase">Deposits</p>
        <p className="text-xl font-bold text-green-600">{formatCurrency(summary.totalDeposits)}</p>
      </Card>
      <Card>
        <p className="text-xs text-gray-500 uppercase">Withdrawals</p>
        <p className="text-xl font-bold text-red-600">{formatCurrency(summary.totalWithdrawals)}</p>
      </Card>
      <Card>
        <p className="text-xs text-gray-500 uppercase">Profit Credited</p>
        <p className="text-xl font-bold text-blue-600">{formatCurrency(summary.totalProfitCredited)}</p>
      </Card>
      <Card>
        <p className="text-xs text-gray-500 uppercase">Net Cash Flow</p>
        <p className={`text-xl font-bold ${netCash >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {formatCurrency(netCash)}
        </p>
      </Card>
    </div>
  )
}
