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
import { ReportExportButtons } from '../components/reports/ReportExportButtons'
import { useUIStore } from '../store/uiStore'
import { useTranslation } from 'react-i18next'

export default function ChartOfAccountsPage() {
  const { accounts, loading, fetchAccounts } = useAccounting()
  const activeModal = useUIStore((s) => s.activeModal)
  const openModal = useUIStore((s) => s.openModal)
  const { t } = useTranslation()
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => { fetchAccounts() }, [fetchAccounts, refreshKey])

  if (loading) return <Spinner size="lg" />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('accounting.chartOfAccounts')}</h1>
        <div className="flex items-center gap-2">
          {accounts.length > 0 && (
            <ReportExportButtons
              filename={`chart-of-accounts-${new Date().toISOString().split('T')[0]}`}
              title={t('accounting.chartOfAccounts')}
              headers={[t('accounting.accountCode'), t('accounting.accountName'), t('accounting.accountType'), t('common.type')]}
              rows={accounts.map((a) => [
                a.account_code,
                a.account_name,
                a.account_type,
                a.is_system ? t('common.enabled') : t('common.disabled'),
              ])}
            />
          )}
          <RefreshButton onRefresh={() => setRefreshKey((k) => k + 1)} />
          <Button onClick={() => openModal('add-account')}>{t('accounting.addAccount')}</Button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <EmptyState title={t('accounting.accounts')} description={t('common.emptyStart')} />
      ) : (
        <Card>
          <ChartOfAccountsList accounts={accounts} />
        </Card>
      )}

      {activeModal === 'add-account' && (
        <Modal title={t('accounting.addAccount')}>
          <AccountForm />
        </Modal>
      )}
    </div>
  )
}
