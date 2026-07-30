import { Badge } from '../ui/Badge'
import type { ChartOfAccountData } from '../../hooks/useAccounting'

interface ChartOfAccountsListProps {
  accounts: ChartOfAccountData[]
}

const typeColors: Record<string, 'success' | 'danger' | 'info' | 'warning' | 'default'> = {
  asset: 'success',
  liability: 'warning',
  equity: 'info',
  income: 'info',
  expense: 'danger',
}

export function ChartOfAccountsList({ accounts }: ChartOfAccountsListProps) {
  if (accounts.length === 0) return <p className="text-sm text-gray-500">No accounts configured.</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs font-medium text-gray-500 uppercase">
            <th className="pb-3 pr-4">Code</th>
            <th className="pb-3 pr-4">Name</th>
            <th className="pb-3 pr-4">Type</th>
            <th className="pb-3 pr-4">System</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((a) => (
            <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
              <td className="py-3 pr-4 font-mono text-xs">{a.account_code}</td>
              <td className="py-3 pr-4 font-medium">{a.account_name}</td>
              <td className="py-3 pr-4"><Badge variant={typeColors[a.account_type] || 'default'}>{a.account_type}</Badge></td>
              <td className="py-3 pr-4">{a.is_system ? <Badge variant="info">system</Badge> : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
