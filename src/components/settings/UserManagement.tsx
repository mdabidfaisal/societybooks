import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Spinner } from '../ui/Spinner'
import { Badge } from '../ui/Badge'
import { supabase } from '../../lib/supabase'
import { supabaseAdmin } from '../../lib/supabase-admin'
import { RefreshButton } from '../ui/RefreshButton'
import { useAuth } from '../../hooks/useAuth'
import { useTranslation } from 'react-i18next'
import { UserPlus, Pencil, Trash2, AlertTriangle } from 'lucide-react'

type UserFormData = {
  email: string
  password: string
  name: string
  role: 'manager' | 'member'
  member_id?: string
}

interface SamitiUser {
  id: string
  email: string
  role: string
  name: string
  member_id: string | null
  created_at: string
  last_sign_in_at: string | null
}

export function UserManagement() {
  const { samitiId } = useAuth()
  const { t } = useTranslation()
  const [users, setUsers] = useState<SamitiUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<SamitiUser | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [members, setMembers] = useState<{ value: string; label: string }[]>([])

  const userSchema = z.object({
    email: z.string().email(t('settings.validEmail')),
    password: z.string().min(6, t('settings.passwordMinLength')).or(z.literal('')),
    name: z.string().min(1, t('settings.nameRequired')),
    role: z.enum(['manager', 'member']),
    member_id: z.string().optional(),
  })

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: { email: '', password: 'Test@123', name: '', role: 'manager', member_id: '' },
  })

  const selectedRole = watch('role')

  useEffect(() => {
    if (!samitiId) return
    supabase.from('members').select('id, name, member_number').eq('samiti_id', samitiId).eq('status', 'active').order('name').then(({ data }) => {
      if (data) setMembers(data.map((m) => ({ value: m.id, label: `${m.name} [${m.member_number}]` })))
    })
  }, [samitiId])

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    const { data, error: rpcError } = await supabase.rpc('list_samiti_users')
    if (rpcError) {
      setError(rpcError.message)
    } else if (data) {
      setUsers(data as SamitiUser[])
    }
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const openCreateForm = () => {
    setEditingUser(null)
    reset({ email: '', password: 'Test@123', name: '', role: 'manager', member_id: '' })
    setShowForm(true)
    setError(null)
  }

  const openEditForm = (u: SamitiUser) => {
    setEditingUser(u)
    reset({ email: u.email, password: '', name: u.name, role: u.role as 'manager' | 'member', member_id: u.member_id || '' })
    setShowForm(true)
    setError(null)
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditingUser(null)
  }

  const onSubmit = async (formData: UserFormData) => {
    setError(null)
    setSuccess(null)

    if (editingUser) {
      const updates: Record<string, unknown> = {}
      if (formData.email !== editingUser.email) updates.email = formData.email
      if (formData.password) updates.password = formData.password
      updates.user_metadata = {
        role: formData.role,
        samiti_id: samitiId,
        name: formData.name,
      }
      if (formData.role === 'member' && formData.member_id) {
        (updates.user_metadata as Record<string, unknown>).member_id = formData.member_id
      }

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(editingUser.id, updates)
      if (updateError) {
        setError(updateError.message)
      } else {
        setSuccess(t('settings.userUpdated', { email: formData.email }))
        cancelForm()
        fetchUsers()
      }
    } else {
      const meta: Record<string, unknown> = {
        role: formData.role,
        samiti_id: samitiId,
        name: formData.name,
      }
      if (formData.role === 'member' && formData.member_id) {
        meta.member_id = formData.member_id
      }

      const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: formData.email,
        password: formData.password,
        email_confirm: true,
        user_metadata: meta,
      })
      if (createError) {
        setError(createError.message)
      } else {
        setSuccess(t('settings.userCreated', { email: formData.email }))
        cancelForm()
        fetchUsers()
      }
    }
  }

  const handleDelete = async (userId: string) => {
    setError(null)
    setSuccess(null)

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (deleteError) {
      setError(deleteError.message)
    } else {
      setSuccess(t('settings.userDeleted'))
      setDeleteConfirm(null)
      fetchUsers()
    }
  }

  const userCounts = {
    managers: users.filter((u) => u.role === 'manager').length,
    members: users.filter((u) => u.role === 'member').length,
    total: users.length,
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{t('settings.manageUsersDesc')}</p>
          <div className="flex gap-4 mt-1 text-xs text-gray-400">
            <span>{t('settings.countsTotal', { count: userCounts.total })}</span>
            <span>{t('settings.countsManagers', { count: userCounts.managers })}</span>
            <span>{t('settings.countsMembers', { count: userCounts.members })}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton onRefresh={fetchUsers} />
          <Button size="sm" onClick={openCreateForm}>
            <UserPlus className="h-4 w-4 mr-1" /> {t('settings.addUser')}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3">{success}</div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-4 bg-gray-50 rounded-lg border">
          <p className="text-sm font-medium text-gray-700">{editingUser ? t('settings.editUserTitle') : t('settings.createNewUserTitle')}</p>

          <Input id="u-name" label={t('settings.fullName')} {...register('name')} error={errors.name?.message} />

          <Input id="u-email" label={t('common.email')} type="email" {...register('email')} error={errors.email?.message} />

          <Input
            id="u-password"
            label={editingUser ? t('settings.newPasswordKeep') : t('settings.passwordLabel')}
            type="text"
            {...register('password')}
            error={errors.password?.message}
          />

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('settings.userRole')}</label>
            <Select {...register('role')} options={[
              { value: 'manager', label: t('roles.manager') },
              { value: 'member', label: t('roles.member') },
            ]} />
            {errors.role?.message && <p className="text-xs text-red-500 mt-1">{errors.role?.message}</p>}
          </div>

          {selectedRole === 'member' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('settings.linkToMember')}</label>
              <Select {...register('member_id')} options={[
                { value: '', label: t('settings.selectMemberEllipsis') },
                ...members,
              ]} />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={cancelForm}>{t('common.cancel')}</Button>
            <Button type="submit" size="sm" loading={isSubmitting}>
              {editingUser ? t('settings.updateAction') : t('settings.createAction')}
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <Spinner size="sm" />
      ) : users.length === 0 ? (
        <p className="text-sm text-gray-500">{t('settings.noUserAccounts')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                <th className="py-2 px-3">{t('common.name')}</th>
                <th className="py-2 px-3">{t('common.email')}</th>
                <th className="py-2 px-3">{t('settings.userRole')}</th>
                <th className="py-2 px-3">{t('settings.lastSignIn')}</th>
                <th className="py-2 px-3">{t('common.created')}</th>
                <th className="py-2 px-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="py-2 px-3 font-medium text-gray-900">{u.name || '—'}</td>
                  <td className="py-2 px-3 text-gray-600">{u.email}</td>
                  <td className="py-2 px-3">
                    <Badge variant={u.role === 'manager' ? 'warning' : u.role === 'member' ? 'info' : 'default'}>
                      {u.role === 'manager' ? t('roles.manager') : u.role === 'member' ? t('roles.member') : u.role}
                    </Badge>
                  </td>
                  <td className="py-2 px-3 text-xs text-gray-400">
                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : t('settings.never')}
                  </td>
                  <td className="py-2 px-3 text-xs text-gray-400">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditForm(u)}
                        className="p-1 text-gray-400 hover:text-blue-600 cursor-pointer"
                        title={t('common.edit')}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {deleteConfirm === u.id ? (
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="danger" onClick={() => handleDelete(u.id)}>{t('common.confirm')}</Button>
                          <Button size="sm" variant="secondary" onClick={() => setDeleteConfirm(null)}>{t('common.no')}</Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(u.id)}
                          className="p-1 text-gray-400 hover:text-red-600 cursor-pointer"
                          title={t('common.delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}