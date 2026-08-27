import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Badge } from '../ui/Badge'
import { Spinner } from '../ui/Spinner'
import { JournalDetail } from '../accounting/JournalDetail'
import { formatCurrency, formatDate } from '../../lib/utils'
import { useTranslation } from 'react-i18next'
import type { SavingsTransactionData } from '../../hooks/useSavings'

const txVariant: Record<string, 'success' | 'danger' | 'info' | 'warning'> = {
  deposit: 'success',
  withdrawal: 'danger',
  profit: 'info',
  correction: 'warning',
  exit_settlement: 'danger',
}

interface TransactionDetailProps {
  tx: SavingsTransactionData
}

export function TransactionDetail({ tx }: TransactionDetailProps) {
  const [journalEntryIds, setJournalEntryIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation()

  useEffect(() => {
    supabase
      .from('journal_entries')
      .select('id')
      .eq('reference_table', 'savings_transactions')
      .eq('reference_id', tx.id)
      .then(({ data }) => {
        if (data) setJournalEntryIds(data.map((e: { id: string }) => e.id))
        setLoading(false)
      })
  }, [tx.id])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div>
          <span className="block text-xs text-gray-500 uppercase">{t('common.date')}</span>
          <span className="font-medium">{formatDate(tx.created_at)}</span>
        </div>
        <div>
          <span className="block text-xs text-gray-500 uppercase">{t('common.type')}</span>
          <Badge variant={txVariant[tx.transaction_type] || 'default'}>{t(`txnType.${tx.transaction_type}`, { defaultValue: tx.transaction_type })}</Badge>
        </div>
        <div>
          <span className="block text-xs text-gray-500 uppercase">{t('common.amount')}</span>
          <span className={`font-medium ${tx.transaction_type === 'deposit' || tx.transaction_type === 'profit' ? 'text-green-600' : 'text-red-600'}`}>
            {tx.transaction_type === 'deposit' || tx.transaction_type === 'profit' ? '+' : '-'}{formatCurrency(tx.amount)}
          </span>
        </div>
        <div>
          <span className="block text-xs text-gray-500 uppercase">{t('savings.balanceAfter')}</span>
          <span className="font-mono">{formatCurrency(tx.balance_after)}</span>
        </div>
        <div>
          <span className="block text-xs text-gray-500 uppercase">{t('savings.reference')}</span>
          <span>{tx.reference || '-'}</span>
        </div>
        <div>
          <span className="block text-xs text-gray-500 uppercase">{t('savings.paymentMethod')}</span>
          <span className="capitalize">{tx.payment_method ? t(`savings.${tx.payment_method}`, { defaultValue: tx.payment_method }) : '-'}</span>
        </div>
        <div className="sm:col-span-2">
          <span className="block text-xs text-gray-500 uppercase">{t('savings.note')}</span>
          <span>{tx.reason_note || '-'}</span>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('savings.linkedJournalEntry')}</h3>
        {loading ? (
          <Spinner size="sm" />
        ) : journalEntryIds.length === 0 ? (
          <p className="text-sm text-gray-500">{t('savings.noLinkedJournalEntry')}</p>
        ) : (
          journalEntryIds.map((id) => <JournalDetail key={id} entryId={id} />)
        )}
      </div>
    </div>
  )
}
