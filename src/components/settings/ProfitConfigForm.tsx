import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Spinner } from '../ui/Spinner'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useTranslation } from 'react-i18next'

type ProfitFormData = {
  default_profit_method: 'flat' | 'reducing_balance'
  default_profit_rate: number
  profit_period_1_start_month: number
  profit_period_1_end_month: number
  profit_period_2_start_month: number
  profit_period_2_end_month: number
}

export function ProfitConfigForm() {
  const { samitiId } = useAuth()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const profitSchema = z.object({
    default_profit_method: z.enum(['flat', 'reducing_balance']),
    default_profit_rate: z.coerce.number().min(0).max(100),
    profit_period_1_start_month: z.coerce.number().int().min(1).max(12),
    profit_period_1_end_month: z.coerce.number().int().min(1).max(12),
    profit_period_2_start_month: z.coerce.number().int().min(1).max(12),
    profit_period_2_end_month: z.coerce.number().int().min(1).max(12),
  }).refine(
    (data) => data.profit_period_1_end_month >= data.profit_period_1_start_month,
    { message: t('settings.period1EndGteStart'), path: ['profit_period_1_end_month'] }
  ).refine(
    (data) => data.profit_period_2_end_month >= data.profit_period_2_start_month,
    { message: t('settings.period2EndGteStart'), path: ['profit_period_2_end_month'] }
  ).refine(
    (data) => data.profit_period_2_start_month > data.profit_period_1_end_month,
    { message: t('settings.period2AfterPeriod1'), path: ['profit_period_2_start_month'] }
  )

  const MONTHS = [
    { value: 1, label: t('months.january') }, { value: 2, label: t('months.february') },
    { value: 3, label: t('months.march') }, { value: 4, label: t('months.april') },
    { value: 5, label: t('months.may') }, { value: 6, label: t('months.june') },
    { value: 7, label: t('months.july') }, { value: 8, label: t('months.august') },
    { value: 9, label: t('months.september') }, { value: 10, label: t('months.october') },
    { value: 11, label: t('months.november') }, { value: 12, label: t('months.december') },
  ]

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting, isDirty } } = useForm<ProfitFormData>({
    resolver: zodResolver(profitSchema),
    defaultValues: {
      default_profit_method: 'reducing_balance',
      default_profit_rate: 12,
      profit_period_1_start_month: 1,
      profit_period_1_end_month: 6,
      profit_period_2_start_month: 7,
      profit_period_2_end_month: 12,
    },
  })

  useEffect(() => {
    if (!samitiId) return
    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('samiti_settings')
        .select('default_profit_method, default_profit_rate, profit_period_1_start_month, profit_period_1_end_month, profit_period_2_start_month, profit_period_2_end_month')
        .eq('id', samitiId)
        .single()
      if (error) {
        setFetchError(error.message)
      } else if (data) {
        reset(data as ProfitFormData)
      }
      setLoading(false)
    }
    load()
  }, [samitiId, reset])

  const onSubmit = async (data: ProfitFormData) => {
    if (!samitiId) return
    setSuccess(false)
    const { error } = await supabase
      .from('samiti_settings')
      .update(data as never)
      .eq('id', samitiId)
    if (error) {
      setFetchError(error.message)
    } else {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  if (loading) return <Spinner size="sm" />

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {fetchError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{fetchError}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3">{t('settings.saveSuccess')}</div>
      )}
      <Select
        id="default_profit_method"
        label={t('settings.loanProfitMethod')}
        placeholder={t('settings.selectMethodPlaceholder')}
        options={[
          { value: 'flat', label: t('loans.flatRate') },
          { value: 'reducing_balance', label: t('loans.reducingBalance') },
        ]}
        {...register('default_profit_method')}
        error={errors.default_profit_method?.message}
      />
      <Input
        id="default_profit_rate"
        label={t('settings.defaultLoanProfitRate')}
        type="number"
        step="0.01"
        {...register('default_profit_rate')}
        error={errors.default_profit_rate?.message}
      />

      <div className="border-t pt-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('settings.profitDistributionPeriods')}</h4>
        <p className="text-xs text-gray-500 mb-3">
          {t('settings.profitPeriodsDesc')}
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium text-blue-700 uppercase">{t('settings.period1')}</p>
            <div className="grid grid-cols-2 gap-2">
              <Select
                label={t('settings.startMonth')}
                options={MONTHS.map((m) => ({ value: String(m.value), label: m.label }))}
                value={String(watch('profit_period_1_start_month'))}
                {...register('profit_period_1_start_month', { valueAsNumber: true })}
              />
              <Select
                label={t('settings.endMonth')}
                options={MONTHS.map((m) => ({ value: String(m.value), label: m.label }))}
                value={String(watch('profit_period_1_end_month'))}
                {...register('profit_period_1_end_month', { valueAsNumber: true })}
              />
            </div>
            {errors.profit_period_1_end_month && (
              <p className="text-xs text-red-500">{errors.profit_period_1_end_month.message}</p>
            )}
          </div>

          <div className="bg-green-50 rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium text-green-700 uppercase">{t('settings.period2')}</p>
            <div className="grid grid-cols-2 gap-2">
              <Select
                label={t('settings.startMonth')}
                options={MONTHS.map((m) => ({ value: String(m.value), label: m.label }))}
                value={String(watch('profit_period_2_start_month'))}
                {...register('profit_period_2_start_month', { valueAsNumber: true })}
              />
              <Select
                label={t('settings.endMonth')}
                options={MONTHS.map((m) => ({ value: String(m.value), label: m.label }))}
                value={String(watch('profit_period_2_end_month'))}
                {...register('profit_period_2_end_month', { valueAsNumber: true })}
              />
            </div>
            {errors.profit_period_2_end_month && (
              <p className="text-xs text-red-500">{errors.profit_period_2_end_month.message}</p>
            )}
            {errors.profit_period_2_start_month && (
              <p className="text-xs text-red-500">{errors.profit_period_2_start_month.message}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={isSubmitting} disabled={!isDirty}>{t('common.save')}</Button>
      </div>
    </form>
  )
}
