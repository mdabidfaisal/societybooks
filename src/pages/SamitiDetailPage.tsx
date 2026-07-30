import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUIStore } from '../store/uiStore'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { RefreshButton } from '../components/ui/RefreshButton'
import { SamitiDetail } from '../components/super-admin/SamitiDetail'
import { SamitiForm, type SamitiFormData } from '../components/super-admin/SamitiForm'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Pencil, Trash2, ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react'
import type { SamitiRow } from '../components/super-admin/SamitiList'

const deletionConstraints = [
  'Members', 'Savings Accounts', 'Savings Transactions',
  'Loans & EMI Schedules', 'Chart of Accounts',
  'Journal Entries', 'Profit Distributions',
]

export default function SamitiDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const activeModal = useUIStore((s) => s.activeModal)
  const openModal = useUIStore((s) => s.openModal)
  const closeModal = useUIStore((s) => s.closeModal)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [togglingActive, setTogglingActive] = useState(false)

  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [editDefaults, setEditDefaults] = useState<SamitiFormData | null>(null)

  const handleEdit = async () => {
    const { data } = await supabase
      .from('samiti_settings')
      .select('*')
      .eq('id', id)
      .single()
    if (data) {
      const d = data as Record<string, unknown>
      setIsActive(d.is_active as boolean)
      setEditDefaults({
        samiti_name: d.samiti_name as string,
        samiti_code: d.samiti_code as string,
        is_active: d.is_active as boolean,
        shares_enabled: d.shares_enabled as boolean,
        share_value: Number(d.share_value),
        default_profit_method: d.default_profit_method as 'flat' | 'reducing_balance',
        default_profit_rate: Number(d.default_profit_rate),
        address: (d.address as string) || '',
        phone: (d.phone as string) || '',
      })
      openModal('edit-samiti')
    }
  }

  const handleUpdate = async (data: SamitiFormData) => {
    setFormError(null)
    setFormSuccess(null)
    setFormSubmitting(true)

    const { error } = await supabase
      .from('samiti_settings')
      .update({
        samiti_name: data.samiti_name,
        samiti_code: data.samiti_code,
        is_active: data.is_active,
        shares_enabled: data.shares_enabled,
        share_value: data.share_value,
        default_profit_method: data.default_profit_method,
        default_profit_rate: data.default_profit_rate,
        address: data.address || null,
        phone: data.phone || null,
      })
      .eq('id', id)

    if (error) {
      setFormError(error.message)
      setFormSubmitting(false)
      return
    }

    setIsActive(data.is_active)
    setFormSuccess('Samiti updated successfully!')
    setFormSubmitting(false)
    setRefreshKey((k) => k + 1)
  }

  const handleToggleActive = async () => {
    setTogglingActive(true)
    const { error } = await supabase
      .from('samiti_settings')
      .update({ is_active: !isActive })
      .eq('id', id)
    if (!error) {
      setIsActive(!isActive)
      setRefreshKey((k) => k + 1)
    }
    setTogglingActive(false)
  }

  const handleDelete = async () => {
    setDeleteSubmitting(true)
    setDeleteError(null)

    const { error } = await supabase.rpc('delete_samiti_cascade', {
      p_samiti_id: id,
    })

    if (error) {
      setDeleteError(error.message)
      setDeleteSubmitting(false)
      return
    }

    navigate('/super-admin')
  }

  if (!id) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/super-admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Samiti Details</h1>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton onRefresh={() => setRefreshKey((k) => k + 1)} />
          <Button variant="ghost" size="sm" onClick={handleToggleActive} disabled={togglingActive} title={isActive ? 'Deactivate' : 'Activate'}>
            {isActive ? <ToggleRight className="h-4 w-4 text-green-600 mr-1" /> : <ToggleLeft className="h-4 w-4 text-gray-400 mr-1" />}
            {isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <Button variant="secondary" size="sm" onClick={handleEdit}>
            <Pencil className="h-4 w-4 mr-1" /> Edit
          </Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteConfirm(true)}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
        </div>
      </div>

      <SamitiDetail key={refreshKey} samitiId={id} />

      {activeModal === 'edit-samiti' && editDefaults && (
        <Modal title="Edit Samiti" size="xl">
          <SamitiForm
            defaultValues={editDefaults}
            onSubmit={handleUpdate}
            isSubmitting={formSubmitting}
            error={formError}
            success={formSuccess}
            submitLabel="Update Samiti"
          />
          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={closeModal}>Close</Button>
          </div>
        </Modal>
      )}

      {deleteConfirm && (
        <Modal title="Delete Samiti" size="lg">
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">This action cannot be undone.</p>
                  <p className="mt-1">
                    Deleting this samiti will permanently remove all data across{' '}
                    <strong>{deletionConstraints.length} tables</strong>.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-4">
              <p className="font-medium mb-2">The following data will also be deleted:</p>
              <ul className="list-disc list-inside space-y-1">
                {deletionConstraints.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg p-4">
              <p className="font-medium">Recommendation:</p>
              <p className="mt-1">
                Instead of deleting, use the <strong>Deactivate</strong> button to suspend services while preserving data.
              </p>
            </div>

            {deleteError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                <p className="font-medium">Foreign key constraint error</p>
                <p className="mt-1 text-xs">{deleteError}</p>
                <p className="mt-1">Delete related records first or use deactivate instead.</p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setDeleteConfirm(false); setDeleteError(null) }}>Cancel</Button>
              <Button variant="danger" onClick={handleDelete} loading={deleteSubmitting}>Delete Permanently</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
