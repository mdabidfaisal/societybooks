import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useUIStore } from '../../store/uiStore'
import { useTranslation } from 'react-i18next'

type ShareFormData = {
  shares_held: number
}

interface ShareFormProps {
  memberId: string
  onSuccess?: () => void
}

export function ShareForm({ memberId, onSuccess }: ShareFormProps) {
  const { samitiId } = useAuth()
  const closeModal = useUIStore((s) => s.closeModal)
  const { t } = useTranslation()

  const shareSchema = z.object({
    shares_held: z.coerce.number().int().min(0),
  })

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<ShareFormData>({
    resolver: zodResolver(shareSchema),
  })

  const onSubmit = async (data: ShareFormData) => {
    const { error } = await supabase.from('members').update({
      shares_held: data.shares_held,
    } as never).eq('id', memberId)

    if (error) {
      alert(t('shares.updateFailed', { message: error.message }))
    } else {
      onSuccess?.()
      closeModal()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input id="shares_held" label={t('shares.noOfShares')} type="number" {...register('shares_held')} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={closeModal}>{t('common.cancel')}</Button>
        <Button type="submit" loading={isSubmitting}>{t('shares.updateShares')}</Button>
      </div>
    </form>
  )
}
