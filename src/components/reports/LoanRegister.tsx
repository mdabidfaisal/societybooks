import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Badge } from '../ui/Badge'
import { formatCurrency, formatDate } from '../../lib/utils'

interface LoanRow {
  id: string
  loan_number: string
  amount: number
  profit_method: string
  profit_rate: number
  status: string
  created_at: string
}

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  pending: 'warning',
  approved: 'info',
  rejected: 'danger',
  disbursed: 'success',
  closed: 'default',
}

export function LoanRegister() {
  const { samitiId } = useAuth()
  const [loans, setLoans] = useState<LoanRow[]>([])

  useEffect(() => {
    if (!samitiId) return
    supabase.from('loans').select('*').eq('samiti_id', samitiId).order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setLoans(data as LoanRow[])
    })
  }, [samitiId])

  if (loans.length === 0) return <p className="text-sm text-gray-500">No loans found.</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs font-medium text-gray-500 uppercase">
            <th className="pb-3 pr-4">Loan #</th>
            <th className="pb-3 pr-4">Amount</th>
            <th className="pb-3 pr-4">Status</th>
            <th className="pb-3 pr-4">Method</th>
            <th className="pb-3 pr-4">Created</th>
          </tr>
        </thead>
        <tbody>
          {loans.map((loan) => (
            <tr key={loan.id} className="border-b last:border-0 hover:bg-gray-50">
              <td className="py-3 pr-4 font-medium">{loan.loan_number}</td>
              <td className="py-3 pr-4">{formatCurrency(loan.amount)}</td>
              <td className="py-3 pr-4"><Badge variant={statusVariant[loan.status] || 'default'}>{loan.status}</Badge></td>
              <td className="py-3 pr-4 text-gray-500">{loan.profit_method === 'flat' ? 'Flat' : 'Reducing'} @ {loan.profit_rate}%</td>
              <td className="py-3 pr-4 text-gray-500">{formatDate(loan.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
