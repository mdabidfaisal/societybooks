import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { supabaseAdmin } from '../lib/supabase-admin'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Spinner } from '../components/ui/Spinner'
import { Input } from '../components/ui/Input'
import { RefreshButton } from '../components/ui/RefreshButton'
import { useUIStore } from '../store/uiStore'
import { SamitiList, type SamitiRow } from '../components/super-admin/SamitiList'
import { SamitiForm, type SamitiFormData, defaultSamitiValues } from '../components/super-admin/SamitiForm'
import { ReportExportButtons } from '../components/reports/ReportExportButtons'
import { formatDate } from '../lib/utils'
import { useTranslation } from 'react-i18next'
import { Building2, Users, Plus, AlertTriangle } from 'lucide-react'

interface DashboardStats {
  total_samitis: number
  active_samitis: number
  active_members_count: number
  total_loans_disbursed: number
  total_savings: number
}

const deletionConstraints = [
  { table: 'members', label: 'superAdmin.members', fk: 'members_samiti_id_fkey' },
  { table: 'savings_accounts', label: 'superAdmin.savingsAccounts', fk: 'savings_accounts_samiti_id_fkey' },
  { table: 'savings_transactions', label: 'superAdmin.savingsTransactions', fk: 'savings_transactions_samiti_id_fkey' },
  { table: 'loans', label: 'superAdmin.loansAndEmi', fk: 'loans_samiti_id_fkey' },
  { table: 'chart_of_accounts', label: 'accounting.chartOfAccounts', fk: 'chart_of_accounts_samiti_id_fkey' },
  { table: 'journal_entries', label: 'accounting.journalEntries', fk: 'journal_entries_samiti_id_fkey' },
  { table: 'profit_distributions', label: 'superAdmin.profitDistributions', fk: 'profit_distributions_samiti_id_fkey' },
]

export default function SuperAdminPage() {
  const activeModal = useUIStore((s) => s.activeModal)
  const openModal = useUIStore((s) => s.openModal)
  const closeModal = useUIStore((s) => s.closeModal)
  const modalData = useUIStore((s) => s.modalData) as { samiti?: SamitiRow } | null
  const { t } = useTranslation()

  const [samitis, setSamitis] = useState<SamitiRow[]>([])
  const [loadingSamitis, setLoadingSamitis] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    total_samitis: 0, active_samitis: 0, active_members_count: 0, total_loans_disbursed: 0, total_savings: 0,
  })
  const [loadingStats, setLoadingStats] = useState(true)

  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)

  const [deleteConfirm, setDeleteConfirm] = useState<SamitiRow | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  const [adminSamiti, setAdminSamiti] = useState<SamitiRow | null>(null)
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminName, setAdminName] = useState('')
  const [adminSubmitting, setAdminSubmitting] = useState(false)
  const [adminError, setAdminError] = useState<string | null>(null)
  const [adminSuccess, setAdminSuccess] = useState<string | null>(null)

  const fetchSamitis = useCallback(async () => {
    setLoadingSamitis(true)
    const { data, error } = await supabase
      .from('samiti_settings')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) {
      setSamitis(data as SamitiRow[])
    }
    setLoadingSamitis(false)
  }, [])

  const fetchStats = useCallback(async () => {
    setLoadingStats(true)
    const { count: totalSamitis } = await supabase
      .from('samiti_settings')
      .select('*', { count: 'exact', head: true })

    const { count: activeSamitis } = await supabase
      .from('samiti_settings')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    const { count: activeMembers } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    const { data: loanData } = await supabase
      .from('loans')
      .select('amount')
      .in('status', ['disbursed'])
    const totalLoans = loanData ? (loanData as { amount: number }[]).reduce((sum, l) => sum + l.amount, 0) : 0

    const { data: txData } = await supabase
      .from('savings_transactions')
      .select('balance_after, savings_account_id')
      .order('created_at', { ascending: false })
    let totalSavings = 0
    if (txData && txData.length > 0) {
      const latestByAccount = new Map<string, number>()
      for (const t of txData as { savings_account_id: string; balance_after: number }[]) {
        if (!latestByAccount.has(t.savings_account_id)) {
          latestByAccount.set(t.savings_account_id, t.balance_after)
        }
      }
      totalSavings = Array.from(latestByAccount.values()).reduce((sum, b) => sum + b, 0)
    }

    setStats({
      total_samitis: totalSamitis || 0,
      active_samitis: activeSamitis || 0,
      active_members_count: activeMembers || 0,
      total_loans_disbursed: totalLoans,
      total_savings: totalSavings,
    })
    setLoadingStats(false)
  }, [])

  useEffect(() => {
    fetchSamitis()
    fetchStats()
  }, [fetchSamitis, fetchStats])

  const resetFormState = () => {
    setFormError(null)
    setFormSuccess(null)
    setFormSubmitting(false)
  }

  const handleCreate = async (data: SamitiFormData) => {
    resetFormState()
    setFormSubmitting(true)

    const { data: existing } = await supabase
      .from('samiti_settings')
      .select('id')
      .eq('samiti_code', data.samiti_code)
      .maybeSingle()
    if (existing) {
      setFormError('A samiti with this code already exists.')
      setFormSubmitting(false)
      return
    }

    const { data: newSamiti, error: samitiErr } = await supabase
      .from('samiti_settings')
      .insert({
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
      .select()
      .single()

    if (samitiErr || !newSamiti) {
      setFormError(samitiErr?.message || t('superAdmin.createFailed'))
      setFormSubmitting(false)
      return
    }

    const samitiId = (newSamiti as { id: string }).id

    await supabase.from('chart_of_accounts').insert([
      { samiti_id: samitiId, account_code: '1001', account_name: 'Cash & Bank', account_type: 'asset', is_system: true },
      { samiti_id: samitiId, account_code: '1002', account_name: 'Loans Receivable', account_type: 'asset', is_system: true },
      { samiti_id: samitiId, account_code: '2001', account_name: 'Member Savings', account_type: 'liability', is_system: true },
      { samiti_id: samitiId, account_code: '2002', account_name: 'Profit Payable', account_type: 'liability', is_system: true },
      { samiti_id: samitiId, account_code: '3001', account_name: 'Retained Earnings', account_type: 'equity', is_system: true },
      { samiti_id: samitiId, account_code: '4001', account_name: 'Loan Profit Income', account_type: 'income', is_system: true },
      { samiti_id: samitiId, account_code: '4002', account_name: 'Savings Profit Income', account_type: 'income', is_system: true },
      { samiti_id: samitiId, account_code: '4003', account_name: 'Other Income', account_type: 'income', is_system: true },
      { samiti_id: samitiId, account_code: '5001', account_name: 'Operating Expense', account_type: 'expense', is_system: true },
      { samiti_id: samitiId, account_code: '5002', account_name: 'Administrative Expense', account_type: 'expense', is_system: true },
    ] as never)

    setFormSuccess('Samiti created successfully!')
    setFormSubmitting(false)
    fetchSamitis()
    fetchStats()
  }

  const handleUpdate = async (data: SamitiFormData) => {
    const editSamiti = modalData?.samiti
    if (!editSamiti) return
    resetFormState()
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
      .eq('id', editSamiti.id)

    if (error) {
      setFormError(error.message)
      setFormSubmitting(false)
      return
    }

    setFormSuccess('Samiti updated successfully!')
    setFormSubmitting(false)
    fetchSamitis()
  }

  const handleToggleActive = async (samiti: SamitiRow) => {
    const { error } = await supabase
      .from('samiti_settings')
      .update({ is_active: !samiti.is_active })
      .eq('id', samiti.id)

    if (!error) {
      fetchSamitis()
      fetchStats()
    }
  }

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminSamiti) return
    setAdminSubmitting(true)
    setAdminError(null)
    setAdminSuccess(null)

    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        role: 'society_admin',
        samiti_id: adminSamiti.id,
        name: adminName,
      },
    })

    if (error) {
      setAdminError(error.message)
      setAdminSubmitting(false)
      return
    }

    setAdminSuccess(`Admin "${adminName}" created successfully! You can now log in as ${adminEmail}.`)
    setAdminSubmitting(false)
    setAdminEmail('')
    setAdminPassword('')
    setAdminName('')
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setDeleteSubmitting(true)
    setDeleteError(null)

    const { error } = await supabase.rpc('delete_samiti_cascade', {
      p_samiti_id: deleteConfirm.id,
    })

    if (error) {
      setDeleteError(error.message)
      setDeleteSubmitting(false)
      return
    }

    setDeleteConfirm(null)
    setDeleteSubmitting(false)
    fetchSamitis()
    fetchStats()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('superAdmin.title')}</h1>
        <div className="flex items-center gap-2">
          {samitis.length > 0 && (
            <ReportExportButtons
              filename={`samitis-${new Date().toISOString().split('T')[0]}`}
              title={t('superAdmin.registeredSamitis')}
              headers={[t('common.name'), t('common.code'), t('common.status'), t('superAdmin.profitMethod'), t('superAdmin.profitRate'), t('superAdmin.shares'), t('common.created')]}
              rows={samitis.map((s) => [
                s.samiti_name,
                s.samiti_code,
                s.is_active ? t('common.active') : t('common.inactive'),
                s.default_profit_method === 'flat' ? t('loans.flatRate') : t('loans.reducingBalance'),
                `${s.default_profit_rate}%`,
                s.shares_enabled ? t('common.enabled') : t('common.disabled'),
                formatDate(s.created_at),
              ])}
            />
          )}
          <RefreshButton onRefresh={() => { fetchSamitis(); fetchStats() }} />
          <Button onClick={() => { resetFormState(); openModal('provision') }}>
            <Plus className="h-4 w-4 mr-1" /> {t('superAdmin.newSamiti')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title={t('superAdmin.totalSamitis')} className="border-l-4 border-l-blue-500">
          {loadingStats ? <Spinner size="sm" /> : (
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              <p className="text-2xl font-bold text-gray-900">{stats.total_samitis}</p>
            </div>
          )}
        </Card>
        <Card title={t('superAdmin.activeSamitis')} className="border-l-4 border-l-green-500">
          {loadingStats ? <Spinner size="sm" /> : (
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-green-500" />
              <p className="text-2xl font-bold text-gray-900">{stats.active_samitis}</p>
            </div>
          )}
        </Card>
        <Card title={t('superAdmin.totalLoansDisbursed')} className="border-l-4 border-l-yellow-500">
          {loadingStats ? <Spinner size="sm" /> : (
            <p className="text-2xl font-bold text-gray-900">
              {new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(stats.total_loans_disbursed)}
            </p>
          )}
        </Card>
        <Card title={t('superAdmin.totalSavings')} className="border-l-4 border-l-purple-500">
          {loadingStats ? <Spinner size="sm" /> : (
            <p className="text-2xl font-bold text-gray-900">
              {new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(stats.total_savings)}
            </p>
          )}
        </Card>
      </div>

      <Card
        title={
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gray-400" />
            <span>{t('superAdmin.registeredSamitis')}</span>
          </div>
        }
      >
        <SamitiList
          data={samitis}
          loading={loadingSamitis}
          onEdit={(s) => { resetFormState(); openModal('edit-samiti', { samiti: s }) }}
          onDelete={(s) => setDeleteConfirm(s)}
          onToggleActive={handleToggleActive}
          onCreateAdmin={(s) => { setAdminSamiti(s); setAdminError(null); setAdminSuccess(null); setAdminEmail(''); setAdminPassword(''); setAdminName('') }}
        />
      </Card>

      {activeModal === 'provision' && (
        <Modal title={t('superAdmin.createNewSamiti')} size="xl">
          <SamitiForm
            defaultValues={defaultSamitiValues}
            onSubmit={handleCreate}
            isSubmitting={formSubmitting}
            error={formError}
            success={formSuccess}
            submitLabel={t('superAdmin.createSamiti')}
          />
          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={closeModal}>{t('common.close')}</Button>
          </div>
        </Modal>
      )}

      {activeModal === 'edit-samiti' && modalData?.samiti && (
        <Modal title={t('superAdmin.editSamitiTitle', { name: modalData.samiti.samiti_name })} size="xl">
          <SamitiForm
            defaultValues={{
              samiti_name: modalData.samiti.samiti_name,
              samiti_code: modalData.samiti.samiti_code,
              is_active: modalData.samiti.is_active,
              shares_enabled: modalData.samiti.shares_enabled,
              share_value: modalData.samiti.share_value,
              default_profit_method: modalData.samiti.default_profit_method as 'flat' | 'reducing_balance',
              default_profit_rate: modalData.samiti.default_profit_rate,
              address: modalData.samiti.address || '',
              phone: modalData.samiti.phone || '',
            }}
            onSubmit={handleUpdate}
            isSubmitting={formSubmitting}
            error={formError}
            success={formSuccess}
            submitLabel={t('superAdmin.updateSamiti')}
          />
          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={closeModal}>{t('common.close')}</Button>
          </div>
        </Modal>
      )}

      {adminSamiti && (
        <Modal title={t('superAdmin.createAdminFor', { name: adminSamiti.samiti_name })} size="sm">
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            {adminError && <div className="bg-red-50 text-red-700 text-sm px-4 py-2 rounded-md">{adminError}</div>}
            {adminSuccess && <div className="bg-green-50 text-green-700 text-sm px-4 py-2 rounded-md">{adminSuccess}</div>}
            {!adminSuccess && (
              <>
                <Input id="admin-email" label={t('auth.email')} type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@yoursamiti.com" required />
                <Input id="admin-name" label={t('auth.name')} value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Samiti Admin" required />
                <Input id="admin-password" label={t('auth.password')} type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="••••••••" required />
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" type="button" onClick={() => setAdminSamiti(null)}>{t('common.cancel')}</Button>
                  <Button type="submit" loading={adminSubmitting}>{t('superAdmin.createAdmin')}</Button>
                </div>
              </>
            )}
            {adminSuccess && (
              <div className="flex justify-end">
                <Button variant="secondary" type="button" onClick={() => setAdminSamiti(null)}>{t('common.close')}</Button>
              </div>
            )}
          </form>
        </Modal>
      )}

      {deleteConfirm && (
        <Modal title={t('superAdmin.deleteSamitiTitle', { name: deleteConfirm.samiti_name })} size="lg">
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">{t('superAdmin.cannotBeUndone')}</p>
                  <p className="mt-1">
                    {t('superAdmin.deletingWill', {
                      name: deleteConfirm.samiti_name,
                      count: deletionConstraints.length,
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-4">
              <p className="font-medium mb-2">{t('superAdmin.alsoDeleted')}</p>
              <ul className="list-disc list-inside space-y-1">
                {deletionConstraints.map((c) => (
                  <li key={c.table}>{t(c.label)}</li>
                ))}
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg p-4">
              <p className="font-medium">{t('superAdmin.recommendation')}</p>
              <p className="mt-1">{t('superAdmin.deactivateRecommend')}</p>
            </div>

            {deleteError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                <p className="font-medium">{t('superAdmin.fkError')}</p>
                <p className="mt-1 text-xs">{deleteError}</p>
                <p className="mt-1">{t('superAdmin.deleteRelated')}</p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setDeleteConfirm(null); setDeleteError(null) }}>{t('common.cancel')}</Button>
              <Button variant="danger" onClick={handleDelete} loading={deleteSubmitting}>{t('superAdmin.deletePermanently')}</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
