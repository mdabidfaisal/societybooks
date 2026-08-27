import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Switch } from '../ui/Switch'
import { useTranslation } from 'react-i18next'

export type SamitiFormData = {
  samiti_name: string
  samiti_code: string
  is_active: boolean
  shares_enabled: boolean
  share_value: number
  default_profit_method: 'flat' | 'reducing_balance'
  default_profit_rate: number
  address?: string
  phone?: string
}

export const defaultSamitiValues: SamitiFormData = {
  samiti_name: '',
  samiti_code: '',
  is_active: true,
  shares_enabled: false,
  share_value: 0,
  default_profit_method: 'reducing_balance',
  default_profit_rate: 12.00,
  address: '',
  phone: '',
}

interface SamitiFormProps {
  defaultValues?: SamitiFormData
  onSubmit: (data: SamitiFormData) => Promise<void>
  isSubmitting: boolean
  error?: string | null
  success?: string | null
  submitLabel?: string
}

export function SamitiForm({ defaultValues, onSubmit, isSubmitting, error, success, submitLabel }: SamitiFormProps) {
  const { t } = useTranslation()

  const samitiSchema = z.object({
    samiti_name: z.string().min(1, t('superAdmin.nameRequired')),
    samiti_code: z.string().min(1, t('superAdmin.codeRequired')),
    is_active: z.boolean(),
    shares_enabled: z.boolean(),
    share_value: z.coerce.number().min(0, t('superAdmin.valueZeroOrMore')),
    default_profit_method: z.enum(['flat', 'reducing_balance'] as const),
    default_profit_rate: z.coerce.number().min(0, t('superAdmin.valueZeroOrMore')).max(100, t('superAdmin.max100')),
    address: z.string().optional(),
    phone: z.string().optional(),
  })

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<SamitiFormData>({
    resolver: zodResolver(samitiSchema),
    defaultValues: defaultValues ?? defaultSamitiValues,
  })

  const sharesEnabled = watch('shares_enabled')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3">{success}</div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">{t('superAdmin.samitiDetails')}</h3>
        <Input id="samiti_name" label={t('superAdmin.samitiName')} {...register('samiti_name')} error={errors.samiti_name?.message} />
        <Input id="samiti_code" label={t('superAdmin.samitiCode')} {...register('samiti_code')} error={errors.samiti_code?.message} />
        <Input id="address" label={t('common.address')} {...register('address')} />
        <Input id="phone" label={t('common.phone')} {...register('phone')} />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">{t('superAdmin.statusFinancialConfig')}</h3>
        <div className="flex items-center justify-between py-2">
          <div>
            <label className="font-medium text-sm text-gray-700">{t('common.active')}</label>
            <p className="text-xs text-gray-500">{t('superAdmin.whenInactive')}</p>
          </div>
          <Switch checked={watch('is_active')} onChange={(v) => setValue('is_active', v)} />
        </div>
        <div className="flex items-center justify-between py-2">
          <div>
            <label className="font-medium text-sm text-gray-700">{t('superAdmin.enableShares')}</label>
            <p className="text-xs text-gray-500">{t('superAdmin.shareCapital')}</p>
          </div>
          <Switch checked={sharesEnabled} onChange={(v) => setValue('shares_enabled', v)} />
        </div>
        {sharesEnabled && (
          <Input id="share_value" label={t('superAdmin.shareValueLabel')} type="number" step="0.01" {...register('share_value')} error={errors.share_value?.message} />
        )}
        <div>
          <label className="font-medium text-sm text-gray-700">{t('superAdmin.defaultProfitMethod')}</label>
          <select
            {...register('default_profit_method')}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-xs focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          >
            <option value="reducing_balance">{t('loans.reducingBalance')}</option>
            <option value="flat">{t('loans.flatRate')}</option>
          </select>
        </div>
        <Input id="default_profit_rate" label={t('superAdmin.defaultProfitRate')} type="number" step="0.01" {...register('default_profit_rate')} error={errors.default_profit_rate?.message} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" loading={isSubmitting}>{submitLabel || t('common.save')}</Button>
      </div>
    </form>
  )
}
