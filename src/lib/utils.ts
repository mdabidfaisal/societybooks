export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-BD', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function generateMemberNumber(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `MB-${year}-${random}`
}

export function generateLoanNumber(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `LN-${year}-${random}`
}

export function generateEntryNumber(): string {
  const now = new Date()
  const date = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `JE-${date}-${random}`
}

export function generateAccountNumber(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `SAV-${year}-${random}`
}

export function generateDistributionNumber(): string {
  const year = new Date().getFullYear()
  const seq = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `PD-${year}-${seq}`
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
