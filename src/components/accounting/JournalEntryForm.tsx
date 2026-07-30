import { useState, useMemo } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { supabase } from '../../lib/supabase'
import { postJournalEntry } from '../../lib/accounting'
import { useAuth } from '../../hooks/useAuth'
import { useUIStore } from '../../store/uiStore'
import type { ChartOfAccountData } from '../../hooks/useAccounting'
import { Plus, Trash2, AlertTriangle, Sparkles } from 'lucide-react'

interface JournalEntryFormProps {
  accounts: ChartOfAccountData[]
  onSuccess?: () => void
}

interface Line {
  account_code: string
  debit: number
  credit: number
  description: string
}

const ENTRY_TYPES = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'deposit', label: 'Savings Deposit' },
  { value: 'withdrawal', label: 'Savings Withdrawal' },
  { value: 'loan_disbursement', label: 'Loan Disbursement' },
  { value: 'loan_repayment', label: 'Loan Repayment' },
  { value: 'correction', label: 'Correction (advanced)' },
]

// Maps entry type → what account type the user picks as "primary"
const PRIMARY_FILTER: Record<string, string[]> = {
  expense: ['expense'],
  income: ['income'],
  deposit: ['liability'],
  withdrawal: ['liability'],
  loan_disbursement: ['asset'],
  loan_repayment: ['asset'],
}

// Maps entry type → (primary_side, contra_side)
const ENTRY_SIDES: Record<string, { primary: 'debit' | 'credit'; contra: 'debit' | 'credit' }> = {
  expense: { primary: 'debit', contra: 'credit' },
  income: { primary: 'credit', contra: 'debit' },
  deposit: { primary: 'credit', contra: 'debit' },
  withdrawal: { primary: 'debit', contra: 'credit' },
  loan_disbursement: { primary: 'debit', contra: 'credit' },
  loan_repayment: { primary: 'credit', contra: 'debit' },
}

export function JournalEntryForm({ accounts, onSuccess }: JournalEntryFormProps) {
  const { samitiId } = useAuth()
  const closeModal = useUIStore((s) => s.closeModal)

  // Mode
  const [advanced, setAdvanced] = useState(false)

  // Simple mode fields
  const [entryType, setEntryType] = useState('expense')
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [primaryAccount, setPrimaryAccount] = useState('')
  const [amount, setAmount] = useState(0)
  const [contraAccount, setContraAccount] = useState('')

  // Advanced mode fields
  const [lines, setLines] = useState<Line[]>([{ account_code: '', debit: 0, credit: 0, description: '' }])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-select first asset account as default contra
  useMemo(() => {
    if (!contraAccount) {
      const firstAsset = accounts.find((a) => a.account_type === 'asset' && a.is_active)
      if (firstAsset) setContraAccount(firstAsset.account_code)
    }
  }, [accounts, contraAccount])

  const primaryTypeFilter = PRIMARY_FILTER[entryType] || []
  const primaryAccounts = accounts.filter((a) => primaryTypeFilter.includes(a.account_type) && a.is_active)
  const contraCandidates = accounts.filter((a) => a.account_type === 'asset' && a.is_active)

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0)
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0)
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01

  const lineErrors = lines.map((line) => {
    if (!line.account_code) return { message: 'Select an account', show: line.account_code !== '' || totalDebit > 0 || totalCredit > 0 }
    if (line.debit > 0 && line.credit > 0) return { message: 'Can only have Debit OR Credit', show: true }
    if (line.debit === 0 && line.credit === 0) return { message: 'Enter Debit or Credit amount', show: true }
    return null
  })
  const hasLineErrors = lineErrors.some((e) => e?.show)

  const simpleCanSubmit = description.trim() && primaryAccount && amount > 0 && contraAccount

  const addLine = () => setLines([...lines, { account_code: '', debit: 0, credit: 0, description: '' }])
  const removeLine = (i: number) => lines.length > 1 && setLines(lines.filter((_, idx) => idx !== i))
  const updateLine = (i: number, field: keyof Line, value: string | number) => {
    setLines((prev) => {
      const updated = [...prev]
      updated[i] = { ...updated[i], [field]: value }
      return updated
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (advanced) {
      // ——— Advanced mode ———
      if (!description) { setError('Description is required'); return }
      if (!balanced) { setError('Debits and credits must balance'); return }
      if (hasLineErrors) { setError('Fix the journal line errors before submitting.'); return }

      const validLines = lines.filter(
        (l) => l.account_code && ((l.debit > 0 && l.credit === 0) || (l.credit > 0 && l.debit === 0))
      )
      if (validLines.length === 0) { setError('At least one valid journal line is required.'); return }

      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      try {
        await postJournalEntry({
          samitiId: samitiId!,
          entryType: 'correction',
          description,
          entryDate,
          lines: validLines,
          performedBy: user?.id || '',
        })
        onSuccess?.()
        closeModal()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to post entry')
      }
      setLoading(false)
      return
    }

    // ——— Simple mode ———
    if (!description) { setError('Description is required'); return }
    if (!primaryAccount) { setError('Select the primary account'); return }
    if (!contraAccount) { setError('Select the contra account'); return }
    if (amount <= 0) { setError('Amount must be positive'); return }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const sides = ENTRY_SIDES[entryType]
    if (!sides) { setError('Unsupported entry type'); setLoading(false); return }

    // Debit side: if primary is debit → use primaryAccount, else use contraAccount
    const debitAccount = sides.primary === 'debit' ? primaryAccount : contraAccount
    // Credit side: if primary is credit → use primaryAccount, else use contraAccount
    const creditAccount = sides.primary === 'credit' ? primaryAccount : contraAccount

    const entryLines: Line[] = [
      { account_code: debitAccount, debit: amount, credit: 0, description: '' },
      { account_code: creditAccount, debit: 0, credit: amount, description: '' },
    ]

    try {
      await postJournalEntry({
        samitiId: samitiId!,
        entryType,
        description,
        entryDate,
        lines: entryLines,
        performedBy: user?.id || '',
      })
      onSuccess?.()
      closeModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post entry')
    }
    setLoading(false)
  }

  const selectedPrimary = accounts.find((a) => a.account_code === primaryAccount)
  const selectedContra = accounts.find((a) => a.account_code === contraAccount)

  // Preview for simple mode
  const sides = ENTRY_SIDES[entryType]
  const previewLines = (simpleCanSubmit && sides && selectedPrimary && selectedContra)
    ? [
        { account: sides.primary === 'debit' ? selectedPrimary.account_name : selectedContra.account_name, side: 'Debit', amount },
        { account: sides.primary === 'credit' ? selectedPrimary.account_name : selectedContra.account_name, side: 'Credit', amount },
      ]
    : []

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Mode toggle */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => { setAdvanced(!advanced); setError(null) }}
          className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors cursor-pointer ${advanced ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          <Sparkles className="h-3 w-3" />
          {advanced ? 'Switch to Simple' : 'Advanced Mode'}
        </button>
      </div>

      {advanced ? (
        /* ───── ADVANCED MODE ───── */
        <>
          <Input id="desc-adv" label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Office rent payment" />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Journal Lines</span>
              <Button type="button" size="sm" variant="ghost" onClick={addLine}><Plus className="h-4 w-4 mr-1" />Add Line</Button>
            </div>

            {lines.map((line, i) => {
              const le = lineErrors[i]
              return (
                <div key={i} className={`p-2 rounded ${le?.show ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <Select
                        options={accounts.filter((a) => a.is_active).map((a) => ({ value: a.account_code, label: `[${a.account_code}] ${a.account_name}` }))}
                        placeholder="Select account"
                        value={line.account_code}
                        onChange={(e) => updateLine(i, 'account_code', e.target.value)}
                      />
                    </div>
                    <Input type="number" step="0.01" placeholder="Debit" value={line.debit || ''} onChange={(e) => updateLine(i, 'debit', Number(e.target.value))} className="w-24" />
                    <Input type="number" step="0.01" placeholder="Credit" value={line.credit || ''} onChange={(e) => updateLine(i, 'credit', Number(e.target.value))} className="w-24" />
                    <button type="button" onClick={() => removeLine(i)} className="p-2 text-red-400 hover:text-red-600 cursor-pointer shrink-0"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  {le?.show && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {le.message}</p>}
                </div>
              )
            })}
          </div>

          <div className="flex justify-between text-sm font-medium bg-gray-50 p-3 rounded">
            <span className={balanced ? 'text-green-600' : 'text-red-600'}>
              Debit: {totalDebit.toFixed(2)} | Credit: {totalCredit.toFixed(2)} {balanced ? '✓ Balanced' : '✗ Unbalanced'}
            </span>
          </div>
        </>
      ) : (
        /* ───── SIMPLE MODE ───── */
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              id="entry-type"
              label="Entry Type"
              options={ENTRY_TYPES}
              value={entryType}
              onChange={(e) => { setEntryType(e.target.value); setPrimaryAccount('') }}
            />
            <Input id="entry-date" label="Entry Date" type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
          </div>

          <Input id="desc" label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Office snacks purchase" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              id="primary-account"
              label={entryType === 'expense' ? 'Expense Account' : entryType === 'income' ? 'Income Account' : entryType === 'deposit' || entryType === 'withdrawal' ? 'Member Savings Account' : entryType === 'loan_disbursement' || entryType === 'loan_repayment' ? 'Loan Account' : 'Account'}
              placeholder="Select account..."
              options={primaryAccounts.map((a) => ({ value: a.account_code, label: `[${a.account_code}] ${a.account_name}` }))}
              value={primaryAccount}
              onChange={(e) => setPrimaryAccount(e.target.value)}
            />
            <Input
              id="amount"
              label="Amount (৳)"
              type="number"
              step="0.01"
              min="0.01"
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>

          <Select
            id="contra-account"
            label="Paid via / Received in"
            placeholder="Select payment account..."
            options={contraCandidates.map((a) => ({ value: a.account_code, label: `[${a.account_code}] ${a.account_name}` }))}
            value={contraAccount}
            onChange={(e) => setContraAccount(e.target.value)}
          />

          {/* Preview */}
          {previewLines.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm space-y-1">
              <p className="text-xs font-medium text-green-700 uppercase tracking-wider">Auto-entry preview</p>
              {previewLines.map((pl, i) => (
                <div key={i} className="flex justify-between text-green-800">
                  <span>{pl.side} → {pl.account}</span>
                  <span className="font-medium">{pl.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-2 rounded flex items-center gap-2"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
        <Button type="submit" loading={loading} disabled={advanced ? (!balanced || hasLineErrors) : !simpleCanSubmit}>Post Entry</Button>
      </div>
    </form>
  )
}
