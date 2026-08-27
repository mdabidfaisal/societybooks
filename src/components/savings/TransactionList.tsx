import { useState, useEffect } from 'react'
import { Eye } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { useSavings } from '../../hooks/useSavings'
import { formatCurrency, formatDate } from '../../lib/utils'
import { useTranslation } from 'react-i18next'
import { TransactionDetail } from './TransactionDetail'
import type { SavingsTransactionData } from '../../hooks/useSavings'

const txVariant: Record<string, 'success' | 'danger' | 'info' | 'warning'> = {
  deposit: 'success',
  withdrawal: 'danger',
  profit: 'info',
  correction: 'warning',
  exit_settlement: 'danger',
}

interface TransactionListProps {
  accountId: string
  compact?: boolean
}

export function TransactionList({ accountId, compact }: TransactionListProps) {
  const { getTransactions } = useSavings()
  const { t } = useTranslation()
  const [transactions, setTransactions] = useState<SavingsTransactionData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTx, setSelectedTx] = useState<SavingsTransactionData | null>(null)

  useEffect(() => {
    getTransactions(accountId).then(({ data }) => {
      if (data) setTransactions(data)
      setLoading(false)
    })
  }, [accountId, getTransactions])

  if (loading) return <p className="text-sm text-gray-500 py-4 text-center">{t('savings.loadingTransactions')}</p>
  if (transactions.length === 0) return <p className="text-sm text-gray-500 py-4 text-center">{t('savings.noTransactionsYet')}</p>

  return (
    <div className={`overflow-x-auto ${compact ? '' : ''}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs font-medium text-gray-500 uppercase">
            <th className="pb-3 pr-4">{t('common.date')}</th>
            <th className="pb-3 pr-4">{t('common.type')}</th>
            <th className="pb-3 pr-4 text-right">{t('common.amount')}</th>
            <th className="pb-3 pr-4 text-right">{t('common.balance')}</th>
            {!compact && <th className="pb-3 pr-4">{t('savings.reference')}</th>}
            {!compact && <th className="pb-3 pr-4">{t('savings.note')}</th>}
            {!compact && <th className="pb-3 pr-4">{t('common.actions')}</th>}
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id} className="border-b last:border-0 hover:bg-gray-50">
              <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">{formatDate(tx.created_at)}</td>
              <td className="py-3 pr-4"><Badge variant={txVariant[tx.transaction_type] || 'default'}>{t(`txnType.${tx.transaction_type}`, { defaultValue: tx.transaction_type })}</Badge></td>
              <td className="py-3 pr-4 text-right font-medium whitespace-nowrap">
                <span className={tx.transaction_type === 'deposit' || tx.transaction_type === 'profit' ? 'text-green-600' : 'text-red-600'}>
                  {tx.transaction_type === 'deposit' || tx.transaction_type === 'profit' ? '+' : '-'}{formatCurrency(tx.amount)}
                </span>
              </td>
              <td className="py-3 pr-4 text-right font-mono whitespace-nowrap">{formatCurrency(tx.balance_after)}</td>
              {!compact && <td className="py-3 pr-4 text-gray-500 max-w-[150px] truncate">{tx.reference || '-'}</td>}
              {!compact && <td className="py-3 pr-4 text-gray-500 max-w-[150px] truncate">{tx.reason_note || '-'}</td>}
              {!compact && (
                <td className="py-3 pr-4">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedTx(tx)}>
                    <Eye className="h-4 w-4 mr-1" /> {t('common.view')}
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {selectedTx && (
        <Modal title={t('savings.transactionDetails')} size="lg" onClose={() => setSelectedTx(null)}>
          <TransactionDetail tx={selectedTx} />
        </Modal>
      )}
    </div>
  )
}
