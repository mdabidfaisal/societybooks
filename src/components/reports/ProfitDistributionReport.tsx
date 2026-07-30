import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { formatCurrency, formatDate } from '../../lib/utils'

const distroVariant: Record<string, 'success' | 'warning'> = {
  distributed: 'success',
  draft: 'warning',
}

export function ProfitDistributionReport() {
  const { samitiId } = useAuth()
  const [distros, setDistros] = useState<Record<string, unknown>[]>([])

  useEffect(() => {
    if (!samitiId) return
    supabase.from('profit_distributions').select('*').eq('samiti_id', samitiId).order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setDistros(data as Record<string, unknown>[])
    })
  }, [samitiId])

  if (distros.length === 0) return <p className="text-sm text-gray-500">No profit distributions yet.</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs font-medium text-gray-500 uppercase">
            <th className="pb-3 pr-4">Distribution #</th>
            <th className="pb-3 pr-4">Date</th>
            <th className="pb-3 pr-4 text-right">Total Profit</th>
            <th className="pb-3 pr-4">Basis</th>
            <th className="pb-3 pr-4">Status</th>
          </tr>
        </thead>
        <tbody>
          {distros.map((d: Record<string, unknown>) => (
            <tr key={d.id as string} className="border-b last:border-0 hover:bg-gray-50">
              <td className="py-3 pr-4 font-medium">{d.distribution_number as string}</td>
              <td className="py-3 pr-4 text-gray-500">{formatDate(d.distribution_date as string)}</td>
              <td className="py-3 pr-4 text-right">{formatCurrency(d.total_profit_amount as number)}</td>
              <td className="py-3 pr-4 text-gray-500 capitalize">{d.distribution_basis as string}</td>
              <td className="py-3 pr-4"><Badge variant={distroVariant[d.status as string] || 'default'}>{d.status as string}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
