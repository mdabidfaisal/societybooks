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
import { formatCurrency, formatDate } from '../lib/utils'
import { Search } from 'lucide-react'

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  disbursed: 'success', approved: 'warning', pending: 'warning',
  closed: 'default', rejected: 'danger',
}

export default function LoanRegisterPage() {
  const { samitiId } = useAuth()
  const navigate = useNavigate()
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
        <h1 className="text-2xl font-bold text-gray-900">Loan Register</h1>
        <RefreshButton onRefresh={loadLoans} />
      </div>

      <Card>
        <div className="flex items-end gap-4 flex-wrap">
          <div className="w-48">
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'disbursed', label: 'Disbursed' },
                { value: 'closed', label: 'Closed' },
                { value: 'rejected', label: 'Rejected' },
              ]}
            />
          </div>
          <div className="relative ml-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search loan # or member..."
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
        <EmptyState title="No loans found" description="Try adjusting your filters." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                  <th className="py-3 px-3">Loan #</th>
                  <th className="py-3 px-3">Member</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 px-3 text-right">Tenure</th>
                  <th className="py-3 px-3">Method</th>
                  <th className="py-3 px-3 text-right">Rate</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Created</th>
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
                      <td className="py-3 px-3 text-right text-gray-600">{l.tenure_months}m</td>
                      <td className="py-3 px-3 text-gray-600 capitalize">{l.profit_method?.replace('_', ' ')}</td>
                      <td className="py-3 px-3 text-right">{l.profit_rate}%</td>
                      <td className="py-3 px-3"><Badge variant={statusVariant[l.status] || 'default'}>{l.status}</Badge></td>
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
