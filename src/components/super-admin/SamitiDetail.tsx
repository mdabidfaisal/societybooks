import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatDate, formatCurrency } from '../../lib/utils'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Spinner } from '../ui/Spinner'
import { Building2, Users, Wallet, HandCoins, Calendar } from 'lucide-react'
import type { SamitiRow } from './SamitiList'

export interface SamitiStats {
  total_members: number
  active_members: number
  total_savings: number
  active_loans: number
  total_loans_disbursed: number
}

interface SamitiDetailProps {
  samitiId: string
}

export function SamitiDetail({ samitiId }: SamitiDetailProps) {
  const [samiti, setSamiti] = useState<SamitiRow | null>(null)
  const [stats, setStats] = useState<SamitiStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)

      const { data: samitiData, error: samitiErr } = await supabase
        .from('samiti_settings')
        .select('*')
        .eq('id', samitiId)
        .single()

      if (samitiErr) {
        setError(samitiErr.message)
        setLoading(false)
        return
      }
      setSamiti(samitiData as unknown as SamitiRow)

      const { count: totalMembers } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('samiti_id', samitiId)
      const { count: activeMembers } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('samiti_id', samitiId)
        .eq('status', 'active')
      const { count: activeLoans } = await supabase
        .from('loans')
        .select('*', { count: 'exact', head: true })
        .eq('samiti_id', samitiId)
        .in('status', ['disbursed'])

      const { data: txData } = await supabase
        .from('savings_transactions')
        .select('balance_after, savings_account_id')
        .eq('samiti_id', samitiId)
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

      const { data: loanData } = await supabase
        .from('loans')
        .select('amount')
        .eq('samiti_id', samitiId)
        .in('status', ['disbursed'])
      const totalLoansDisbursed = loanData ? (loanData as { amount: number }[]).reduce((sum, l) => sum + l.amount, 0) : 0

      setStats({
        total_members: totalMembers || 0,
        active_members: activeMembers || 0,
        total_savings: totalSavings,
        active_loans: activeLoans || 0,
        total_loans_disbursed: totalLoansDisbursed,
      })
      setLoading(false)
    }

    fetchData()
  }, [samitiId])

  if (loading) return <Spinner size="lg" />
  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4">{error}</div>
  if (!samiti) return <div className="text-gray-500 text-sm">Samiti not found.</div>

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-blue-50 rounded-lg">
          <Building2 className="h-8 w-8 text-blue-600" />
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">{samiti.samiti_name}</h2>
            {samiti.is_active
              ? <Badge variant="success">Active</Badge>
              : <Badge variant="danger">Inactive</Badge>
            }
          </div>
          <p className="text-sm text-gray-500">Code: {samiti.samiti_code}</p>
          <p className="text-xs text-gray-400">Created: {formatDate(samiti.created_at)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="Total Members" className="border-l-4 border-l-blue-500">
          <p className="text-2xl font-bold text-gray-900">{stats?.total_members || 0}</p>
          <p className="text-xs text-green-600">{stats?.active_members || 0} active</p>
        </Card>
        <Card title="Total Savings" className="border-l-4 border-l-green-500">
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.total_savings || 0)}</p>
        </Card>
        <Card title="Active Loans" className="border-l-4 border-l-yellow-500">
          <p className="text-2xl font-bold text-gray-900">{stats?.active_loans || 0}</p>
        </Card>
        <Card title="Loans Disbursed" className="border-l-4 border-l-purple-500">
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.total_loans_disbursed || 0)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Configuration">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Profit Method</dt>
              <dd className="font-medium">
                <Badge variant="info">{samiti.default_profit_method === 'flat' ? 'Flat Rate' : 'Reducing Balance'}</Badge>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Profit Rate</dt>
              <dd className="font-medium">{samiti.default_profit_rate}%</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Shares</dt>
              <dd>{samiti.shares_enabled ? <Badge variant="success">Enabled</Badge> : <Badge variant="default">Disabled</Badge>}</dd>
            </div>
            {samiti.shares_enabled && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Share Value</dt>
                <dd className="font-medium">{formatCurrency(samiti.share_value)}</dd>
              </div>
            )}
          </dl>
        </Card>
        <Card title="Contact">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Address</dt>
              <dd className="font-medium">{samiti.address || <span className="text-gray-400">Not set</span>}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Phone</dt>
              <dd className="font-medium">{samiti.phone || <span className="text-gray-400">Not set</span>}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  )
}
