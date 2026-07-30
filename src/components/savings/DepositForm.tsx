import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { useSavings } from '../../hooks/useSavings'
import { useUIStore } from '../../store/uiStore'
import type { SavingsAccountData } from '../../hooks/useSavings'

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' },
  { value: 'rocket', label: 'Rocket' },
]

const depositSchema = z.object({
  savings_account_id: z.string().min(1, 'Account is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
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
      alert(err instanceof Error ? err.message : 'Transaction failed')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Select
        id="savings_account_id"
        label="Savings Account"
        placeholder="Select account..."
        options={accounts.map((a) => ({ value: a.id, label: `${a.account_number} (${a.account_type})` }))}
        {...register('savings_account_id')}
        error={errors.savings_account_id?.message}
      />
      <Input id="amount" label="Amount (৳)" type="number" step="0.01" {...register('amount')} error={errors.amount?.message} />
      <Select
        id="payment_method"
        label="Payment Method"
        placeholder="Select method..."
        options={PAYMENT_METHODS}
        {...register('payment_method')}
      />
      <Input id="reference" label="Reference (optional)" {...register('reference')} />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
        <Button type="submit" loading={isSubmitting}>Record Deposit</Button>
      </div>
    </form>
  )
}
