import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLoans } from '../hooks/useLoans'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { LoanDetail } from '../components/loans/LoanDetail'
import { ArrowLeft } from 'lucide-react'
import type { LoanWithDetails } from '../types/loan'

export default function LoanDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { fetchLoansWithDetails } = useLoans()
  const [loan, setLoan] = useState<LoanWithDetails | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    const all = await fetchLoansWithDetails()
    const found = all.find((l) => l.id === id)
    setLoan(found || null)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [id, fetchLoansWithDetails])

  if (loading) return <Spinner size="lg" />
  if (!loan) return <div className="text-center py-12 text-gray-500">Loan not found</div>

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate('/loans')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      <LoanDetail loan={loan} onRefresh={loadData} />
    </div>
  )
}
