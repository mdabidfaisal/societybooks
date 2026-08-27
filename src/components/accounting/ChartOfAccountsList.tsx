import { Badge } from '../ui/Badge'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  if (accounts.length === 0) return <p className="text-sm text-gray-500">{t('accounting.noAccountsConfigured')}</p>

  const typeLabel = (type: string) => ({
    asset: t('accounting.assets'),
    liability: t('accounting.liabilities'),
    equity: t('accounting.equity'),
    income: t('accounting.income'),
    expense: t('accounting.expense'),
  })[type] || type

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs font-medium text-gray-500 uppercase">
            <th className="pb-3 pr-4">{t('common.code')}</th>
            <th className="pb-3 pr-4">{t('common.name')}</th>
            <th className="pb-3 pr-4">{t('common.type')}</th>
            <th className="pb-3 pr-4">{t('accounting.system')}</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((a) => (
            <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
              <td className="py-3 pr-4 font-mono text-xs">{a.account_code}</td>
              <td className="py-3 pr-4 font-medium">{a.account_name}</td>
              <td className="py-3 pr-4"><Badge variant={typeColors[a.account_type] || 'default'}>{typeLabel(a.account_type)}</Badge></td>
              <td className="py-3 pr-4">{a.is_system ? <Badge variant="info">{t('accounting.system')}</Badge> : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
