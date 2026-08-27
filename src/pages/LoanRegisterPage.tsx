import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { RefreshButton } from '../components/ui/RefreshButton'
import { ReportExportButtons } from '../components/reports/ReportExportButtons'
import { formatCurrency, formatDate } from '../lib/utils'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  disbursed: 'success', approved: 'warning', pending: 'warning',
  closed: 'default', rejected: 'danger',
}

export default function LoanRegisterPage() {
  const { samitiId } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [loans, setLoans] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const loadLoans = useCallback(async () => {
    if (!samitiId) return
    setLoading(true)
    const { data } = await supabase
      .from('loans')
      .select(`
        *,
        members!inner(name, member_number)
      `)
      .eq('samiti_id', samitiId)
      .order('created_at', { ascending: false })
    if (data) setLoans(data as Record<string, unknown>[])
    setLoading(false)
  }, [samitiId])

  useEffect(() => { loadLoans() }, [loadLoans])

  const filtered = loans.filter((l) => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false
    if (!search) return true
    const q = search.toLowerCase()
    const member = (l as { members: { name: string; member_number: string } }).members || {}
    return String(l.loan_number).toLowerCase().includes(q)
      || member.name?.toLowerCase().includes(q)
      || member.member_number?.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('loanRegister.title')}</h1>
        <div className="flex items-center gap-2">
          <ReportExportButtons
            filename={`loan-register${statusFilter !== 'all' ? `-${statusFilter}` : ''}`}
            title={t('loanRegister.title')}
            subtitle={statusFilter !== 'all' ? t('loanRegister.subtitleStatus', { status: t(`status.${statusFilter}`, { defaultValue: statusFilter }) }) : t('loanRegister.subtitleAll')}
            headers={[t('loanRegister.loanNo'), t('loanRegister.member'), t('loanRegister.memberNo'), t('loanRegister.amount'), t('loanRegister.tenureMonths'), t('loanRegister.method'), t('loanRegister.rate'), t('loanRegister.statusCol'), t('loanRegister.created')]}
            rows={filtered.map((loan) => {
              const l = loan as { loan_number: string; amount: number; tenure_months: number; profit_method: string; profit_rate: number; status: string; created_at: string; members: { name: string; member_number: string } }
              return [
                l.loan_number,
                l.members?.name || '',
                l.members?.member_number || '',
                formatCurrency(l.amount),
                String(l.tenure_months),
                l.profit_method === 'flat' ? t('loans.flatRate') : l.profit_method === 'reducing_balance' ? t('loans.reducingBalance') : l.profit_method?.replace('_', ' ') || '',
                String(l.profit_rate),
                t(`status.${l.status}`, { defaultValue: l.status }),
                formatDate(l.created_at),
              ]
            })}
            totals={[{ label: t('loanRegister.totalLoans'), value: String(filtered.length) }]}
          />
          <RefreshButton onRefresh={loadLoans} />
        </div>
      </div>

      <Card>
        <div className="flex items-end gap-4 flex-wrap">
          <div className="w-48">
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('loanRegister.status')}</label>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: t('loanRegister.allStatuses') },
                { value: 'pending', label: t('loanRegister.pending') },
                { value: 'approved', label: t('loanRegister.approved') },
                { value: 'disbursed', label: t('loanRegister.disbursed') },
                { value: 'closed', label: t('loanRegister.closed') },
                { value: 'rejected', label: t('loanRegister.rejected') },
              ]}
            />
          </div>
          <div className="relative ml-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('loanRegister.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-64"
            />
          </div>
        </div>
      </Card>

      {loading ? (
        <Spinner size="lg" />
      ) : filtered.length === 0 ? (
        <EmptyState title={t('loanRegister.noLoansTitle')} description={t('loanRegister.adjustFilters')} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                  <th className="py-3 px-3">{t('loanRegister.loanNo')}</th>
                  <th className="py-3 px-3">{t('loanRegister.member')}</th>
                  <th className="py-3 px-3 text-right">{t('loanRegister.amount')}</th>
                  <th className="py-3 px-3 text-right">{t('loanRegister.tenure')}</th>
                  <th className="py-3 px-3">{t('loanRegister.method')}</th>
                  <th className="py-3 px-3 text-right">{t('loanRegister.rate')}</th>
                  <th className="py-3 px-3">{t('loanRegister.statusCol')}</th>
                  <th className="py-3 px-3">{t('loanRegister.created')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((loan) => {
                  const l = loan as {
                    id: string; loan_number: string; amount: number
                    tenure_months: number; profit_method: string
                    profit_rate: number; status: string; created_at: string
                    members: { name: string; member_number: string }
                  }
                  return (
                    <tr
                      key={l.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/loans/${l.id}`)}
                    >
                      <td className="py-3 px-3 font-medium text-gray-900">{l.loan_number}</td>
                      <td className="py-3 px-3">
                        <span className="text-gray-900">{l.members?.name}</span>
                        <span className="text-gray-400 text-xs ml-1">[{l.members?.member_number}]</span>
                      </td>
                      <td className="py-3 px-3 text-right font-medium">{formatCurrency(l.amount)}</td>
                      <td className="py-3 px-3 text-right text-gray-600">{t('loanRegister.tenureSuffix', { months: l.tenure_months })}</td>
                      <td className="py-3 px-3 text-gray-600 capitalize">
                        {l.profit_method === 'flat' ? t('loans.flatRate') : l.profit_method === 'reducing_balance' ? t('loans.reducingBalance') : l.profit_method?.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-3 text-right">{l.profit_rate}%</td>
                      <td className="py-3 px-3"><Badge variant={statusVariant[l.status] || 'default'}>{t(`status.${l.status}`, { defaultValue: l.status })}</Badge></td>
                      <td className="py-3 px-3 text-gray-500 text-xs">{formatDate(l.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
