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
import { Calculator } from 'lucide-react'

export default function LoansPage() {
  const { loading, fetchLoansWithDetails } = useLoans()
  const { role } = useAuth()
  const navigate = useNavigate()
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
        <h1 className="text-2xl font-bold text-gray-900">Loans</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => openModal('emi-calculator')}>
            <Calculator className="h-4 w-4 mr-1" /> EMI Calculator
          </Button>
          {role === 'member' && (
            <Button onClick={() => openModal('apply-loan')}>Apply for Loan</Button>
          )}
          <RefreshButton onRefresh={loadData} />
        </div>
      </div>

      {dataLoading ? (
        <Spinner size="sm" />
      ) : loansWithDetails.length === 0 ? (
        <EmptyState title="No loans" description="Loan applications will appear here." />
      ) : (
        <LoanList loans={loansWithDetails} onSelect={(id) => navigate(`/loans/${id}`)} />
      )}

      {activeModal === 'emi-calculator' && (
        <Modal title="EMI Calculator" size="lg">
          <EMICalculator />
        </Modal>
      )}
      {activeModal === 'apply-loan' && (
        <Modal title="Apply for Loan">
          <LoanApplicationForm />
        </Modal>
      )}
    </div>
  )
}
