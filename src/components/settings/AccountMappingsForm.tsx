import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useAccounting, type ChartOfAccountData } from '../../hooks/useAccounting'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { Spinner } from '../ui/Spinner'
import { useTranslation } from 'react-i18next'
import { Check, AlertCircle, BookOpen } from 'lucide-react'

interface MappingEntry {
  transaction_type: string
  label: string
  description: string
  debit_account_code: string
  credit_account_code: string
}

export function AccountMappingsForm() {
  const { samitiId } = useAuth()
  const { t } = useTranslation()
  const { accounts, fetchAccounts } = useAccounting()
  const [mappings, setMappings] = useState<Record<string, { debit: string; credit: string }>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const MAPPING_DEFS: { value: string; label: string; description: string }[] = [
    { value: 'savings_deposit', label: t('settings.mapSavingsDeposit'), description: t('settings.mapSavingsDepositDesc') },
    { value: 'savings_withdrawal', label: t('settings.mapSavingsWithdrawal'), description: t('settings.mapSavingsWithdrawalDesc') },
    { value: 'savings_profit', label: t('settings.mapSavingsProfit'), description: t('settings.mapSavingsProfitDesc') },
    { value: 'loan_disbursement', label: t('settings.mapLoanDisbursement'), description: t('settings.mapLoanDisbursementDesc') },
    { value: 'loan_repayment_principal', label: t('settings.mapLoanRepaymentPrincipal'), description: t('settings.mapLoanRepaymentPrincipalDesc') },
    { value: 'loan_repayment_profit', label: t('settings.mapLoanRepaymentProfit'), description: t('settings.mapLoanRepaymentProfitDesc') },
  ]

  useEffect(() => {
    fetchAccounts()
    if (!samitiId) return
    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('system_account_mappings')
        .select('transaction_type, debit_account_code, credit_account_code')
        .eq('samiti_id', samitiId)

      const map: Record<string, { debit: string; credit: string }> = {}
      if (data) {
        for (const m of data as { transaction_type: string; debit_account_code: string; credit_account_code: string }[]) {
          map[m.transaction_type] = { debit: m.debit_account_code, credit: m.credit_account_code }
        }
      }
      // Set defaults for missing mappings
      for (const def of MAPPING_DEFS) {
        if (!map[def.value]) {
          map[def.value] = { debit: '', credit: '' }
        }
      }
      setMappings(map)
      setLoading(false)
    }
    load()
  }, [samitiId, fetchAccounts])

  const updateMapping = (type: string, field: 'debit' | 'credit', value: string) => {
    setMappings((prev) => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }))
    setSaved(false)
  }

  const handleSave = async () => {
    if (!samitiId) return
    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      for (const def of MAPPING_DEFS) {
        const m = mappings[def.value]
        if (!m || !m.debit || !m.credit) continue

        await supabase
          .from('system_account_mappings')
          .upsert({
            samiti_id: samitiId,
            transaction_type: def.value,
            debit_account_code: m.debit,
            credit_account_code: m.credit,
          } as never, { onConflict: 'samiti_id, transaction_type' })
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.saveFailed'))
    }
    setSaving(false)
  }

  const accountOptions = accounts
    .filter((a) => a.is_active)
    .map((a) => ({ value: a.account_code, label: `[${a.account_code}] ${a.account_name} (${a.account_type})` }))

  if (loading) return <Spinner size="sm" />

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        {t('settings.mappingsIntro')}
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3 flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" />{t('settings.mappingsSaved')}
        </div>
      )}

      {accountOptions.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {t('settings.noAccountsFound')} <Button size="sm" variant="ghost" onClick={() => window.location.href = '/accounting/accounts'}>{t('settings.createAccountsFirst')}</Button>
        </div>
      )}

      <div className="space-y-3">
        {MAPPING_DEFS.map((def) => {
          const m = mappings[def.value]
          return (
            <div key={def.value} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-4 w-4 text-gray-400" />
                <span className="font-medium text-sm text-gray-900">{def.label}</span>
                <span className="text-xs text-gray-400">— {def.description}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select
                  options={[{ value: '', label: t('settings.selectDebitAccount') }, ...accountOptions]}
                  value={m?.debit || ''}
                  onChange={(e) => updateMapping(def.value, 'debit', e.target.value)}
                  placeholder={t('settings.debitAccount')}
                />
                <Select
                  options={[{ value: '', label: t('settings.selectCreditAccount') }, ...accountOptions]}
                  value={m?.credit || ''}
                  onChange={(e) => updateMapping(def.value, 'credit', e.target.value)}
                  placeholder={t('settings.creditAccount')}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} loading={saving}>{t('settings.saveMappings')}</Button>
      </div>
    </div>
  )
}
