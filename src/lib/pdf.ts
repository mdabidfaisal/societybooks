import { formatCurrency, formatDate } from './utils'

export function generatePassbookHTML(transactions: {
  date: string
  type: string
  amount: number
  balance: number
  reference?: string
}[], memberName: string, accountNumber: string): string {
  const rows = transactions.map(t => `
    <tr>
      <td>${formatDate(t.date)}</td>
      <td>${t.type}</td>
      <td>${t.reference || '-'}</td>
      <td style="text-align:right">${t.type === 'withdrawal' || t.type === 'exit_settlement' ? formatCurrency(t.amount) : '-'}</td>
      <td style="text-align:right">${t.type === 'deposit' || t.type === 'profit' ? formatCurrency(t.amount) : '-'}</td>
      <td style="text-align:right">${formatCurrency(t.balance)}</td>
    </tr>
  `).join('')

  return `
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; }
        h1 { text-align: center; font-size: 18px; }
        h2 { text-align: center; font-size: 14px; color: #555; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
        th { background: #f5f5f5; }
        .header-info { margin-bottom: 20px; }
        .header-info p { margin: 2px 0; }
      </style>
    </head>
    <body>
      <h1>SocietyBooks</h1>
      <h2>Passbook / Statement of Account</h2>
      <div class="header-info">
        <p><strong>Member:</strong> ${memberName}</p>
        <p><strong>Account:</strong> ${accountNumber}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Reference</th>
            <th>Withdrawal</th>
            <th>Deposit</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </body>
    </html>
  `
}
