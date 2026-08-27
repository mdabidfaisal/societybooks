import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { useLoans } from '../../hooks/useLoans'
import { useUIStore } from '../../store/uiStore'
import { useTranslation } from 'react-i18next'

const loanSchema = z.object({
  amount: z.coerce.number().positive(),
  purpose: z.string().min(1),
  tenure_months: z.coerce.number().int().min(1).max(120),
  profit_method: z.enum(['flat', 'reducing_balance']),
  profit_rate: z.coerce.number().min(0).max(100),
})

type LoanFormData = z.infer<typeof loanSchema>

export function LoanApplicationForm() {
  const { applyForLoan } = useLoans()
  const closeModal = useUIStore((s) => s.closeModal)
  const { t } = useTranslation()

  const loanSchema = z.object({
    amount: z.coerce.number().positive(t('loans.amountPositive')),
    purpose: z.string().min(1, t('loans.purposeRequired')),
    tenure_months: z.coerce.number().int().min(1, t('loans.minMonths')).max(120, t('loans.maxTenure')),
    profit_method: z.enum(['flat', 'reducing_balance']),
    profit_rate: z.coerce.number().min(0).max(100),
  })

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoanFormData>({
    resolver: zodResolver(loanSchema),
    defaultValues: { profit_method: 'reducing_balance', profit_rate: 12 },
  })

  const onSubmit = async (data: LoanFormData) => {
    try {
      await applyForLoan(data)
      closeModal()
    } catch (err) {
      alert(err instanceof Error ? err.message : t('loans.applicationFailed'))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input id="amount" label={`${t('loans.loanAmount')} (৳)`} type="number" step="0.01" {...register('amount')} error={errors.amount?.message} />
      <Input id="purpose" label={t('loans.purpose')} {...register('purpose')} error={errors.purpose?.message} />
      <Input id="tenure_months" label={t('loans.loanTermMonths')} type="number" {...register('tenure_months')} error={errors.tenure_months?.message} />
      <Select
        id="profit_method"
        label={t('loans.profitMethod')}
        options={[
          { value: 'reducing_balance', label: t('loans.reducingBalance') },
          { value: 'flat', label: t('loans.flatRate') },
        ]}
        {...register('profit_method')}
      />
      <Input id="profit_rate" label={`${t('loans.profitRate')} (% ${t('loans.perYear')})`} type="number" step="0.1" {...register('profit_rate')} error={errors.profit_rate?.message} />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={closeModal}>{t('common.cancel')}</Button>
        <Button type="submit" loading={isSubmitting}>{t('loans.submitApplication')}</Button>
      </div>
    </form>
  )
}
