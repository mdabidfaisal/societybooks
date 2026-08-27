import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useUIStore } from '../../store/uiStore'
import { supabaseAdmin } from '../../lib/supabase-admin'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

type LoginFormData = z.infer<typeof loginSchema>

interface CreateLoginFormProps {
  memberId: string
  samitiId: string
  name: string
  onSuccess?: () => void
}

export function CreateLoginForm({ memberId, samitiId, name, onSuccess }: CreateLoginFormProps) {
  const closeModal = useUIStore((s) => s.closeModal)
  const { t } = useTranslation()
  const [apiError, setApiError] = useState<string | null>(null)

  const loginSchema = z.object({
    email: z.string().email(t('membership.validEmailRequired')),
    password: z.string().min(6, t('membership.passwordMinChars')),
  })

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: `member-${memberId.slice(0, 8)}@samiti.test`,
      password: 'Test@123',
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    setApiError(null)
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        role: 'member',
        samiti_id: samitiId,
        member_id: memberId,
        name,
      },
    })
    if (error) {
      setApiError(error.message)
    } else {
      onSuccess?.()
      closeModal()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {apiError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {apiError}
        </div>
      )}
      <Input
        id="email"
        label={t('membership.emailLoginId')}
        type="email"
        placeholder="member@samiti.test"
        {...register('email')}
        error={errors.email?.message}
      />
      <Input
        id="password"
        label={t('auth.password')}
        type="text"
        placeholder={t('membership.min6Characters')}
        {...register('password')}
        error={errors.password?.message}
      />
      <p className="text-xs text-gray-500">
        {t('membership.loginCredentialsHint')}
      </p>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={closeModal}>{t('common.cancel')}</Button>
        <Button type="submit" loading={isSubmitting}>{t('membership.createLogin')}</Button>
      </div>
    </form>
  )
}
