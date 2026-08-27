import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSavings } from '../hooks/useSavings'
import type { SavingsAccountWithMember } from '../hooks/useSavings'
import { useAuth } from '../hooks/useAuth'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { RefreshButton } from '../components/ui/RefreshButton'
import { DepositForm } from '../components/savings/DepositForm'
import { WithdrawForm } from '../components/savings/WithdrawForm'
import { useUIStore } from '../store/uiStore'
import { ReportExportButtons } from '../components/reports/ReportExportButtons'
import { formatCurrency } from '../lib/utils'
import { useTranslation } from 'react-i18next'
import { Search, Wallet, ArrowUpFromLine, ArrowDownToLine } from 'lucide-react'

export default function SavingsPage() {
  const { accounts, loading, fetchAccountsWithMembers } = useSavings()
  const { role } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const activeModal = useUIStore((s) => s.activeModal)
  const openModal = useUIStore((s) => s.openModal)
  const canTransact = role !== 'member'
  const [accountsWithMembers, setAccountsWithMembers] = useState<SavingsAccountWithMember[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [search, setSearch] = useState('')

  const loadData = async () => {
    setLoadingData(true)
    const data = await fetchAccountsWithMembers()
    setAccountsWithMembers(data)
    setLoadingData(false)
  }

  useEffect(() => { loadData() }, [fetchAccountsWithMembers])

  const filtered = accountsWithMembers.filter((a) =>
    !search ||
    a.account_number.toLowerCase().includes(search.toLowerCase()) ||
    (a.member_name && a.member_name.toLowerCase().includes(search.toLowerCase())) ||
    (a.member_number && a.member_number.toLowerCase().includes(search.toLowerCase()))
  )

  if (loading) return <Spinner size="lg" />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('savings.title')}</h1>
        <div className="flex items-center gap-2">
          {filtered.length > 0 && (
            <ReportExportButtons
              filename={`savings-accounts-${new Date().toISOString().split('T')[0]}`}
              title={t('savings.title')}
              headers={[t('savings.accountNo'), t('membership.fullName'), t('membership.memberCode'), t('common.type'), t('common.status'), t('common.balance')]}
              rows={filtered.map((a) => [
                a.account_number,
                a.member_name || '-',
                a.member_number || '',
                a.account_type,
                a.status,
                a.balance || 0,
              ])}
              totals={[{ label: t('common.total'), value: formatCurrency(filtered.reduce((s, a) => s + (a.balance || 0), 0)) }]}
            />
          )}
          <RefreshButton onRefresh={loadData} />
          {canTransact && (
            <Button variant="secondary" onClick={() => openModal('deposit')}>
              <ArrowDownToLine className="h-4 w-4 mr-1" /> {t('savings.deposit')}
            </Button>
          )}
          {canTransact && (
            <Button variant="danger" onClick={() => openModal('withdraw')}>
              <ArrowUpFromLine className="h-4 w-4 mr-1" /> {t('savings.withdraw')}
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 max-w-md">
        <Search className="h-5 w-5 text-gray-400" />
        <Input
          placeholder={t('savings.searchTransactions')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loadingData ? (
        <Spinner size="sm" />
      ) : filtered.length === 0 ? (
        <EmptyState title={t('savings.noTransactions')} description={search ? t('common.emptySearch') : t('common.emptyStart')} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((acct) => (
            <div
              key={acct.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md cursor-pointer transition-shadow"
              onClick={() => navigate(`/savings/${acct.id}`)}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                  <Wallet className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{acct.account_number}</p>
                  <p className="text-xs text-gray-500">{acct.member_name || '-'}</p>
                </div>
                {acct.member_number && (
                  <span className="text-xs text-gray-400 font-mono">{acct.member_number}</span>
                )}
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <p className="text-lg font-bold text-gray-900">{formatCurrency(acct.balance || 0)}</p>
                <span className="text-xs text-gray-400 capitalize bg-gray-100 px-2 py-0.5 rounded">{acct.account_type}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeModal === 'deposit' && (
        <Modal title={t('savings.depositTitle')} size="lg">
          <DepositForm accounts={accounts} onSuccess={loadData} />
        </Modal>
      )}
      {activeModal === 'withdraw' && (
        <Modal title={t('savings.withdrawTitle')} size="lg">
          <WithdrawForm accounts={accounts} onSuccess={loadData} />
        </Modal>
      )}
    </div>
  )
}
