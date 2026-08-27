import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLoans } from '../hooks/useLoans'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { RefreshButton } from '../components/ui/RefreshButton'
import { LoanList } from '../components/loans/LoanList'
import { LoanApplicationForm } from '../components/loans/LoanApplicationForm'
import { EMICalculator } from '../components/loans/EMICalculator'
import { useUIStore } from '../store/uiStore'
import type { LoanWithDetails } from '../types/loan'
import { ReportExportButtons } from '../components/reports/ReportExportButtons'
import { formatCurrency, formatDate } from '../lib/utils'
import { useTranslation } from 'react-i18next'
import { Calculator } from 'lucide-react'

export default function LoansPage() {
  const { loading, fetchLoansWithDetails } = useLoans()
  const { role } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const activeModal = useUIStore((s) => s.activeModal)
  const openModal = useUIStore((s) => s.openModal)
  const [loansWithDetails, setLoansWithDetails] = useState<LoanWithDetails[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  const loadData = async () => {
    setDataLoading(true)
    const data = await fetchLoansWithDetails()
    setLoansWithDetails(data)
    setDataLoading(false)
  }

  useEffect(() => { loadData() }, [fetchLoansWithDetails])

  if (loading) return <Spinner size="lg" />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('loans.title')}</h1>
        <div className="flex items-center gap-2">
          {loansWithDetails.length > 0 && (
            <ReportExportButtons
              filename={`loans-${new Date().toISOString().split('T')[0]}`}
              title={t('reports.loanRegister')}
              headers={[t('loans.loanLedger'), t('membership.fullName'), t('loans.loanAmount'), t('loans.outstandingAmount'), t('loans.profitMethod'), t('common.status'), t('common.date')]}
              rows={loansWithDetails.map((l) => [
                l.loan_number,
                l.member_name || '-',
                l.amount,
                l.outstanding_balance ?? 0,
                `${l.profit_method === 'flat' ? t('loans.flatRate') : t('loans.reducingBalance')} @ ${l.profit_rate}%`,
                l.status,
                formatDate(l.created_at),
              ])}
              totals={[
                { label: t('reports.totalDisbursed'), value: formatCurrency(loansWithDetails.reduce((s, l) => s + l.amount, 0)) },
                { label: t('reports.totalOutstanding'), value: formatCurrency(loansWithDetails.reduce((s, l) => s + (l.outstanding_balance ?? 0), 0)) },
              ]}
            />
          )}
          <Button variant="secondary" onClick={() => openModal('emi-calculator')}>
            <Calculator className="h-4 w-4 mr-1" /> {t('loans.calculator')}
          </Button>
          {role === 'member' && (
            <Button onClick={() => openModal('apply-loan')}>{t('loans.applyForLoan')}</Button>
          )}
          <RefreshButton onRefresh={loadData} />
        </div>
      </div>

      {dataLoading ? (
        <Spinner size="sm" />
      ) : loansWithDetails.length === 0 ? (
        <EmptyState title={t('loans.noLoans')} description={t('loans.noApplications')} />
      ) : (
        <LoanList loans={loansWithDetails} onSelect={(id) => navigate(`/loans/${id}`)} />
      )}

      {activeModal === 'emi-calculator' && (
        <Modal title={t('loans.calculator')} size="lg">
          <EMICalculator />
        </Modal>
      )}
      {activeModal === 'apply-loan' && (
        <Modal title={t('loans.applyForLoan')}>
          <LoanApplicationForm />
        </Modal>
      )}
    </div>
  )
}
