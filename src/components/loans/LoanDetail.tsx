import { useAuth } from '../../hooks/useAuth'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { formatCurrency, formatDate } from '../../lib/utils'
import { ApprovalWorkflow } from './ApprovalWorkflow'
import { EMIChart } from './EMIChart'
import { useTranslation } from 'react-i18next'
import type { LoanWithDetails } from '../../types/loan'
import { User } from 'lucide-react'

const loanStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  pending: 'warning',
  approved: 'info',
  rejected: 'danger',
  disbursed: 'success',
  closed: 'default',
}

interface LoanDetailProps {
  loan: LoanWithDetails
  onRefresh: () => void
}

export function LoanDetail({ loan, onRefresh }: LoanDetailProps) {
  const { role } = useAuth()
  const { t } = useTranslation()
  const isAdmin = role === 'society_admin'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-4">
        <Card>
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold">{loan.loan_number}</h2>
              <Badge variant={loanStatusVariant[loan.status]}>{t(`status.${loan.status}`, { defaultValue: loan.status })}</Badge>
            </div>
            <div className="text-sm space-y-2">
              <div className="flex justify-between"><span className="text-gray-500">{t('common.amount')}</span><span className="font-medium">{formatCurrency(loan.amount)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">{t('loans.tenureCol')}</span><span className="font-medium">{loan.tenure_months} {t('loans.monthsSuffix')}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">{t('loans.profitMethod')}</span><span className="font-medium">{loan.profit_method === 'flat' ? t('loans.flatRate') : t('loans.reducingBalance')}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">{t('loans.profitRate')}</span><span className="font-medium">{loan.profit_rate}%</span></div>
              {loan.approved_at && <div className="flex justify-between"><span className="text-gray-500">{t('status.approved')}</span><span className="font-medium">{formatDate(loan.approved_at)}</span></div>}
              {loan.disbursed_at && <div className="flex justify-between"><span className="text-gray-500">{t('loans.disbursed')}</span><span className="font-medium">{formatDate(loan.disbursed_at)}</span></div>}
            </div>
            {isAdmin && <ApprovalWorkflow loanId={loan.id} currentStatus={loan.status} onAction={onRefresh} />}
          </div>
        </Card>

        {loan.member_name && (
          <Card>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{loan.member_name}</p>
                {loan.member_number && <p className="text-xs text-gray-500 font-mono">{loan.member_number}</p>}
              </div>
            </div>
          </Card>
        )}
      </div>

      <Card className="lg:col-span-2" title={t('loans.emiScheduleTitle')}>
        <EMIChart loanId={loan.id} loanStatus={loan.status} />
      </Card>
    </div>
  )
}
