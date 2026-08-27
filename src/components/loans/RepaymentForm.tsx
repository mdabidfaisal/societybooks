import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency } from '../../lib/utils'
import { useTranslation } from 'react-i18next'

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' },
  { value: 'rocket', label: 'Rocket' },
]

interface RepaymentFormProps {
  emiId: string
  installmentNo: number
  totalAmount: number
  paidAmount: number
  principalAmount: number
  profitAmount: number
  loanId: string
  onSuccess: () => void
}

export function RepaymentForm({ emiId, installmentNo, totalAmount, paidAmount, principalAmount, profitAmount, loanId, onSuccess }: RepaymentFormProps) {
  const { samitiId } = useAuth()
  const { t } = useTranslation()
  const [amount, setAmount] = useState<number>(totalAmount - paidAmount)
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [loading, setLoading] = useState(false)

  const remaining = totalAmount - paidAmount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (amount <= 0 || amount > remaining) return

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const newPaidAmount = paidAmount + amount
    const newStatus = newPaidAmount >= totalAmount ? 'paid' : 'partial'

    const { error: emiError } = await supabase
      .from('loan_emi_schedule')
      .update({
        paid_amount: newPaidAmount,
        paid_at: new Date().toISOString(),
        status: newStatus,
      })
      .eq('id', emiId)

    if (emiError) {
      alert(t('loans.repaymentFailed', { message: emiError.message }))
      setLoading(false)
      return
    }

    // Prorate principal and profit by payment ratio
    const ratio = amount / totalAmount
    const principalPaid = Math.round(principalAmount * ratio * 100) / 100
    const profitPaid = Math.round(profitAmount * ratio * 100) / 100

    await supabase.from('loan_transactions').insert({
      loan_id: loanId,
      samiti_id: samitiId,
      emi_id: emiId,
      amount,
      principal_amount: principalPaid,
      profit_amount: profitPaid,
      balance_after: totalAmount - newPaidAmount,
      reference: `EMI #${installmentNo} repayment`,
      payment_method: paymentMethod,
      performed_by: user?.id,
    } as never)

    if (newStatus === 'paid') {
      const { data: allEmis } = await supabase
        .from('loan_emi_schedule')
        .select('id, status')
        .eq('loan_id', loanId)

      if (allEmis && allEmis.every((e: { status: string }) => e.status === 'paid')) {
        await supabase.from('loans').update({
          status: 'closed',
          updated_at: new Date().toISOString(),
        }).eq('id', loanId)
      }
    }

    onSuccess()
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-gray-500 whitespace-nowrap">{t('loans.installmentColon', { no: installmentNo })}</span>
      <Input
        type="number"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        max={remaining}
        className="w-28"
      />
      <Select
        options={PAYMENT_METHODS.map((m) => ({ value: m.value, label: t(`savings.${m.value}`) }))}
        value={paymentMethod}
        onChange={(e) => setPaymentMethod(e.target.value)}
        className="w-24"
      />
      <span className="text-xs text-gray-400">{t('loans.dueLabel', { amount: formatCurrency(totalAmount) })}</span>
      <Button type="submit" size="sm" loading={loading} disabled={amount <= 0 || amount > remaining}>
        {t('loans.pay')}
      </Button>
    </form>
  )
}
