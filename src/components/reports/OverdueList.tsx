import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Badge } from '../ui/Badge'
import { formatCurrency, formatDate } from '../../lib/utils'

interface OverdueEMI {
  id: string
  installment_no: number
  due_date: string
  total_amount: number
  paid_amount: number
  status: string
}

export function OverdueList() {
  const { samitiId } = useAuth()
  const [overdue, setOverdue] = useState<OverdueEMI[]>([])

  useEffect(() => {
    if (!samitiId) return
    supabase
      .from('loan_emi_schedule')
      .select('*')
      .lt('due_date', new Date().toISOString().split('T')[0])
      .in('status', ['pending', 'partial'])
      .order('due_date', { ascending: true })
      .then(({ data }) => {
        if (data) setOverdue(data as OverdueEMI[])
      })
  }, [samitiId])

  if (overdue.length === 0) return <p className="text-sm text-green-600 font-medium">No overdue EMIs. ✓</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs font-medium text-gray-500 uppercase">
            <th className="pb-3 pr-4">Installment</th>
            <th className="pb-3 pr-4">Due Date</th>
            <th className="pb-3 pr-4 text-right">Amount</th>
            <th className="pb-3 pr-4 text-right">Paid</th>
            <th className="pb-3 pr-4 text-right">Remaining</th>
            <th className="pb-3 pr-4">Status</th>
          </tr>
        </thead>
        <tbody>
          {overdue.map((emi) => {
            const remaining = emi.total_amount - emi.paid_amount
            return (
              <tr key={emi.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-3 pr-4 font-medium">#{emi.installment_no}</td>
                <td className="py-3 pr-4 text-red-600 font-medium">{formatDate(emi.due_date)}</td>
                <td className="py-3 pr-4 text-right">{formatCurrency(emi.total_amount)}</td>
                <td className="py-3 pr-4 text-right">{emi.paid_amount ? formatCurrency(emi.paid_amount) : '-'}</td>
                <td className="py-3 pr-4 text-right font-medium text-red-600">{formatCurrency(remaining)}</td>
                <td className="py-3 pr-4"><Badge variant="danger">{emi.status}</Badge></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
