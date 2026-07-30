import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Card } from '../ui/Card'
import { formatCurrency } from '../../lib/utils'
import { Users, Wallet, HandCoins, TrendingUp } from 'lucide-react'

export function SocietySummary() {
  const { samitiId } = useAuth()
  const [stats, setStats] = useState<{
    totalMembers: number
    activeMembers: number
    totalSavings: number
    totalLoansOutstanding: number
  } | null>(null)

  useEffect(() => {
    if (!samitiId) return
    const load = async () => {
      const { data: members } = await supabase.from('members').select('status').eq('samiti_id', samitiId)
      const { data: loans } = await supabase.from('loans').select('amount').eq('samiti_id', samitiId).eq('status', 'disbursed')

      const totalMembers = members?.length || 0
      const activeMembers = members?.filter((m: Record<string, unknown>) => m.status === 'active').length || 0
      const totalLoansOutstanding = (loans as { amount: number }[] | null)?.reduce((s, l) => s + l.amount, 0) || 0

      setStats({ totalMembers, activeMembers, totalSavings: 0, totalLoansOutstanding })
    }
    load()
  }, [samitiId])

  if (!stats) return <p className="text-sm text-gray-500">Loading summary...</p>

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <Users className="h-8 w-8 text-blue-500 mb-2" />
        <p className="text-xs text-gray-500 uppercase">Total Members</p>
        <p className="text-2xl font-bold">{stats.totalMembers}</p>
        <p className="text-xs text-gray-400">{stats.activeMembers} active</p>
      </Card>
      <Card>
        <Wallet className="h-8 w-8 text-green-500 mb-2" />
        <p className="text-xs text-gray-500 uppercase">Total Savings</p>
        <p className="text-2xl font-bold">{formatCurrency(stats.totalSavings)}</p>
      </Card>
      <Card>
        <HandCoins className="h-8 w-8 text-yellow-500 mb-2" />
        <p className="text-xs text-gray-500 uppercase">Loans Outstanding</p>
        <p className="text-2xl font-bold">{formatCurrency(stats.totalLoansOutstanding)}</p>
      </Card>
      <Card>
        <TrendingUp className="h-8 w-8 text-purple-500 mb-2" />
        <p className="text-xs text-gray-500 uppercase">Active Loans</p>
        <p className="text-2xl font-bold">-</p>
      </Card>
    </div>
  )
}
