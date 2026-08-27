import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { RefreshButton } from '../components/ui/RefreshButton'
import { JournalEntryList } from '../components/accounting/JournalEntryList'
import { JournalEntryForm } from '../components/accounting/JournalEntryForm'
import { JournalDetail } from '../components/accounting/JournalDetail'
import { useUIStore } from '../store/uiStore'
import { useAccounting, type JournalEntryData, type ChartOfAccountData } from '../hooks/useAccounting'
import { ReportExportButtons } from '../components/reports/ReportExportButtons'
import { formatCurrency, formatDate } from '../lib/utils'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'

export default function JournalPage() {
  const { samitiId } = useAuth()
  const { t } = useTranslation()
  const { accounts, fetchAccounts } = useAccounting()
  const [entries, setEntries] = useState<JournalEntryData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const activeModal = useUIStore((s) => s.activeModal)
  const openModal = useUIStore((s) => s.openModal)

  const fetchEntries = useCallback(async () => {
    if (!samitiId) return
    setLoading(true)
    const { data } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('samiti_id', samitiId)
      .order('created_at', { ascending: false })
      .limit(200)
    if (data) setEntries(data as JournalEntryData[])
    setLoading(false)
  }, [samitiId])

  useEffect(() => {
    fetchEntries()
    fetchAccounts()
  }, [fetchEntries, fetchAccounts])

  if (loading) return <Spinner size="lg" />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('accounting.journalEntries')}</h1>
        <div className="flex items-center gap-2">
          {entries.length > 0 && (
            <ReportExportButtons
              filename={`journal-entries-${new Date().toISOString().split('T')[0]}`}
              title={t('accounting.journalEntries')}
              headers={[t('accounting.entryNo'), t('common.date'), t('accounting.description'), t('common.type'), t('accounting.debit'), t('accounting.credit')]}
              rows={entries.map((e) => [
                e.entry_number,
                formatDate(e.entry_date),
                e.description,
                e.entry_type.replace(/_/g, ' '),
                e.total_debit,
                e.total_credit,
              ])}
              totals={[
                { label: t('accounting.totalDebit'), value: formatCurrency(entries.reduce((s, e) => s + e.total_debit, 0)) },
                { label: t('accounting.totalCredit'), value: formatCurrency(entries.reduce((s, e) => s + e.total_credit, 0)) },
              ]}
            />
          )}
          <RefreshButton onRefresh={fetchEntries} />
          <Button onClick={() => openModal('journal-entry')}>
            <Plus className="h-4 w-4 mr-1" /> {t('accounting.newEntry')}
          </Button>
        </div>
      </div>

      {entries.length === 0 ? (
        <EmptyState title={t('accounting.journalEntries')} description={t('common.emptyStart')} />
      ) : (
        <Card>
          <JournalEntryList
            entries={entries}
            onSelect={(entry) => setSelectedEntryId(entry.id)}
          />
        </Card>
      )}

      {activeModal === 'journal-entry' && (
        <Modal title={t('accounting.journalEntry')} size="xl">
          <JournalEntryForm accounts={accounts as ChartOfAccountData[]} onSuccess={fetchEntries} />
        </Modal>
      )}

      {selectedEntryId && (
        <Modal title={t('accounting.journalEntry')} size="xl" onClose={() => setSelectedEntryId(null)}>
          <JournalDetail entryId={selectedEntryId} />
        </Modal>
      )}
    </div>
  )
}
