import { formatCurrency, formatDate } from '../../lib/utils'
import { Badge } from '../ui/Badge'
import type { JournalEntryData } from '../../hooks/useAccounting'

interface JournalEntryListProps {
  entries: JournalEntryData[]
  onSelect?: (entry: JournalEntryData) => void
}

const typeVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  deposit: 'success',
  withdrawal: 'danger',
  loan_disbursement: 'info',
  loan_repayment: 'success',
  profit_distribution: 'warning',
  expense: 'danger',
  income: 'success',
  correction: 'warning',
  exit_settlement: 'danger',
}

export function JournalEntryList({ entries, onSelect }: JournalEntryListProps) {
  if (entries.length === 0) return <p className="text-sm text-gray-500">No journal entries yet.</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs font-medium text-gray-500 uppercase">
            <th className="pb-3 pr-4">Entry #</th>
            <th className="pb-3 pr-4">Date</th>
            <th className="pb-3 pr-4">Description</th>
            <th className="pb-3 pr-4">Type</th>
            <th className="pb-3 pr-4 text-right">Debit</th>
            <th className="pb-3 pr-4 text-right">Credit</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr
              key={e.id}
              className={`border-b last:border-0 hover:bg-gray-50 ${onSelect ? 'cursor-pointer' : ''}`}
              onClick={() => onSelect?.(e)}
            >
              <td className="py-3 pr-4 font-mono text-xs">{e.entry_number}</td>
              <td className="py-3 pr-4 text-gray-500">{formatDate(e.entry_date)}</td>
              <td className="py-3 pr-4 font-medium">{e.description}</td>
              <td className="py-3 pr-4"><Badge variant={typeVariant[e.entry_type] || 'default'}>{e.entry_type.replace(/_/g, ' ')}</Badge></td>
              <td className="py-3 pr-4 text-right">{e.total_debit > 0 ? formatCurrency(e.total_debit) : '-'}</td>
              <td className="py-3 pr-4 text-right">{e.total_credit > 0 ? formatCurrency(e.total_credit) : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
