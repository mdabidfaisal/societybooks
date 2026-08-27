import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useUIStore } from '../store/uiStore'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Spinner } from '../components/ui/Spinner'
import { RefreshButton } from '../components/ui/RefreshButton'
import { TransactionList } from '../components/savings/TransactionList'
import { DepositForm } from '../components/savings/DepositForm'
import { WithdrawForm } from '../components/savings/WithdrawForm'
import { ReportExportButtons } from '../components/reports/ReportExportButtons'
import { formatCurrency, formatDate } from '../lib/utils'
import { useTranslation } from 'react-i18next'
import { useSavings, type SavingsAccountData, type SavingsTransactionData } from '../hooks/useSavings'
import { ArrowLeft, Wallet, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'

export default function SavingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const activeModal = useUIStore((s) => s.activeModal)
  const openModal = useUIStore((s) => s.openModal)
  const { accounts, getTransactions } = useSavings()
  const { role } = useAuth()
  const canTransact = role !== 'member'
  const [account, setAccount] = useState<(SavingsAccountData & { member_name?: string; member_number?: string }) | null>(null)
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<SavingsTransactionData[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!id) return
    setLoading(true)

    const { data: acct } = await supabase
      .from('savings_accounts')
      .select(`
        *,
        members(name, member_number)
      `)
      .eq('id', id)
      .single()

    if (acct) {
      const d = acct as unknown as { members: { name: string; member_number: string } }
      setAccount({
        ...(acct as SavingsAccountData),
        member_name: d.members?.name,
        member_number: d.members?.member_number,
      })
    }

    const { data: tx } = await getTransactions(id)
    if (tx) {
      setTransactions(tx)
      if (tx.length > 0) {
        setBalance(tx[0].balance_after)
      }
    }

    setLoading(false)
  }, [id, getTransactions])

  useEffect(() => { loadData() }, [loadData])

  if (loading) return <Spinner size="lg" />
  if (!account) return <div className="text-center py-12 text-gray-500">{t('savings.accountNotFound')}</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/savings')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{account.account_number}</h1>
            {account.member_name && (
              <p className="text-sm text-gray-500">
                {account.member_name}
                {account.member_number && <span className="ml-2 font-mono text-xs">({account.member_number})</span>}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ReportExportButtons
            filename={`savings-ledger-${account.account_number}`}
            title={t('savings.savingsLedger')}
            subtitle={`${t('savings.accountNo')}: ${account.account_number} · ${t('membership.fullName')}: ${account.member_name || '-'}${account.member_number ? ` (${account.member_number})` : ''} · ${t('common.type')}: ${account.account_type} · ${t('common.status')}: ${account.status}`}
            headers={[t('common.date'), t('common.type'), t('common.amount'), t('common.balance'), t('savings.reference'), t('common.notes')]}
            rows={transactions.map((tx) => [
              formatDate(tx.created_at),
              tx.transaction_type,
              tx.amount,
              tx.balance_after,
              tx.reference || '-',
              tx.reason_note || '-',
            ])}
            totals={[{ label: t('savings.balance'), value: formatCurrency(balance) }]}
          />
          {canTransact && (
            <Button variant="secondary" size="sm" onClick={() => openModal('deposit')}>
              <ArrowDownToLine className="h-4 w-4 mr-1" /> {t('savings.deposit')}
            </Button>
          )}
          {canTransact && (
            <Button variant="danger" size="sm" onClick={() => openModal('withdraw')}>
              <ArrowUpFromLine className="h-4 w-4 mr-1" /> {t('savings.withdraw')}
            </Button>
          )}
          <RefreshButton onRefresh={loadData} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title={t('savings.balance')} className="border-l-4 border-l-blue-500">
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(balance)}</p>
        </Card>
        <Card title={t('common.type')} className="border-l-4 border-l-green-500">
          <p className="text-lg font-medium text-gray-900 capitalize">{account.account_type}</p>
        </Card>
        <Card title={t('common.status')} className="border-l-4 border-l-yellow-500">
          <Badge variant={account.status === 'active' ? 'success' : 'danger'}>{t(`status.${account.status}`)}</Badge>
        </Card>
        <Card title={t('savings.opened')} className="border-l-4 border-l-purple-500">
          <p className="text-lg font-medium text-gray-900">{formatDate(account.opened_date)}</p>
        </Card>
      </div>

      <Card
        title={
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-gray-400" />
            <span>{t('savings.savingsLedger')}</span>
            <span className="text-xs text-gray-400 font-normal">({transactions.length})</span>
          </div>
        }
      >
        <TransactionList accountId={id!} />
      </Card>

      {activeModal === 'deposit' && (
        <Modal title={`${t('savings.deposit')} - ${account.account_number}`} size="lg">
          <DepositForm accounts={[account]} onSuccess={loadData} />
        </Modal>
      )}
      {activeModal === 'withdraw' && (
        <Modal title={`${t('savings.withdraw')} - ${account.account_number}`} size="lg">
          <WithdrawForm accounts={[account]} onSuccess={loadData} />
        </Modal>
      )}
    </div>
  )
}
