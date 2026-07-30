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

const profitSchema = z.object({
  default_profit_method: z.enum(['flat', 'reducing_balance']),
  default_profit_rate: z.coerce.number().min(0).max(100),
  profit_period_1_start_month: z.coerce.number().int().min(1).max(12),
  profit_period_1_end_month: z.coerce.number().int().min(1).max(12),
  profit_period_2_start_month: z.coerce.number().int().min(1).max(12),
  profit_period_2_end_month: z.coerce.number().int().min(1).max(12),
}).refine(
  (data) => data.profit_period_1_end_month >= data.profit_period_1_start_month,
  { message: 'Period 1 end must be >= start', path: ['profit_period_1_end_month'] }
).refine(
  (data) => data.profit_period_2_end_month >= data.profit_period_2_start_month,
  { message: 'Period 2 end must be >= start', path: ['profit_period_2_end_month'] }
).refine(
  (data) => data.profit_period_2_start_month > data.profit_period_1_end_month,
  { message: 'Period 2 must start after Period 1 ends', path: ['profit_period_2_start_month'] }
)

type ProfitFormData = z.infer<typeof profitSchema>

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' }, { value: 4, label: 'April' },
  { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' },
  { value: 9, label: 'September' }, { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
]

export function ProfitConfigForm() {
  const { samitiId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

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
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3">Settings saved.</div>
      )}
      <Select
        id="default_profit_method"
        label="Loan Profit Method"
        placeholder="Select method..."
        options={[
          { value: 'flat', label: 'Flat Rate' },
          { value: 'reducing_balance', label: 'Reducing Balance' },
        ]}
        {...register('default_profit_method')}
        error={errors.default_profit_method?.message}
      />
      <Input
        id="default_profit_rate"
        label="Default Loan Profit Rate (% per year)"
        type="number"
        step="0.01"
        {...register('default_profit_rate')}
        error={errors.default_profit_rate?.message}
      />

      <div className="border-t pt-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Profit Distribution Periods</h4>
        <p className="text-xs text-gray-500 mb-3">
          Members earn profit proportional to their time-weighted average savings balance.
          Define two distribution periods per year.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium text-blue-700 uppercase">Period 1</p>
            <div className="grid grid-cols-2 gap-2">
              <Select
                label="Start Month"
                options={MONTHS.map((m) => ({ value: String(m.value), label: m.label }))}
                value={String(watch('profit_period_1_start_month'))}
                {...register('profit_period_1_start_month', { valueAsNumber: true })}
              />
              <Select
                label="End Month"
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
            <p className="text-xs font-medium text-green-700 uppercase">Period 2</p>
            <div className="grid grid-cols-2 gap-2">
              <Select
                label="Start Month"
                options={MONTHS.map((m) => ({ value: String(m.value), label: m.label }))}
                value={String(watch('profit_period_2_start_month'))}
                {...register('profit_period_2_start_month', { valueAsNumber: true })}
              />
              <Select
                label="End Month"
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
        <Button type="submit" loading={isSubmitting} disabled={!isDirty}>Save</Button>
      </div>
    </form>
  )
}
