import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLoans } from '../hooks/useLoans'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { LoanDetail } from '../components/loans/LoanDetail'
import { ReportExportButtons } from '../components/reports/ReportExportButtons'
import { formatCurrency, formatDate } from '../lib/utils'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import type { LoanWithDetails } from '../types/loan'
import type { LoanEMIData } from '../hooks/useLoans'

export default function LoanDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { fetchLoansWithDetails, getEMISchedule } = useLoans()
  const [loan, setLoan] = useState<LoanWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [schedule, setSchedule] = useState<LoanEMIData[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    const all = await fetchLoansWithDetails()
    const found = all.find((l) => l.id === id)
    setLoan(found || null)
    if (id) {
      const { data } = await getEMISchedule(id)
      if (data) setSchedule(data)
    }
    setLoading(false)
  }, [id, fetchLoansWithDetails, getEMISchedule])

  useEffect(() => { loadData() }, [loadData])

  if (loading) return <Spinner size="lg" />
  if (!loan) return <div className="text-center py-12 text-gray-500">{t('loans.noLoans')}</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/loans')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> {t('common.back')}
        </Button>
        <ReportExportButtons
          filename={`loan-${loan.loan_number}`}
          title={`${t('loans.loanSummary')} - ${loan.loan_number}`}
          subtitle={`${t('loans.loanedTo')}: ${loan.member_name || '-'}${loan.member_number ? ` (${loan.member_number})` : ''} · ${t('loans.loanAmount')}: ${formatCurrency(loan.amount)} · ${t('loans.loanTerm')}: ${loan.tenure_months} ${t('loans.loanTermMonths')} · ${t('loans.profitRate')}: ${loan.profit_rate}% (${loan.profit_method === 'flat' ? t('loans.flatRate') : t('loans.reducingBalance')}) · ${t('common.status')}: ${loan.status}`}
          headers={['#', t('loans.dueDate'), t('loans.principal'), t('loans.totalProfit'), t('loans.totalPayable'), t('loans.paidAmount'), t('common.status')]}
          rows={schedule.map((emi) => [
            emi.installment_no,
            formatDate(emi.due_date),
            emi.principal_amount,
            emi.profit_amount,
            emi.total_amount,
            emi.paid_amount,
            emi.status,
          ])}
          orientation="landscape"
        />
      </div>

      <LoanDetail loan={loan} onRefresh={loadData} />
    </div>
  )
}
