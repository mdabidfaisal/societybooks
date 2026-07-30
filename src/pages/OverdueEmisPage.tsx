import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { RefreshButton } from '../components/ui/RefreshButton'
import { formatCurrency, formatDate } from '../lib/utils'
import { AlertTriangle, Search } from 'lucide-react'

export default function OverdueEmisPage() {
  const { samitiId } = useAuth()
  const today = new Date().toISOString().split('T')[0]
  const [asOfDate, setAsOfDate] = useState(today)
  const [emis, setEmis] = useState<{
    id: string; installment_no: number; due_date: string
    total_amount: number; paid_amount: number; daysOverdue: number
    loan_number: string; member_name: string; member_number: string
    status: string
  }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadOverdue = useCallback(async () => {
    if (!samitiId) return
    setLoading(true)

    const { data: allEmis } = await supabase
      .from('loan_emi_schedule')
      .select(`
        id, installment_no, due_date, total_amount, paid_amount, status,
        loan_id,
        loans!inner(
          loan_number, member_id,
          members!inner(name, member_number)
        )
      `)
      .eq('loans.samiti_id', samitiId)
      .lt('due_date', asOfDate)
      .in('status', ['pending', 'partial'])

    if (!allEmis) { setLoading(false); return }

    const overdue = allEmis
      .map((e: any) => {
        const loan = Array.isArray(e.loans) ? e.loans[0] : e.loans
        const member = Array.isArray(loan?.members) ? loan.members[0] : loan?.members
        const dueDate = new Date(e.due_date + 'T00:00:00')
        const asOf = new Date(asOfDate + 'T00:00:00')
        const days = Math.floor((asOf.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        return {
          id: e.id,
          installment_no: e.installment_no,
          due_date: e.due_date,
          total_amount: Number(e.total_amount),
          paid_amount: Number(e.paid_amount || 0),
          daysOverdue: Math.max(0, days),
          loan_number: loan?.loan_number || '',
          member_name: member?.name || '',
          member_number: member?.member_number || '',
          status: e.status,
        }
      })
      .filter((e) => e.daysOverdue >= 0)
      .sort((a, b) => b.daysOverdue - a.daysOverdue)

    setEmis(overdue)
    setLoading(false)
  }, [samitiId, asOfDate])

  useEffect(() => { loadOverdue() }, [loadOverdue])

  const totalOverdue = emis.reduce((s, e) => s + (e.total_amount - e.paid_amount), 0)
  const filtered = search
    ? emis.filter((e) =>
        e.member_name.toLowerCase().includes(search.toLowerCase()) ||
        e.loan_number.toLowerCase().includes(search.toLowerCase()) ||
        String(e.installment_no).includes(search)
      )
    : emis

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Overdue EMIs</h1>
        <RefreshButton onRefresh={loadOverdue} />
      </div>

      <Card>
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">As of Date</label>
            <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
          </div>
          <Button onClick={loadOverdue} variant="secondary">Load</Button>
          <div className="relative ml-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search member or loan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-64"
            />
          </div>
        </div>
      </Card>

      {loading ? (
        <Spinner size="lg" />
      ) : (
        <>
          <Card>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm text-gray-500">Total Overdue Amount</p>
                <p className="text-3xl font-bold text-red-600">{formatCurrency(totalOverdue)}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-sm text-gray-500">Overdue Installments</p>
                <p className="text-3xl font-bold text-gray-900">{emis.length}</p>
              </div>
            </div>
          </Card>

          {filtered.length === 0 ? (
            <EmptyState title="No overdue EMIs" description="All installments are up to date!" />
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                      <th className="py-3 px-3">Member</th>
                      <th className="py-3 px-3">Loan #</th>
                      <th className="py-3 px-3 text-right">Inst.</th>
                      <th className="py-3 px-3">Due Date</th>
                      <th className="py-3 px-3 text-right">Amount</th>
                      <th className="py-3 px-3 text-right">Paid</th>
                      <th className="py-3 px-3 text-right">Remaining</th>
                      <th className="py-3 px-3 text-right">Days Overdue</th>
                      <th className="py-3 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((e) => {
                      const remaining = e.total_amount - e.paid_amount
                      return (
                        <tr key={e.id} className="hover:bg-gray-50">
                          <td className="py-3 px-3">
                            <span className="font-medium text-gray-900">{e.member_name}</span>
                            <span className="text-gray-400 text-xs ml-1">[{e.member_number}]</span>
                          </td>
                          <td className="py-3 px-3 font-mono text-xs text-gray-600">{e.loan_number}</td>
                          <td className="py-3 px-3 text-right">{e.installment_no}</td>
                          <td className="py-3 px-3 text-gray-600">{formatDate(e.due_date)}</td>
                          <td className="py-3 px-3 text-right font-medium">{formatCurrency(e.total_amount)}</td>
                          <td className="py-3 px-3 text-right text-green-600">{e.paid_amount > 0 ? formatCurrency(e.paid_amount) : '-'}</td>
                          <td className="py-3 px-3 text-right font-bold text-red-600">{formatCurrency(remaining)}</td>
                          <td className="py-3 px-3 text-right">
                            <span className={`font-bold ${e.daysOverdue >= 30 ? 'text-red-600' : e.daysOverdue >= 7 ? 'text-orange-500' : 'text-yellow-600'}`}>
                              {e.daysOverdue}d
                            </span>
                          </td>
                          <td className="py-3 px-3"><Badge variant={e.status === 'partial' ? 'warning' : 'danger'}>{e.status}</Badge></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
