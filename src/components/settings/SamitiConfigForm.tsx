import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Switch } from '../ui/Switch'
import { Spinner } from '../ui/Spinner'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const samitiSchema = z.object({
  samiti_name: z.string().min(1, 'Name is required'),
  shares_enabled: z.boolean(),
  share_value: z.coerce.number().min(0),
  address: z.string().optional(),
  phone: z.string().optional(),
})

type SamitiFormData = z.infer<typeof samitiSchema>

export function SamitiConfigForm() {
  const { samitiId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting, isDirty } } = useForm<SamitiFormData>({
    resolver: zodResolver(samitiSchema),
    defaultValues: { samiti_name: '', shares_enabled: false, share_value: 0, address: '', phone: '' },
  })

  const sharesEnabled = watch('shares_enabled')

  useEffect(() => {
    if (!samitiId) return
    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('samiti_settings')
        .select('samiti_name, shares_enabled, share_value, address, phone')
        .eq('id', samitiId)
        .single()
      if (error) {
        setFetchError(error.message)
      } else if (data) {
        reset(data as SamitiFormData)
      }
      setLoading(false)
    }
    load()
  }, [samitiId, reset])

  const onSubmit = async (data: SamitiFormData) => {
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
      <Input id="samiti_name" label="Samiti Name" {...register('samiti_name')} error={errors.samiti_name?.message} />
      <div className="flex items-center justify-between py-2">
        <div>
          <label className="font-medium text-sm text-gray-700">Enable Shares</label>
          <p className="text-xs text-gray-500">Allow members to purchase share capital</p>
        </div>
        <Switch checked={sharesEnabled} onChange={(v) => setValue('shares_enabled', v)} />
      </div>
      {sharesEnabled && (
        <Input id="share_value" label="Share Value (৳)" type="number" step="0.01" {...register('share_value')} error={errors.share_value?.message} />
      )}
      <Input id="address" label="Address" {...register('address')} />
      <Input id="phone" label="Phone" {...register('phone')} />
      <div className="flex justify-end pt-2">
        <Button type="submit" loading={isSubmitting} disabled={!isDirty}>Save</Button>
      </div>
    </form>
  )
}
