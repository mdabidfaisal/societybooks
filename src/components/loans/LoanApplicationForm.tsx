import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { useLoans } from '../../hooks/useLoans'
import { useUIStore } from '../../store/uiStore'

const loanSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  purpose: z.string().min(1, 'Purpose is required'),
  tenure_months: z.coerce.number().int().min(1, 'Minimum 1 month').max(120, 'Maximum 10 years'),
  profit_method: z.enum(['flat', 'reducing_balance']),
  profit_rate: z.coerce.number().min(0).max(100),
})

type LoanFormData = z.infer<typeof loanSchema>

export function LoanApplicationForm() {
  const { applyForLoan } = useLoans()
  const closeModal = useUIStore((s) => s.closeModal)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoanFormData>({
    resolver: zodResolver(loanSchema),
    defaultValues: { profit_method: 'reducing_balance', profit_rate: 12 },
  })

  const onSubmit = async (data: LoanFormData) => {
    try {
      await applyForLoan(data)
      closeModal()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Application failed')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input id="amount" label="Loan Amount (৳)" type="number" step="0.01" {...register('amount')} error={errors.amount?.message} />
      <Input id="purpose" label="Purpose" {...register('purpose')} error={errors.purpose?.message} />
      <Input id="tenure_months" label="Tenure (months)" type="number" {...register('tenure_months')} error={errors.tenure_months?.message} />
      <Select
        id="profit_method"
        label="Profit Method"
        options={[
          { value: 'reducing_balance', label: 'Reducing Balance' },
          { value: 'flat', label: 'Flat Rate' },
        ]}
        {...register('profit_method')}
      />
      <Input id="profit_rate" label="Profit Rate (% per year)" type="number" step="0.1" {...register('profit_rate')} error={errors.profit_rate?.message} />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
        <Button type="submit" loading={isSubmitting}>Submit Application</Button>
      </div>
    </form>
  )
}
