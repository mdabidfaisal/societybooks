import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useLoans } from '../../hooks/useLoans'
import { formatCurrency, formatDate } from '../../lib/utils'
import { Badge } from '../ui/Badge'
import { useTranslation } from 'react-i18next'
import { RepaymentForm } from './RepaymentForm'
import type { LoanEMIData } from '../../hooks/useLoans'

const emiVariant: Record<string, 'success' | 'danger' | 'default' | 'warning'> = {
  paid: 'success',
  overdue: 'danger',
  partial: 'warning',
  pending: 'default',
}

interface EMIChartProps {
  loanId: string
  loanStatus: string
}

export function EMIChart({ loanId, loanStatus }: EMIChartProps) {
  const { getEMISchedule } = useLoans()
  const { t } = useTranslation()
  const [schedule, setSchedule] = useState<LoanEMIData[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSchedule = useCallback(async () => {
    setLoading(true)
    const { data } = await getEMISchedule(loanId)
    if (data) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const enriched = data.map((emi) => {
        const dueDate = new Date(emi.due_date + 'T00:00:00')
        if (emi.status === 'pending' && dueDate < today) {
          return { ...emi, status: 'overdue' as const }
        }
        return emi
      })
      setSchedule(enriched)
    }
    setLoading(false)
  }, [loanId, getEMISchedule])

  useEffect(() => { fetchSchedule() }, [fetchSchedule])

  if (loading) return <p className="text-sm text-gray-500">{t('loans.loadingSchedule')}</p>
  if (schedule.length === 0) return <p className="text-sm text-gray-500">{t('loans.noSchedule')}</p>

  const totalPaid = schedule.reduce((s, e) => s + e.paid_amount, 0)
  const totalDue = schedule.reduce((s, e) => s + e.total_amount, 0)
  const progress = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0

  const canPay = loanStatus === 'disbursed' || (loanStatus === 'closed' && totalPaid < totalDue)

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-500">{t('loans.repaymentProgress')}</span>
          <span className="font-medium">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div className="bg-green-500 h-2.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{t('loans.paidLabel', { amount: formatCurrency(totalPaid) })}</span>
          <span>{t('loans.totalLabel', { amount: formatCurrency(totalDue) })}</span>
        </div>
      </div>

      {loanStatus === 'closed' && totalPaid >= totalDue && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3 text-center font-medium">
          {t('loans.loanFullyPaid')}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs font-medium text-gray-500 uppercase">
              <th className="pb-3 pr-4">#</th>
              <th className="pb-3 pr-4">{t('loans.dueDateHeader')}</th>
              <th className="pb-3 pr-4 text-right">{t('loans.principal')}</th>
              <th className="pb-3 pr-4 text-right">{t('loans.profitCol')}</th>
              <th className="pb-3 pr-4 text-right">{t('loans.totalHeader')}</th>
              <th className="pb-3 pr-4 text-right">{t('loans.paidCol')}</th>
              <th className="pb-3 pr-4">{t('common.status')}</th>
              <th className="pb-3 pr-4">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((emi) => (
              <tr key={emi.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-3 pr-4 font-medium">{emi.installment_no}</td>
                <td className="py-3 pr-4 text-gray-500">{formatDate(emi.due_date)}</td>
                <td className="py-3 pr-4 text-right">{formatCurrency(emi.principal_amount)}</td>
                <td className="py-3 pr-4 text-right">{formatCurrency(emi.profit_amount)}</td>
                <td className="py-3 pr-4 text-right font-medium">{formatCurrency(emi.total_amount)}</td>
                <td className="py-3 pr-4 text-right">{emi.paid_amount > 0 ? formatCurrency(emi.paid_amount) : '-'}</td>
                <td className="py-3 pr-4"><Badge variant={emiVariant[emi.status] || 'default'}>{t(`status.${emi.status}`, { defaultValue: emi.status })}</Badge></td>
                <td className="py-3 pr-4">
                  {canPay && emi.status !== 'paid' ? (
                    <RepaymentForm
                      emiId={emi.id}
                      installmentNo={emi.installment_no}
                      totalAmount={emi.total_amount}
                      paidAmount={emi.paid_amount}
                      principalAmount={emi.principal_amount}
                      profitAmount={emi.profit_amount}
                      loanId={loanId}
                      onSuccess={fetchSchedule}
                    />
                  ) : (
                    <span className="text-xs text-gray-400">{emi.status === 'paid' ? t('status.paid') : '-'}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
