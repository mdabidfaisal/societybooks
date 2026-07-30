import { useState, useEffect } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useMemberExit, type ExitEligibility } from '../../hooks/useMemberExit'
import { useUIStore } from '../../store/uiStore'
import { formatCurrency } from '../../lib/utils'
import { AlertTriangle, CheckCircle, Wallet, Gift, HandshakeIcon, ArrowRight } from 'lucide-react'

interface MemberExitFormProps {
  memberId: string
  memberName: string
}

export function MemberExitForm({ memberId, memberName }: MemberExitFormProps) {
  const { checkExitEligibility, processExit } = useMemberExit()
  const closeModal = useUIStore((s) => s.closeModal)
  const [eligibility, setEligibility] = useState<ExitEligibility | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [note, setNote] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkExitEligibility(memberId).then((result) => {
      setEligibility(result)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [memberId, checkExitEligibility])

  const handleExit = async () => {
    if (!eligibility) return
    setProcessing(true)
    setError(null)
    try {
      await processExit(memberId, note || 'Member exit')
      setDone(true)
    } catch (err) {
      setError((err as Error).message || 'Failed to process exit')
    }
    setProcessing(false)
  }

  if (loading) return <p className="text-sm text-gray-500">Checking eligibility...</p>

  if (done) {
    return (
      <div className="text-center py-6">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
        <p className="font-medium text-gray-900">Exit processed successfully</p>
        <p className="text-sm text-gray-500 mt-1">Settlement has been recorded.</p>
        <Button className="mt-4" onClick={closeModal}>Close</Button>
      </div>
    )
  }

  if (!eligibility) {
    return (
      <div>
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="h-6 w-6 text-yellow-500 mt-0.5" />
          <div>
            <p className="font-medium text-gray-900">Cannot check eligibility</p>
            <p className="text-sm text-gray-600 mt-1">Failed to load member data.</p>
          </div>
        </div>
        <Button variant="secondary" onClick={closeModal}>Close</Button>
      </div>
    )
  }

  const netLabel = eligibility.netSettlement >= 0 ? 'Member Receives' : 'Member Pays'
  const netColor = eligibility.netSettlement >= 0 ? 'text-green-700' : 'text-red-700'

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Processing exit for <strong>{memberName}</strong>
      </p>

      <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Assets</h4>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-blue-500" />
            <span className="text-gray-600">Current Savings Balance</span>
          </div>
          <span className="font-medium">{formatCurrency(eligibility.savingsBalance)}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-purple-500" />
            <span className="text-gray-600">Total Profit Distributions Received</span>
          </div>
          <span className="font-medium">{formatCurrency(eligibility.profitReceived)}</span>
        </div>

        <div className="border-t pt-2 flex items-center justify-between font-semibold">
          <span className="text-gray-700">Total Member Value</span>
          <span>{formatCurrency(eligibility.savingsBalance + eligibility.profitReceived)}</span>
        </div>

        {eligibility.outstandingLoan > 0 && (
          <>
            <div className="flex items-center justify-between text-red-700">
              <div className="flex items-center gap-2">
                <HandshakeIcon className="h-4 w-4" />
                <span>Outstanding Loan Balance</span>
              </div>
              <span className="font-medium">- {formatCurrency(eligibility.outstandingLoan)}</span>
            </div>
            <div className="border-t pt-2 flex items-center justify-between">
              <span className="text-gray-700">Deduction</span>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </div>
          </>
        )}

        <div className={`border-t border-dashed pt-2 flex items-center justify-between font-bold text-base ${netColor}`}>
          <span>{netLabel}</span>
          <span>{formatCurrency(Math.abs(eligibility.netSettlement))}</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>
      )}

      <Input
        id="exit_note"
        label="Exit Reason (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Reason for exit..."
      />

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={closeModal}>Cancel</Button>
        <Button variant="danger" onClick={handleExit} loading={processing}>
          Confirm Exit
        </Button>
      </div>
    </div>
  )
}
