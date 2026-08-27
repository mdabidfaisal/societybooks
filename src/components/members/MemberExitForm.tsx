import { useState, useEffect } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useMemberExit, type ExitEligibility } from '../../hooks/useMemberExit'
import { useUIStore } from '../../store/uiStore'
import { formatCurrency } from '../../lib/utils'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, CheckCircle, Wallet, Gift, HandshakeIcon, ArrowRight } from 'lucide-react'

interface MemberExitFormProps {
  memberId: string
  memberName: string
}

export function MemberExitForm({ memberId, memberName }: MemberExitFormProps) {
  const { checkExitEligibility, processExit } = useMemberExit()
  const closeModal = useUIStore((s) => s.closeModal)
  const { t } = useTranslation()
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
      await processExit(memberId, note || t('exit.memberExit'))
      setDone(true)
    } catch (err) {
      setError((err as Error).message || t('exit.failedToLoad'))
    }
    setProcessing(false)
  }

  if (loading) return <p className="text-sm text-gray-500">{t('exit.checkingEligibility')}</p>

  if (done) {
    return (
      <div className="text-center py-6">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
        <p className="font-medium text-gray-900">{t('exit.successTitle')}</p>
        <p className="text-sm text-gray-500 mt-1">{t('exit.settlementRecorded')}</p>
        <Button className="mt-4" onClick={closeModal}>{t('common.close')}</Button>
      </div>
    )
  }

  if (!eligibility) {
    return (
      <div>
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="h-6 w-6 text-yellow-500 mt-0.5" />
          <div>
            <p className="font-medium text-gray-900">{t('exit.cannotCheckEligibility')}</p>
            <p className="text-sm text-gray-600 mt-1">{t('exit.failedToLoad')}</p>
          </div>
        </div>
        <Button variant="secondary" onClick={closeModal}>{t('common.close')}</Button>
      </div>
    )
  }

  const netLabel = eligibility.netSettlement >= 0 ? t('exit.memberReceives') : t('exit.memberPays')
  const netColor = eligibility.netSettlement >= 0 ? 'text-green-700' : 'text-red-700'

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        {t('exit.processingExitFor')} <strong>{memberName}</strong>
      </p>

      <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('exit.assets')}</h4>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-blue-500" />
            <span className="text-gray-600">{t('exit.currentSavingsBalance')}</span>
          </div>
          <span className="font-medium">{formatCurrency(eligibility.savingsBalance)}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-purple-500" />
            <span className="text-gray-600">{t('exit.totalProfitDistributionsReceived')}</span>
          </div>
          <span className="font-medium">{formatCurrency(eligibility.profitReceived)}</span>
        </div>

        <div className="border-t pt-2 flex items-center justify-between font-semibold">
          <span className="text-gray-700">{t('exit.totalMemberValue')}</span>
          <span>{formatCurrency(eligibility.savingsBalance + eligibility.profitReceived)}</span>
        </div>

        {eligibility.outstandingLoan > 0 && (
          <>
            <div className="flex items-center justify-between text-red-700">
              <div className="flex items-center gap-2">
                <HandshakeIcon className="h-4 w-4" />
                <span>{t('exit.outstandingLoanBalance')}</span>
              </div>
              <span className="font-medium">- {formatCurrency(eligibility.outstandingLoan)}</span>
            </div>
            <div className="border-t pt-2 flex items-center justify-between">
              <span className="text-gray-700">{t('exit.deduction')}</span>
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
        label={t('exit.exitReasonOptional')}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t('exit.reasonForExit')}
      />

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={closeModal}>{t('common.cancel')}</Button>
        <Button variant="danger" onClick={handleExit} loading={processing}>
          {t('exit.confirmExit')}
        </Button>
      </div>
    </div>
  )
}
