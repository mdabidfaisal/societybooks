import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { RefreshButton } from '../components/ui/RefreshButton'
import { ReportExportButtons } from '../components/reports/ReportExportButtons'
import { formatCurrency } from '../lib/utils'
import { useTranslation } from 'react-i18next'
import { Users, Wallet, HandshakeIcon, DollarSign, ArrowLeftRight, Landmark, Gift } from 'lucide-react'

export default function SocietySummaryPage() {
  const { samitiId } = useAuth()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{
    totalMembers: number; activeMembers: number; totalSavings: number
    loansOutstanding: number; activeLoans: number; closedLoans: number
    cashInHand: number; totalProfitDistributed: number
  } | null>(null)

  const loadSummary = useCallback(async () => {
    if (!samitiId) return
    setLoading(true)

    const [
      { count: totalM }, { count: activeM },
      { data: txData }, { data: loanData },
      { data: closedLoans },
    ] = await Promise.all([
      supabase.from('members').select('*', { count: 'exact', head: true }).eq('samiti_id', samitiId),
      supabase.from('members').select('*', { count: 'exact', head: true }).eq('samiti_id', samitiId).eq('status', 'active'),
      supabase.from('savings_transactions').select('balance_after, savings_account_id').eq('samiti_id', samitiId).order('created_at', { ascending: false }),
      supabase.from('loans').select('id, amount').eq('samiti_id', samitiId).in('status', ['disbursed']),
      supabase.from('loans').select('id, amount').eq('samiti_id', samitiId).eq('status', 'closed'),
    ])

    // Total savings
    let totalSavings = 0
    if (txData && txData.length > 0) {
      const latestByAccount = new Map<string, number>()
      for (const t of txData as { savings_account_id: string; balance_after: number }[]) {
        if (!latestByAccount.has(t.savings_account_id)) {
          latestByAccount.set(t.savings_account_id, t.balance_after)
        }
      }
      totalSavings = Array.from(latestByAccount.values()).reduce((s, b) => s + b, 0)
    }

    const loansOutstanding = loanData ? (loanData as { amount: number }[]).reduce((s, l) => s + Number(l.amount), 0) : 0
    const closedCount = closedLoans?.length || 0
    const activeLoanCount = loanData?.length || 0

    // Cash in hand from journal entries
    let cashInHand = 0
    const { data: cashAcct } = await supabase.from('chart_of_accounts').select('id').eq('samiti_id', samitiId).eq('account_code', 'CASH').maybeSingle()
    if (cashAcct) {
      const { data: jeIds } = await supabase.from('journal_entries').select('id').eq('samiti_id', samitiId)
      if (jeIds && jeIds.length > 0) {
        const ids = jeIds.map((e: { id: string }) => e.id)
        const { data: lines } = await supabase.from('journal_entry_lines').select('debit_amount, credit_amount').in('journal_entry_id', ids).eq('account_id', cashAcct.id)
        if (lines) {
          for (const l of lines as { debit_amount: number; credit_amount: number }[]) {
            cashInHand += Number(l.debit_amount) - Number(l.credit_amount)
          }
        }
      }
    }

    // Total profit distributed
    let totalProfitDistributed = 0
    const { data: distros } = await supabase.from('profit_distributions').select('total_profit_amount').eq('samiti_id', samitiId).eq('status', 'distributed')
    if (distros) {
      totalProfitDistributed = distros.reduce((s: number, d: { total_profit_amount: number }) => s + Number(d.total_profit_amount), 0)
    }

    setData({
      totalMembers: totalM || 0, activeMembers: activeM || 0,
      totalSavings, loansOutstanding,
      activeLoans: activeLoanCount, closedLoans: closedCount,
      cashInHand: Math.round(cashInHand * 100) / 100,
      totalProfitDistributed,
    })
    setLoading(false)
  }, [samitiId])

  useEffect(() => { loadSummary() }, [loadSummary])

  if (loading) return <Spinner size="lg" />

  if (!data) return <EmptyState title={t('society.noData')} description={t('society.loadError')} />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('society.title')}</h1>
        <div className="flex items-center gap-2">
          <ReportExportButtons
            filename="society-summary"
            title={t('society.title')}
            headers={[t('society.metric'), t('society.value')]}
            rows={[
              [t('society.totalMembers'), String(data.totalMembers)],
              [t('society.activeMembers'), String(data.activeMembers)],
              [t('society.totalSavings'), formatCurrency(data.totalSavings)],
              [t('society.loansOutstanding'), formatCurrency(data.loansOutstanding)],
              [t('society.activeLoans'), String(data.activeLoans)],
              [t('society.closedLoans'), String(data.closedLoans)],
              [t('society.cashInHand'), formatCurrency(data.cashInHand)],
              [t('society.profitDistributed'), formatCurrency(data.totalProfitDistributed)],
              [t('society.netPosition'), formatCurrency(data.cashInHand + data.loansOutstanding - data.totalSavings)],
            ]}
          />
          <RefreshButton onRefresh={loadSummary} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title={t('society.totalMembers')} className="border-l-4 border-l-blue-500">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.totalMembers}</p>
              <p className="text-xs text-gray-500">{t('society.activeSub', { count: data.activeMembers })}</p>
            </div>
          </div>
        </Card>
        <Card title={t('society.totalSavings')} className="border-l-4 border-l-green-500">
          <div className="flex items-center gap-3">
            <Wallet className="h-8 w-8 text-green-500" />
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.totalSavings)}</p>
          </div>
        </Card>
        <Card title={t('society.loansOutstanding')} className="border-l-4 border-l-yellow-500">
          <div className="flex items-center gap-3">
            <HandshakeIcon className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.loansOutstanding)}</p>
              <p className="text-xs text-gray-500">{t('society.loansSub', { active: data.activeLoans, closed: data.closedLoans })}</p>
            </div>
          </div>
        </Card>
        <Card title={t('society.cashInHand')} className="border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-emerald-500" />
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.cashInHand)}</p>
          </div>
        </Card>
        <Card title={t('society.profitDistributed')} className="border-l-4 border-l-purple-500">
          <div className="flex items-center gap-3">
            <Gift className="h-8 w-8 text-purple-500" />
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.totalProfitDistributed)}</p>
          </div>
        </Card>
        <Card title={t('society.netPosition')} className="border-l-4 border-l-indigo-500">
          <div className="flex items-center gap-3">
            <Landmark className="h-8 w-8 text-indigo-500" />
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.cashInHand + data.loansOutstanding - data.totalSavings)}</p>
          </div>
          <p className="text-xs text-gray-500 mt-1">{t('society.assetsLiabilities')}</p>
        </Card>
      </div>
    </div>
  )
}
