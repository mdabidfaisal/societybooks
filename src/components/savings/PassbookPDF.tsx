import { Button } from '../ui/Button'
import { generatePassbookHTML } from '../../lib/pdf'
import type { SavingsTransactionData } from '../../hooks/useSavings'

interface PassbookPDFProps {
  transactions: SavingsTransactionData[]
  memberName: string
  accountNumber: string
}

export function PassbookPDF({ transactions, memberName, accountNumber }: PassbookPDFProps) {
  const handleDownload = () => {
    const txData = transactions.map((t) => ({
      date: t.created_at,
      type: t.transaction_type,
      amount: t.amount,
      balance: t.balance_after,
      reference: t.reference || undefined,
    }))

    const html = generatePassbookHTML(txData, memberName, accountNumber)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `passbook-${accountNumber}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleDownload}>
      Download Passbook (HTML)
    </Button>
  )
}
