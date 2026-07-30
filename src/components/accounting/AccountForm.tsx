import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { useAccounting } from '../../hooks/useAccounting'
import { useUIStore } from '../../store/uiStore'

const accountSchema = z.object({
  account_code: z.string().min(1, 'Code is required').max(10),
  account_name: z.string().min(1, 'Name is required'),
  account_type: z.enum(['income', 'expense', 'asset', 'liability', 'equity']),
})

type AccountFormData = z.infer<typeof accountSchema>

export function AccountForm() {
  const { createAccount } = useAccounting()
  const closeModal = useUIStore((s) => s.closeModal)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
  })

  const onSubmit = async (data: AccountFormData) => {
    await createAccount(data)
    closeModal()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input id="account_code" label="Account Code" placeholder="e.g. 5003" {...register('account_code')} error={errors.account_code?.message} />
      <Input id="account_name" label="Account Name" placeholder="e.g. Office Rent" {...register('account_name')} error={errors.account_name?.message} />
      <Select
        id="account_type"
        label="Account Type"
        options={[
          { value: 'income', label: 'Income' },
          { value: 'expense', label: 'Expense' },
          { value: 'asset', label: 'Asset' },
          { value: 'liability', label: 'Liability' },
          { value: 'equity', label: 'Equity' },
        ]}
        {...register('account_type')}
      />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
        <Button type="submit" loading={isSubmitting}>Create Account</Button>
      </div>
    </form>
  )
}
