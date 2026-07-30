import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Select } from '../components/ui/Select'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { RefreshButton } from '../components/ui/RefreshButton'
import { formatCurrency, formatDate } from '../lib/utils'
import { Wallet, HandshakeIcon, Gift, ChevronDown, ChevronUp } from 'lucide-react'

interface MemberOption { value: string; label: string }

export default function MemberLedgerPage() {
  const { samitiId } = useAuth()
  const [members, setMembers] = useState<MemberOption[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [loading, setLoading] = useState(false)
  const [savingsTx, setSavingsTx] = useState<{ id: string; type: string; amount: number; balance: number; date: string; reference: string | null; method: string | null }[]>([])
  const [loans, setLoans] = useState<{ id: string; loan_number: string; amount: number; status: string; disbursed_at: string | null }[]>([])
  const [distros, setDistros] = useState<{ distro_num: string; date: string; amount: number }[]>([])
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null)

  useEffect(() => {
    if (!samitiId) return
    supabase.from('members').select('id, name, member_number').eq('samiti_id', samitiId).eq('status', 'active').order('name').then(({ data }) => {
      if (data) setMembers(data.map((m) => ({ value: m.id, label: `${m.name} [${m.member_number}]` })))
    })
  }, [samitiId])

  const loadLedger = useCallback(async () => {
    if (!selectedMemberId || !samitiId) return
    setLoading(true)

    // Savings transactions
    const { data: accounts } = await supabase.from('savings_accounts').select('id').eq('member_id', selectedMemberId)
    let allTx: { id: string; type: string; amount: number; balance: number; date: string; reference: string | null; method: string | null }[] = []
    if (accounts && accounts.length > 0) {
      const acctIds = accounts.map((a: { id: string }) => a.id)
      const { data: txns } = await supabase
        .from('savings_transactions')
        .select('id, transaction_type, amount, balance_after, created_at, reference, payment_method')
        .in('savings_account_id', acctIds)
        .order('created_at', { ascending: false })
      if (txns) {
        allTx = txns.map((t) => {
          const tx = t as { id: string; transaction_type: string; amount: number; balance_after: number; created_at: string; reference: string | null; payment_method: string | null }
          return { id: tx.id, type: tx.transaction_type, amount: Number(tx.amount), balance: Number(tx.balance_after), date: tx.created_at, reference: tx.reference, method: tx.payment_method }
        })
      }
    }
    setSavingsTx(allTx)

    // Loans
    const { data: loanData } = await supabase
      .from('loans')
      .select('id, loan_number, amount, status, disbursed_at')
      .eq('member_id', selectedMemberId)
      .order('created_at', { ascending: false })
    if (loanData) setLoans(loanData as { id: string; loan_number: string; amount: number; status: string; disbursed_at: string | null }[])

    // Profit distributions
    const { data: items } = await supabase
      .from('profit_distribution_items')
      .select('distribution_amount, profit_distribution_id')
      .eq('member_id', selectedMemberId)
    if (items && items.length > 0) {
      const distroIds = items.map((i: { profit_distribution_id: string }) => i.profit_distribution_id)
      const { data: distroData } = await supabase
        .from('profit_distributions')
        .select('id, distribution_number, distribution_date')
        .in('id', distroIds)
      const distroMap = new Map((distroData || []).map((d: { id: string; distribution_number: string; distribution_date: string }) => [d.id, d]))
      setDistros(items.map((i: { profit_distribution_id: string; distribution_amount: number }) => {
        const d = distroMap.get(i.profit_distribution_id)
        return { distro_num: d?.distribution_number || '', date: d?.distribution_date || '', amount: i.distribution_amount }
      }))
    } else {
      setDistros([])
    }

    setLoading(false)
  }, [selectedMemberId, samitiId])

  useEffect(() => {
    if (selectedMemberId) loadLedger()
  }, [selectedMemberId, loadLedger])

  const totalSavings = savingsTx.length > 0 ? savingsTx[0]?.balance || 0 : 0
  const totalDistributed = distros.reduce((s, d) => s + d.amount, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Member Ledger</h1>
        <RefreshButton onRefresh={loadLedger} />
      </div>

      <Card>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Select Member</label>
            <Select
              value={selectedMemberId}
              onChange={(e) => { setSelectedMemberId(e.target.value); setExpandedLoan(null) }}
              options={[{ value: '', label: 'Choose a member...' }, ...members]}
            />
          </div>
        </div>
      </Card>

      {!selectedMemberId ? (
        <EmptyState title="Select a member" description="Choose a member above to view their full ledger." />
      ) : loading ? (
        <Spinner size="lg" />
      ) : (
        <div className="space-y-4">
          {/* Quick stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase">Current Savings</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">{formatCurrency(totalSavings)}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase">Active Loans</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{loans.filter((l) => l.status === 'disbursed').length}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase">Profit Received</p>
              <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(totalDistributed)}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{savingsTx.length}</p>
            </div>
          </div>

          {/* Savings Transactions */}
          <Card title="Savings Transaction History">
            {savingsTx.length === 0 ? (
              <p className="text-sm text-gray-500">No savings transactions.</p>
            ) : (
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                      <th className="py-2 px-3 text-right">Balance</th>
                      <th className="py-2 px-3">Method</th>
                      <th className="py-2 px-3">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {savingsTx.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="py-2 px-3 text-gray-500 text-xs">{formatDate(tx.date)}</td>
                        <td className="py-2 px-3">
                          <Badge variant={tx.type === 'deposit' ? 'success' : tx.type === 'withdrawal' ? 'danger' : 'warning'}>
                            {tx.type}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-right font-medium">{formatCurrency(tx.amount)}</td>
                        <td className="py-2 px-3 text-right text-gray-700">{formatCurrency(tx.balance)}</td>
                        <td className="py-2 px-3 text-gray-500 text-xs capitalize">{tx.method || '-'}</td>
                        <td className="py-2 px-3 text-gray-400 text-xs">{tx.reference || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Loans */}
          <Card title="Loans">
            {loans.length === 0 ? (
              <p className="text-sm text-gray-500">No loans.</p>
            ) : (
              <div className="space-y-2">
                {loans.map((ln) => (
                  <div key={ln.id} className="border rounded-lg">
                    <div
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                      onClick={() => setExpandedLoan(expandedLoan === ln.id ? null : ln.id)}
                    >
                      <div className="flex items-center gap-3">
                        <HandshakeIcon className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-sm">{ln.loan_number}</p>
                          <p className="text-xs text-gray-500">{formatCurrency(ln.amount)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={ln.status === 'disbursed' ? 'success' : ln.status === 'pending' ? 'warning' : ln.status === 'closed' ? 'default' : 'danger'}>
                          {ln.status}
                        </Badge>
                        {expandedLoan === ln.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>
                    {expandedLoan === ln.id && (
                      <div className="px-3 pb-3 border-t pt-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-gray-500">Disbursed:</span> <span>{ln.disbursed_at ? formatDate(ln.disbursed_at) : 'Not yet'}</span></div>
                          <div><span className="text-gray-500">Status:</span> <span className="capitalize">{ln.status}</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Profit Distributions */}
          <Card title="Profit Distributions">
            {distros.length === 0 ? (
              <p className="text-sm text-gray-500">No profit distributions received.</p>
            ) : (
              <div className="space-y-2">
                {distros.map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-purple-500" />
                      <div>
                        <p className="text-sm font-medium">{d.distro_num}</p>
                        <p className="text-xs text-gray-500">{formatDate(d.date)}</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-green-700">{formatCurrency(d.amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
