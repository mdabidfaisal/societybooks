import { Badge } from '../ui/Badge'
import { formatCurrency, formatDate } from '../../lib/utils'
import { useTranslation } from 'react-i18next'
import type { LoanWithDetails } from '../../types/loan'

const loanStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  pending: 'warning',
  approved: 'info',
  rejected: 'danger',
  disbursed: 'success',
  closed: 'default',
}

interface LoanListProps {
  loans: LoanWithDetails[]
  onSelect: (id: string) => void
}

export function LoanList({ loans, onSelect }: LoanListProps) {
  const { t } = useTranslation()
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs font-medium text-gray-500 uppercase">
            <th className="pb-3 pr-4">{t('loans.loanNo')}</th>
            <th className="pb-3 pr-4">{t('loans.memberCol')}</th>
            <th className="pb-3 pr-4">{t('common.amount')}</th>
            <th className="pb-3 pr-4">{t('loans.outstandingCol')}</th>
            <th className="pb-3 pr-4">{t('loans.methodCol')}</th>
            <th className="pb-3 pr-4">{t('common.status')}</th>
            <th className="pb-3 pr-4">{t('loans.appliedCol')}</th>
          </tr>
        </thead>
        <tbody>
          {loans.map((loan) => (
            <tr
              key={loan.id}
              className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
              onClick={() => onSelect(loan.id)}
            >
              <td className="py-3 pr-4 font-medium">{loan.loan_number}</td>
              <td className="py-3 pr-4">
                <span className="text-gray-900">{loan.member_name || t('loans.unknownMember')}</span>
                {loan.member_number && <span className="text-xs text-gray-400 ml-1 font-mono">({loan.member_number})</span>}
              </td>
              <td className="py-3 pr-4">{formatCurrency(loan.amount)}</td>
              <td className="py-3 pr-4">{loan.outstanding_balance != null ? formatCurrency(loan.outstanding_balance) : '-'}</td>
              <td className="py-3 pr-4 text-gray-500">{loan.profit_method === 'flat' ? t('loans.flatShort') : t('loans.reducingShort')} @ {loan.profit_rate}%</td>
              <td className="py-3 pr-4"><Badge variant={loanStatusVariant[loan.status]}>{t(`status.${loan.status}`, { defaultValue: loan.status })}</Badge></td>
              <td className="py-3 pr-4 text-gray-500">{formatDate(loan.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
