import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { useAccounting } from '../../hooks/useAccounting'
import { useUIStore } from '../../store/uiStore'
import { useTranslation } from 'react-i18next'

type AccountFormData = {
  account_code: string
  account_name: string
  account_type: 'income' | 'expense' | 'asset' | 'liability' | 'equity'
}

export function AccountForm() {
  const { createAccount } = useAccounting()
  const closeModal = useUIStore((s) => s.closeModal)
  const { t } = useTranslation()

  const accountSchema = z.object({
    account_code: z.string().min(1, t('accounting.codeRequired')).max(10),
    account_name: z.string().min(1, t('accounting.nameRequired')),
    account_type: z.enum(['income', 'expense', 'asset', 'liability', 'equity']),
  })

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
  })

  const onSubmit = async (data: AccountFormData) => {
    await createAccount(data)
    closeModal()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input id="account_code" label={t('accounting.accountCode')} placeholder="e.g. 5003" {...register('account_code')} error={errors.account_code?.message} />
      <Input id="account_name" label={t('accounting.accountName')} placeholder="e.g. Office Rent" {...register('account_name')} error={errors.account_name?.message} />
      <Select
        id="account_type"
        label={t('accounting.accountType')}
        options={[
          { value: 'income', label: t('accounting.income') },
          { value: 'expense', label: t('accounting.expense') },
          { value: 'asset', label: t('accounting.assets') },
          { value: 'liability', label: t('accounting.liabilities') },
          { value: 'equity', label: t('accounting.equity') },
        ]}
        {...register('account_type')}
      />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={closeModal}>{t('common.cancel')}</Button>
        <Button type="submit" loading={isSubmitting}>{t('accounting.createAccount')}</Button>
      </div>
    </form>
  )
}
