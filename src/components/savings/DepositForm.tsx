import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { useSavings } from '../../hooks/useSavings'
import { useUIStore } from '../../store/uiStore'
import { useTranslation } from 'react-i18next'
import type { SavingsAccountData } from '../../hooks/useSavings'

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' },
  { value: 'rocket', label: 'Rocket' },
]

const depositSchema = z.object({
  savings_account_id: z.string().min(1),
  amount: z.coerce.number().positive(),
  reference: z.string().optional(),
  payment_method: z.string().optional(),
})

type DepositFormData = z.infer<typeof depositSchema>

interface DepositFormProps {
  accounts: SavingsAccountData[]
  onSuccess?: () => void
}

export function DepositForm({ accounts, onSuccess }: DepositFormProps) {
  const { recordTransaction } = useSavings()
  const closeModal = useUIStore((s) => s.closeModal)
  const { t } = useTranslation()

  const depositSchema = z.object({
    savings_account_id: z.string().min(1, t('savings.accountRequired')),
    amount: z.coerce.number().positive(t('savings.amountPositive')),
    reference: z.string().optional(),
    payment_method: z.string().optional(),
  })

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<DepositFormData>({
    resolver: zodResolver(depositSchema),
  })

  const onSubmit = async (data: DepositFormData) => {
    try {
      await recordTransaction({
        savings_account_id: data.savings_account_id,
        transaction_type: 'deposit',
        amount: data.amount,
        reference: data.reference,
        payment_method: data.payment_method,
      })
      onSuccess?.()
      closeModal()
    } catch (err) {
      alert(err instanceof Error ? err.message : t('savings.transactionFailed'))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Select
        id="savings_account_id"
        label={t('savings.savingsAccount')}
        placeholder={t('savings.selectAccount')}
        options={accounts.map((a) => ({ value: a.id, label: `${a.account_number} (${a.account_type})` }))}
        {...register('savings_account_id')}
        error={errors.savings_account_id?.message}
      />
      <Input id="amount" label={t('savings.amountTaka')} type="number" step="0.01" {...register('amount')} error={errors.amount?.message} />
      <Select
        id="payment_method"
        label={t('savings.paymentMethod')}
        placeholder={t('savings.selectMethod')}
        options={PAYMENT_METHODS.map((m) => ({ value: m.value, label: t(`savings.${m.value}`) }))}
        {...register('payment_method')}
      />
      <Input id="reference" label={t('savings.referenceOptional')} {...register('reference')} />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={closeModal}>{t('common.cancel')}</Button>
        <Button type="submit" loading={isSubmitting}>{t('savings.recordDeposit')}</Button>
      </div>
    </form>
  )
}
