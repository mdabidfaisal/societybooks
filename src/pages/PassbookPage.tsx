import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { Badge } from '../components/ui/Badge'
import { ReportExportButtons } from '../components/reports/ReportExportButtons'
import { formatCurrency, formatDate } from '../lib/utils'
import { useTranslation } from 'react-i18next'
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Gift, LogOut } from 'lucide-react'

interface TxRow {
  id: string
  date: string
  type: string
  amount: number
  balance: number
  method: string | null
  reference: string | null
  account_number: string
}

export default function PassbookPage() {
  const { role, memberId, samitiId } = useAuth()
  const { t } = useTranslation()
  const [txns, setTxns] = useState<TxRow[]>([])
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState(0)
  const [accountCount, setAccountCount] = useState(0)

  useEffect(() => {
    if (!samitiId) return

    const load = async () => {
      setLoading(true)
      let memberFilter: string | undefined

      if (role === 'member' && memberId) {
        memberFilter = memberId
      }

      const { data: accounts } = await supabase
        .from('savings_accounts')
        .select('id, account_number')
        .eq('samiti_id', samitiId)
        .order('created_at', { ascending: false })

      if (!accounts || accounts.length === 0) {
        setLoading(false)
        return
      }

      setAccountCount(accounts.length)

      // If member, filter accounts by member
      let filteredAccounts = accounts as { id: string; account_number: string }[]
      if (memberFilter) {
        const { data: memberAccts } = await supabase
          .from('savings_accounts')
          .select('id, account_number')
          .eq('member_id', memberFilter)
          .eq('status', 'active')
        if (memberAccts && memberAccts.length > 0) {
          filteredAccounts = memberAccts as { id: string; account_number: string }[]
        } else {
          setTxns([])
          setLoading(false)
          return
        }
      }

      const acctIds = filteredAccounts.map((a) => a.id)
      const acctNumMap = new Map(filteredAccounts.map((a) => [a.id, a.account_number]))

      // Current balance = sum of the latest balance_after per account
      const { data: balanceData } = await supabase
        .from('savings_transactions')
        .select('balance_after, savings_account_id')
        .in('savings_account_id', acctIds)
        .order('created_at', { ascending: false })
      if (balanceData && balanceData.length > 0) {
        const latestByAccount = new Map<string, number>()
        for (const t of balanceData as { savings_account_id: string; balance_after: number }[]) {
          if (!latestByAccount.has(t.savings_account_id)) {
            latestByAccount.set(t.savings_account_id, Number(t.balance_after))
          }
        }
        setBalance(Array.from(latestByAccount.values()).reduce((s, b) => s + b, 0))
      }

      const { data: allTx } = await supabase
        .from('savings_transactions')
        .select('id, created_at, transaction_type, amount, balance_after, payment_method, reference, savings_account_id')
        .in('savings_account_id', acctIds)
        .order('created_at', { ascending: false })
        .limit(100)

      if (allTx) {
        const rows: TxRow[] = allTx.map((t) => {
          const tx = t as {
            id: string; created_at: string; transaction_type: string
            amount: number; balance_after: number; payment_method: string | null
            reference: string | null; savings_account_id: string
          }
          return {
            id: tx.id,
            date: tx.created_at,
            type: tx.transaction_type,
            amount: Number(tx.amount),
            balance: Number(tx.balance_after),
            method: tx.payment_method,
            reference: tx.reference,
            account_number: acctNumMap.get(tx.savings_account_id) || '',
          }
        })
        setTxns(rows)
      }

      setLoading(false)
    }

    load()
  }, [role, memberId, samitiId])

  const typeIcon: Record<string, React.ReactNode> = {
    deposit: <ArrowDownToLine className="h-4 w-4 text-green-500" />,
    withdrawal: <ArrowUpFromLine className="h-4 w-4 text-red-500" />,
    profit: <Gift className="h-4 w-4 text-purple-500" />,
    exit_settlement: <LogOut className="h-4 w-4 text-orange-500" />,
  }

  const typeBadge: Record<string, 'success' | 'danger' | 'warning' | 'info'> = {
    deposit: 'success',
    withdrawal: 'danger',
    profit: 'info',
    exit_settlement: 'warning',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('passbook.title')}</h1>
        <div className="flex items-center gap-3">
          {txns.length > 0 && (
            <ReportExportButtons
              filename={`passbook-${new Date().toISOString().split('T')[0]}`}
              title={t('passbook.title')}
              subtitle={role === 'member' ? t('passbook.passbookDesc') : t('reports.allMembers')}
              headers={[t('common.date'), t('savings.accountNo'), t('common.type'), t('common.amount'), t('common.balance'), t('savings.paymentMethod'), t('savings.reference')]}
              rows={txns.map((tx) => [
                formatDate(tx.date),
                tx.account_number,
                tx.type,
                tx.amount,
                tx.balance,
                tx.method || '-',
                tx.reference || '-',
              ])}
              totals={[{ label: t('passbook.closingBalance'), value: formatCurrency(balance) }]}
            />
          )}
          <div className="text-right">
            <p className="text-xs text-gray-500">{t('passbook.closingBalance')}</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(balance)}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <Spinner size="lg" />
      ) : txns.length === 0 ? (
        <EmptyState title={t('passbook.noTransactions')} description={t('common.emptyStart')} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card title={t('savings.accountNo')} className="border-l-4 border-l-blue-500">
              <p className="text-2xl font-bold text-gray-900">{accountCount}</p>
            </Card>
            <Card title={t('passbook.totalDeposits')} className="border-l-4 border-l-green-500">
              <p className="text-2xl font-bold text-gray-900">{txns.length}</p>
            </Card>
            <Card title={t('passbook.closingBalance')} className="border-l-4 border-l-purple-500">
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(balance)}</p>
            </Card>
          </div>

          <Card title={t('savings.transactions')}>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                    <th className="py-2 px-3">{t('common.date')}</th>
                    <th className="py-2 px-3">{t('savings.accountNo')}</th>
                    <th className="py-2 px-3">{t('common.type')}</th>
                    <th className="py-2 px-3 text-right">{t('common.amount')}</th>
                    <th className="py-2 px-3 text-right">{t('common.balance')}</th>
                    <th className="py-2 px-3">{t('savings.paymentMethod')}</th>
                    <th className="py-2 px-3">{t('savings.reference')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {txns.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-500 text-xs">{formatDate(tx.date)}</td>
                      <td className="py-2 px-3 text-xs font-mono text-gray-400">{tx.account_number}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          {typeIcon[tx.type] || null}
                          <Badge variant={typeBadge[tx.type] || 'default'}>{t(`txnType.${tx.type}`)}</Badge>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right font-medium">{formatCurrency(tx.amount)}</td>
                      <td className="py-2 px-3 text-right text-gray-700">{formatCurrency(tx.balance)}</td>
                      <td className="py-2 px-3 text-gray-500 text-xs capitalize">{tx.method ? t(`savings.${tx.method}`) : '-'}</td>
                      <td className="py-2 px-3 text-gray-400 text-xs">{tx.reference || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
