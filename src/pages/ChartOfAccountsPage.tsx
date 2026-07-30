import { useEffect, useState } from 'react'
import { useAccounting } from '../hooks/useAccounting'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { RefreshButton } from '../components/ui/RefreshButton'
import { ChartOfAccountsList } from '../components/accounting/ChartOfAccountsList'
import { AccountForm } from '../components/accounting/AccountForm'
import { useUIStore } from '../store/uiStore'

export default function ChartOfAccountsPage() {
  const { accounts, loading, fetchAccounts } = useAccounting()
  const activeModal = useUIStore((s) => s.activeModal)
  const openModal = useUIStore((s) => s.openModal)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => { fetchAccounts() }, [fetchAccounts, refreshKey])

  if (loading) return <Spinner size="lg" />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Chart of Accounts</h1>
        <div className="flex items-center gap-2">
          <RefreshButton onRefresh={() => setRefreshKey((k) => k + 1)} />
          <Button onClick={() => openModal('add-account')}>New Account</Button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <EmptyState title="No accounts" description="Create your first chart of account entry." />
      ) : (
        <Card>
          <ChartOfAccountsList accounts={accounts} />
        </Card>
      )}

      {activeModal === 'add-account' && (
        <Modal title="Create Account">
          <AccountForm />
        </Modal>
      )}
    </div>
  )
}
