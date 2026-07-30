import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useUIStore } from '../../store/uiStore'

const shareSchema = z.object({
  shares_held: z.coerce.number().int().min(0),
})

type ShareFormData = z.infer<typeof shareSchema>

interface ShareFormProps {
  memberId: string
  onSuccess?: () => void
}

export function ShareForm({ memberId, onSuccess }: ShareFormProps) {
  const { samitiId } = useAuth()
  const closeModal = useUIStore((s) => s.closeModal)

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<ShareFormData>({
    resolver: zodResolver(shareSchema),
  })

  const onSubmit = async (data: ShareFormData) => {
    const { error } = await supabase.from('members').update({
      shares_held: data.shares_held,
    } as never).eq('id', memberId)

    if (error) {
      alert('Failed to update shares: ' + error.message)
    } else {
      onSuccess?.()
      closeModal()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input id="shares_held" label="Number of Shares" type="number" {...register('shares_held')} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
        <Button type="submit" loading={isSubmitting}>Update Shares</Button>
      </div>
    </form>
  )
}
