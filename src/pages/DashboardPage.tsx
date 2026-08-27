import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { ReportExportButtons } from '../components/reports/ReportExportButtons'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../lib/utils'
import { useTranslation } from 'react-i18next'
import type { Role } from '../config/constants'

export default function DashboardPage() {
  const { role, user, samitiId, memberId } = useAuth()
  const { t } = useTranslation()
  const [savingsBalance, setSavingsBalance] = useState(0)
  const [activeLoanCount, setActiveLoanCount] = useState(0)
  const [totalMembers, setTotalMembers] = useState(0)
  const [totalSavings, setTotalSavings] = useState(0)
  const [loansOutstanding, setLoansOutstanding] = useState(0)
  const [overdueEmis, setOverdueEmis] = useState(0)
  const [upcomingCollection, setUpcomingCollection] = useState(0)
  const [pendingApprovals, setPendingApprovals] = useState(0)
  const [memberDueAmount, setMemberDueAmount] = useState(0)
  const [cashInHand, setCashInHand] = useState(0)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!role) return
    const fetchData = async () => {
      setLoadingData(true)
      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        if (role === 'member' && memberId) {
          const { data: sa } = await supabase
            .from('savings_accounts')
            .select('id')
            .eq('member_id', memberId)
          if (sa && sa.length > 0) {
            const { data: tx } = await supabase
              .from('savings_transactions')
              .select('balance_after')
              .eq('savings_account_id', sa[0].id)
              .order('created_at', { ascending: false })
              .limit(1)
            if (tx && tx.length > 0) {
              setSavingsBalance((tx[0] as { balance_after: number }).balance_after)
            }
          }
          const { data: memberLoans } = await supabase
            .from('loans')
            .select('id')
            .eq('member_id', memberId)
            .in('status', ['disbursed'])
          setActiveLoanCount(memberLoans?.length || 0)

          if (memberLoans && memberLoans.length > 0) {
            const { data: emis } = await supabase
              .from('loan_emi_schedule')
              .select('total_amount, paid_amount, due_date')
              .in('loan_id', memberLoans.map((l: { id: string }) => l.id))
            let due = 0
            emis?.forEach((emi: { total_amount: number; paid_amount: number; due_date: string }) => {
              if (new Date(emi.due_date + 'T00:00:00') <= today && emi.paid_amount < emi.total_amount) {
                due += emi.total_amount - emi.paid_amount
              }
            })
            setMemberDueAmount(due)
          }
        }

        if ((role === 'society_admin' || role === 'manager') && samitiId) {
          const { count: mCount } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('samiti_id', samitiId)
            .eq('status', 'active')
          setTotalMembers(mCount || 0)

          const { data: txData } = await supabase
            .from('savings_transactions')
            .select('balance_after, savings_account_id')
            .eq('samiti_id', samitiId)
            .order('created_at', { ascending: false })
          if (txData && txData.length > 0) {
            const latestByAccount = new Map<string, number>()
            for (const t of txData as { savings_account_id: string; balance_after: number }[]) {
              if (!latestByAccount.has(t.savings_account_id)) {
                latestByAccount.set(t.savings_account_id, t.balance_after)
              }
            }
            const total = Array.from(latestByAccount.values()).reduce((sum, b) => sum + b, 0)
            setTotalSavings(total)
          }

          const { data: loanData } = await supabase
            .from('loans')
            .select('id, amount')
            .eq('samiti_id', samitiId)
            .in('status', ['disbursed'])
          if (loanData) {
            const total = (loanData as { amount: number }[]).reduce((sum, l) => sum + l.amount, 0)
            setLoansOutstanding(total)

            const loanIds = (loanData as { id: string }[]).map((l) => l.id)
            if (loanIds.length > 0) {
              const { data: emis } = await supabase
                .from('loan_emi_schedule')
                .select('total_amount, paid_amount, due_date')
                .in('loan_id', loanIds)
              let overdueCount = 0
              let upcomingSum = 0
              emis?.forEach((emi: { total_amount: number; paid_amount: number; due_date: string }) => {
                const dueDate = new Date(emi.due_date + 'T00:00:00')
                if (dueDate <= today && emi.paid_amount < emi.total_amount) {
                  overdueCount++
                }
                if (dueDate > today && dueDate <= new Date(today.getTime() + 30 * 86400000)) {
                  upcomingSum += emi.total_amount - emi.paid_amount
                }
              })
              setOverdueEmis(overdueCount)
              setUpcomingCollection(upcomingSum)
            }
          }

          // Cash/Bank balance from journal entries
          const { data: cashAcct } = await supabase
            .from('chart_of_accounts')
            .select('id')
            .eq('samiti_id', samitiId)
            .eq('account_code', 'CASH')
            .maybeSingle()
          if (cashAcct) {
            const { data: jeIds } = await supabase
              .from('journal_entries')
              .select('id')
              .eq('samiti_id', samitiId)
            if (jeIds && jeIds.length > 0) {
              const ids = jeIds.map((e: { id: string }) => e.id)
              const { data: lines } = await supabase
                .from('journal_entry_lines')
                .select('debit_amount, credit_amount')
                .in('journal_entry_id', ids)
                .eq('account_id', cashAcct.id)
              if (lines) {
                let bal = 0
                for (const l of lines as { debit_amount: number; credit_amount: number }[]) {
                  bal += Number(l.debit_amount) - Number(l.credit_amount)
                }
                setCashInHand(Math.round(bal * 100) / 100)
              }
            }
          }

          if (role === 'society_admin') {
            const { count: pCount } = await supabase
              .from('loans')
              .select('*', { count: 'exact', head: true })
              .eq('samiti_id', samitiId)
              .eq('status', 'pending')
            setPendingApprovals(pCount || 0)
          }
        }
      } finally {
        setLoadingData(false)
      }
    }
    fetchData()
  }, [role, samitiId, memberId])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('dashboard.welcome', { name: user?.email })} — {t(`roles.${role as Role}`)}
          </p>
        </div>
        {!loadingData && (role === 'member' || role === 'manager' || role === 'society_admin') && (
          <ReportExportButtons
            filename={`dashboard-summary-${new Date().toISOString().split('T')[0]}`}
            title={t('dashboard.title')}
            subtitle={t('dashboard.summarySubtitle')}
            headers={[t('society.metric'), t('society.value')]}
            rows={role === 'member'
              ? [
                  [t('dashboard.mySavings'), formatCurrency(savingsBalance)],
                  [t('dashboard.myLoan'), String(activeLoanCount)],
                  [t('dashboard.amountDue'), formatCurrency(memberDueAmount)],
                ]
              : [
                  [t('accounting.cashBalance'), formatCurrency(cashInHand)],
                  [t('dashboard.totalSavings'), formatCurrency(totalSavings)],
                  [t('dashboard.totalLoans'), formatCurrency(loansOutstanding)],
                  [t('loans.overdueEmis'), String(overdueEmis)],
                  [t('dashboard.upcomingCollection'), formatCurrency(upcomingCollection)],
                  ...(role === 'society_admin'
                    ? [
                        [t('dashboard.totalMembers'), String(totalMembers)],
                        [t('dashboard.pendingApprovals'), String(pendingApprovals)],
                      ]
                    : []),
                ]}
          />
        )}
      </div>

      {role === 'member' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card title={t('dashboard.mySavings')} className="border-l-4 border-l-blue-500">
            {loadingData ? <Spinner size="sm" /> : <p className="text-2xl font-bold text-gray-900">{formatCurrency(savingsBalance)}</p>}
          </Card>
          <Card title={t('dashboard.myLoan')} className="border-l-4 border-l-yellow-500">
            {loadingData ? <Spinner size="sm" /> : <p className="text-2xl font-bold text-gray-900">{activeLoanCount}</p>}
          </Card>
          <Card title={t('dashboard.amountDue')} className="border-l-4 border-l-red-500">
            {loadingData ? <Spinner size="sm" /> : <p className="text-2xl font-bold text-gray-900">{formatCurrency(memberDueAmount)}</p>}
          </Card>
          <Card title={t('dashboard.myShares')} className="border-l-4 border-l-green-500">
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(0)}</p>
          </Card>
        </div>
      )}

      {(role === 'manager' || role === 'society_admin') && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card title={t('accounting.cashBalance')} className="border-l-4 border-l-emerald-500">
            {loadingData ? <Spinner size="sm" /> : <p className="text-2xl font-bold text-gray-900">{formatCurrency(cashInHand)}</p>}
          </Card>
          <Card title={t('dashboard.totalSavings')} className="border-l-4 border-l-green-500">
            {loadingData ? <Spinner size="sm" /> : <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalSavings)}</p>}
          </Card>
          <Card title={t('dashboard.totalLoans')} className="border-l-4 border-l-blue-500">
            {loadingData ? <Spinner size="sm" /> : <p className="text-2xl font-bold text-gray-900">{formatCurrency(loansOutstanding)}</p>}
          </Card>
          <Card title={t('dashboard.activeLoans')} className="border-l-4 border-l-yellow-500">
            {loadingData ? <Spinner size="sm" /> : <p className="text-2xl font-bold text-gray-900">{overdueEmis}</p>}
          </Card>
          <Card title={t('loans.overdueEmis')} className="border-l-4 border-l-purple-500">
            {loadingData ? <Spinner size="sm" /> : <p className="text-2xl font-bold text-gray-900">{formatCurrency(upcomingCollection)}</p>}
          </Card>
        </div>
      )}

      {role === 'society_admin' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title={t('dashboard.totalMembers')} className="border-l-4 border-l-blue-500">
            {loadingData ? <Spinner size="sm" /> : <p className="text-2xl font-bold text-gray-900">{totalMembers}</p>}
          </Card>
          <Card title={t('dashboard.pendingApprovals')} className="border-l-4 border-l-purple-500">
            {loadingData ? <Spinner size="sm" /> : <p className="text-2xl font-bold text-gray-900">{pendingApprovals}</p>}
          </Card>
        </div>
      )}

      {role === 'super_admin' && (
        <Card title={t('dashboard.title')}>
          <p className="text-gray-500">{t('dashboard.pendingApprovals')}</p>
        </Card>
      )}
    </div>
  )
}
