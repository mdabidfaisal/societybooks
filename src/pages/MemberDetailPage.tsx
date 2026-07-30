import { useParams, useNavigate } from 'react-router-dom'
import { useMembers } from '../hooks/useMembers'
import { useAuth } from '../hooks/useAuth'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Spinner } from '../components/ui/Spinner'
import { MemberProfile } from '../components/members/MemberProfile'
import { MemberExitForm } from '../components/members/MemberExitForm'
import { useUIStore } from '../store/uiStore'
import { formatCurrency, formatDate } from '../lib/utils'
import { ArrowLeft, Plus, Wallet, ToggleLeft, ToggleRight, Gift } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { SavingsAccountData } from '../hooks/useSavings'

export default function MemberDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { members, loading: membersLoading, toggleMemberStatus, fetchMembers } = useMembers()
  const { role } = useAuth()
  const activeModal = useUIStore((s) => s.activeModal)
  const openModal = useUIStore((s) => s.openModal)
  const modalData = useUIStore((s) => s.modalData) as { memberId: string; memberName: string } | null

  const [savingsAccounts, setSavingsAccounts] = useState<(SavingsAccountData & { balance: number })[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [loans, setLoans] = useState<{ id: string; loan_number: string; amount: number; status: string }[]>([])
  const [opening, setOpening] = useState(false)
  const [profitDistros, setProfitDistros] = useState<{ distro_num: string; date: string; amount: number }[]>([])

  const member = members.find((m) => m.id === id)

  const loadAccounts = useCallback(async () => {
    if (!id) return
    setLoadingAccounts(true)
    const { data: accts } = await supabase
      .from('savings_accounts')
      .select('*')
      .eq('member_id', id)
      .order('created_at', { ascending: false })
    if (!accts) { setLoadingAccounts(false); return }
    const withBal: (SavingsAccountData & { balance: number })[] = []
    for (const acct of accts as SavingsAccountData[]) {
      const { data: tx } = await supabase
        .from('savings_transactions')
        .select('balance_after')
        .eq('savings_account_id', acct.id)
        .order('created_at', { ascending: false })
        .limit(1)
      withBal.push({
        ...acct,
        balance: (tx && tx.length > 0) ? (tx[0] as { balance_after: number }).balance_after : 0,
      })
    }
    setSavingsAccounts(withBal)
    setLoadingAccounts(false)
  }, [id])

  useEffect(() => {
    loadAccounts()
    if (!id) return
    supabase.from('loans')
      .select('id, loan_number, amount, status')
      .eq('member_id', id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setLoans(data as { id: string; loan_number: string; amount: number; status: string }[]) })
    supabase.from('profit_distribution_items')
      .select('distribution_amount, profit_distribution_id')
      .eq('member_id', id)
      .then(async ({ data: items }) => {
        if (!items || items.length === 0) return
        const distroIds = items.map((i: { profit_distribution_id: string }) => i.profit_distribution_id)
        const { data: distros } = await supabase
          .from('profit_distributions')
          .select('id, distribution_number, distribution_date')
          .in('id', distroIds)
        const distroMap = new Map((distros || []).map((d: { id: string; distribution_number: string; distribution_date: string }) => [d.id, d]))
        setProfitDistros(items.map((i: { profit_distribution_id: string; distribution_amount: number }) => {
          const d = distroMap.get(i.profit_distribution_id)
          return { distro_num: d?.distribution_number || '', date: d?.distribution_date || '', amount: i.distribution_amount }
        }))
      })
  }, [id, loadAccounts])

  const handleOpenAccount = async () => {
    if (!id) return
    setOpening(true)
    const { error } = await supabase.from('savings_accounts').insert({
      samiti_id: member?.samiti_id,
      member_id: id,
      account_type: 'general',
      account_number: `SAV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
    } as never)
    setOpening(false)
    if (!error) loadAccounts()
  }

  if (membersLoading) return <Spinner size="lg" />
  if (!member) return <div className="text-center py-12 text-gray-500">Member not found</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/members')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Members
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant={member.status === 'active' ? 'success' : member.status === 'inactive' ? 'warning' : 'danger'}>
            {member.status}
          </Badge>
          {role !== 'member' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => { await toggleMemberStatus(member.id, member.status); fetchMembers() }}
              title={member.status === 'active' ? 'Deactivate' : 'Activate'}
            >
              {member.status === 'active'
                ? <><ToggleRight className="h-4 w-4 text-green-600 mr-1" /> Deactivate</>
                : <><ToggleLeft className="h-4 w-4 text-gray-400 mr-1" /> Activate</>
              }
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <MemberProfile member={member} />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card title={
            <div className="flex items-center justify-between w-full">
              <span>Savings Accounts</span>
              <Button size="sm" onClick={handleOpenAccount} loading={opening}>
                <Plus className="h-4 w-4 mr-1" /> Open Account
              </Button>
            </div>
          }>
            {loadingAccounts ? (
              <Spinner size="sm" />
            ) : savingsAccounts.length === 0 ? (
              <p className="text-sm text-gray-500">No savings accounts yet.</p>
            ) : (
              <div className="space-y-3">
                {savingsAccounts.map((acct) => (
                  <div key={acct.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{acct.account_number}</span>
                      <Badge variant="default">{acct.account_type}</Badge>
                    </div>
                    <p className="text-lg font-bold">{formatCurrency(acct.balance)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Loans">
            {loans.length === 0 ? (
              <p className="text-sm text-gray-500">No loans found.</p>
            ) : (
              <div className="space-y-2">
                {loans.map((ln) => (
                  <div key={ln.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100" onClick={() => navigate(`/loans/${ln.id}`)}>
                    <div>
                      <p className="font-medium text-sm">{ln.loan_number}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(ln.amount)}</p>
                    </div>
                    <Badge variant={ln.status === 'disbursed' ? 'success' : ln.status === 'pending' ? 'warning' : ln.status === 'closed' ? 'default' : 'danger'}>{ln.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Profit Distributions">
            {profitDistros.length === 0 ? (
              <p className="text-sm text-gray-500">No profit distributions received.</p>
            ) : (
              <div className="space-y-2">
                {profitDistros.map((pd, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-purple-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{pd.distro_num}</p>
                        <p className="text-xs text-gray-500">{formatDate(pd.date)}</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-green-700">{formatCurrency(pd.amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {activeModal === 'exit-member' && modalData && (
        <Modal title="Process Member Exit">
          <MemberExitForm memberId={modalData.memberId} memberName={modalData.memberName} />
        </Modal>
      )}
    </div>
  )
}
