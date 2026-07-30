import { useState } from 'react'
import { Button } from '../ui/Button'
import { useLoans } from '../../hooks/useLoans'

interface ApprovalWorkflowProps {
  loanId: string
  currentStatus: string
  onAction: () => void
}

export function ApprovalWorkflow({ loanId, currentStatus, onAction }: ApprovalWorkflowProps) {
  const { approveLoan, rejectLoan, disburseLoan } = useLoans()
  const [loading, setLoading] = useState<string | null>(null)

  const handleAction = async (action: 'approve' | 'reject' | 'disburse') => {
    setLoading(action)
    try {
      if (action === 'approve') await approveLoan(loanId)
      else if (action === 'reject') await rejectLoan(loanId)
      else if (action === 'disburse') await disburseLoan(loanId)
      onAction()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed')
    }
    setLoading(null)
  }

  return (
    <div className="space-y-2">
      {currentStatus === 'pending' && (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => handleAction('approve')} loading={loading === 'approve'}>Approve</Button>
          <Button size="sm" variant="danger" onClick={() => handleAction('reject')} loading={loading === 'reject'}>Reject</Button>
        </div>
      )}
      {currentStatus === 'approved' && (
        <Button size="sm" onClick={() => handleAction('disburse')} loading={loading === 'disburse'}>Disburse Loan</Button>
      )}
      {currentStatus === 'disbursed' && (
        <p className="text-sm text-green-600 font-medium">Loan disbursed</p>
      )}
      {currentStatus === 'rejected' && (
        <p className="text-sm text-red-600 font-medium">Loan rejected</p>
      )}
      {currentStatus === 'closed' && (
        <p className="text-sm text-gray-600 font-medium">Loan closed</p>
      )}
    </div>
  )
}
