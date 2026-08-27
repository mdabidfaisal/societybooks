import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { RefreshButton } from '../components/ui/RefreshButton'
import { ReportExportButtons } from '../components/reports/ReportExportButtons'
import { formatCurrency } from '../lib/utils'
import { useTranslation } from 'react-i18next'
import { Scale, ChevronDown, ChevronUp } from 'lucide-react'

interface AccountBalance {
  id: string
  accountCode: string
  accountName: string
  accountType: string
  balance: number
  isSystem: boolean
}

interface BalanceSheetData {
  asOfDate: string
  assets: AccountBalance[]
  totalAssets: number
  liabilities: AccountBalance[]
  totalLiabilities: number
  equity: AccountBalance[]
  totalEquity: number
  retainedEarnings: number
}

export default function BalanceSheetPage() {
  const { samitiId } = useAuth()
  const { t } = useTranslation()
  const today = new Date().toISOString().split('T')[0]
  const [asOfDate, setAsOfDate] = useState(today)
  const [data, setData] = useState<BalanceSheetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  const loadBalanceSheet = useCallback(async () => {
    if (!samitiId) return
    setLoading(true)

    // Step 1: Get journal entry IDs up to asOfDate for this samiti
    const { data: entries } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('samiti_id', samitiId)
      .lte('entry_date', asOfDate)

    if (!entries || entries.length === 0) {
      setLoading(false)
      return
    }
    const entryIds = entries.map((e: { id: string }) => e.id)

    // Step 2: Get all lines for those entries
    const { data: linesData } = await supabase
      .from('journal_entry_lines')
      .select('debit_amount, credit_amount, account_id')
      .in('journal_entry_id', entryIds)

    // Step 3: Get all accounts for this samiti
    const { data: accountsData } = await supabase
      .from('chart_of_accounts')
      .select('id, account_code, account_name, account_type, is_system')
      .eq('samiti_id', samitiId)

    const accounts = accountsData || []

    // Step 4: Calculate balance per account
    const accountBalances = new Map<string, { debit: number; credit: number }>()
    for (const acct of accounts) {
      accountBalances.set(acct.id, { debit: 0, credit: 0 })
    }

    if (linesData) {
      for (const line of linesData as { debit_amount: number; credit_amount: number; account_id: string }[]) {
        const current = accountBalances.get(line.account_id)
        if (current) {
          current.debit += Number(line.debit_amount)
          current.credit += Number(line.credit_amount)
        }
      }
    }

    if (accounts.length === 0) {
      setLoading(false)
      return
    }

    // Classify accounts
    const assetAccounts: AccountBalance[] = []
    const liabilityAccounts: AccountBalance[] = []
    const equityAccounts: AccountBalance[] = []
    let totalIncome = 0
    let totalExpense = 0

    for (const acct of accounts) {
      const bal = accountBalances.get(acct.id)!
      const net = bal.debit - bal.credit

      // For income/expense accounts, the balance contributes to retained earnings
      if (acct.account_type === 'income') {
        // Income has credit normal balance
        totalIncome += bal.credit - bal.debit
        continue
      }
      if (acct.account_type === 'expense') {
        // Expense has debit normal balance
        totalExpense += bal.debit - bal.credit
        continue
      }

      const balance = Math.round(net * 100) / 100

      if (acct.account_type === 'asset') {
        assetAccounts.push({
          id: acct.id,
          accountCode: acct.account_code,
          accountName: acct.account_name,
          accountType: acct.account_type,
          balance,
          isSystem: acct.is_system,
        })
      } else if (acct.account_type === 'liability') {
        // Liability has credit normal balance
        liabilityAccounts.push({
          id: acct.id,
          accountCode: acct.account_code,
          accountName: acct.account_name,
          accountType: acct.account_type,
          balance: -balance,
          isSystem: acct.is_system,
        })
      } else if (acct.account_type === 'equity') {
        equityAccounts.push({
          id: acct.id,
          accountCode: acct.account_code,
          accountName: acct.account_name,
          accountType: acct.account_type,
          balance: -balance,
          isSystem: acct.is_system,
        })
      }
    }

    // Sort: system accounts first, then by name
    const sortAccts = (a: AccountBalance[]) =>
      a.sort((a, b) => {
        if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1
        return a.accountName.localeCompare(b.accountName)
      })

    sortAccts(assetAccounts)
    sortAccts(liabilityAccounts)
    sortAccts(equityAccounts)

    const totalAssets = Math.round(assetAccounts.reduce((s, a) => s + a.balance, 0) * 100) / 100
    const totalLiabilities = Math.round(liabilityAccounts.reduce((s, l) => s + l.balance, 0) * 100) / 100
    const totalEquityBeforeRE = Math.round(equityAccounts.reduce((s, e) => s + e.balance, 0) * 100) / 100

    // Retained Earnings = Net Income (current period)
    const netIncome = Math.round((totalIncome - totalExpense) * 100) / 100
    const retainedEarnings = Math.round(netIncome * 100) / 100
    const totalEquity = Math.round((totalEquityBeforeRE + retainedEarnings) * 100) / 100

    setData({
      asOfDate,
      assets: assetAccounts,
      totalAssets,
      liabilities: liabilityAccounts,
      totalLiabilities,
      equity: equityAccounts,
      totalEquity,
      retainedEarnings,
    })

    setLoading(false)
  }, [samitiId, asOfDate])

  useEffect(() => { loadBalanceSheet() }, [loadBalanceSheet])

  if (loading) return <Spinner size="lg" />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('accounting.balanceSheet')}</h1>
        <div className="flex items-center gap-2">
          {data && (
            <ReportExportButtons
              filename={`balance-sheet-${asOfDate}`}
              title={t('accounting.balanceSheet')}
              subtitle={`${t('accounting.asOfDate')}: ${asOfDate}`}
              headers={[t('membership.section'), t('accounting.account'), t('accounting.accountCode'), t('common.amount')]}
              rows={[
                ...data.assets.map((a) => [t('accounting.assetsSection'), a.accountName, a.accountCode, formatCurrency(a.balance)]),
                [t('accounting.assetsSection'), t('accounting.totalAssets'), '', formatCurrency(data.totalAssets)],
                ...data.liabilities.map((l) => [t('accounting.liabilitiesSection'), l.accountName, l.accountCode, formatCurrency(l.balance)]),
                [t('accounting.liabilitiesSection'), t('accounting.totalLiabilities'), '', formatCurrency(data.totalLiabilities)],
                ...data.equity.map((e) => [t('accounting.equitySection'), e.accountName, e.accountCode, formatCurrency(e.balance)]),
                [t('accounting.equitySection'), t('accounting.retainedEarnings'), '', formatCurrency(data.retainedEarnings)],
                [t('accounting.equitySection'), t('accounting.totalEquity'), '', formatCurrency(data.totalEquity)],
              ]}
              totals={[
                { label: t('accounting.totalAssets'), value: formatCurrency(data.totalAssets) },
                { label: t('accounting.totalLiabilitiesEquity'), value: formatCurrency(data.totalLiabilities + data.totalEquity) },
              ]}
            />
          )}
          <RefreshButton onRefresh={loadBalanceSheet} />
        </div>
      </div>

      {/* As-of date filter */}
      <Card>
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('accounting.asOfDate')}</label>
            <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
          </div>
          <Button onClick={loadBalanceSheet} variant="secondary">{t('accounting.update')}</Button>
        </div>
      </Card>

      {!data || (data.assets.length === 0 && data.liabilities.length === 0 && data.equity.length === 0) ? (
        <EmptyState
          title={t('accounting.noBalanceSheetData')}
          description={t('accounting.noBalanceSheetDataDesc')}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── LEFT SIDE: Assets ── */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div
              className="bg-green-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between cursor-pointer"
              onClick={() => toggleSection('assets')}
            >
              <h2 className="text-sm font-bold text-green-800 uppercase tracking-wide">{t('accounting.assetsSection')}</h2>
              {collapsedSections.has('assets') ? <ChevronDown className="h-4 w-4 text-green-600" /> : <ChevronUp className="h-4 w-4 text-green-600" />}
            </div>
            {!collapsedSections.has('assets') && (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left py-2 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider">{t('accounting.account')}</th>
                      <th className="text-right py-2 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider">{t('accounting.amountUnit')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.assets.map((a) => (
                      <tr key={a.id} className={a.isSystem ? 'bg-green-50/50' : ''}>
                        <td className="py-2 px-4">
                          <span className="text-gray-900">{a.accountName}</span>
                          <span className="text-gray-400 text-xs ml-2">[{a.accountCode}]</span>
                        </td>
                        <td className="py-2 px-4 text-right font-medium text-gray-900">
                          {formatCurrency(a.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="bg-green-100 px-4 py-3 flex items-center justify-between border-t-2 border-green-300">
                  <span className="text-sm font-bold text-green-900">{t('accounting.totalAssets')}</span>
                  <span className="text-lg font-bold text-green-900">{formatCurrency(data.totalAssets)}</span>
                </div>
              </>
            )}
          </div>

          {/* ── RIGHT SIDE: Liabilities + Equity ── */}
          <div className="space-y-6">
            {/* Liabilities */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div
                className="bg-orange-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between cursor-pointer"
                onClick={() => toggleSection('liabilities')}
              >
                <h2 className="text-sm font-bold text-orange-800 uppercase tracking-wide">{t('accounting.liabilitiesSection')}</h2>
                {collapsedSections.has('liabilities') ? <ChevronDown className="h-4 w-4 text-orange-600" /> : <ChevronUp className="h-4 w-4 text-orange-600" />}
              </div>
              {!collapsedSections.has('liabilities') && (
                <>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left py-2 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider">{t('accounting.account')}</th>
                        <th className="text-right py-2 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider">{t('accounting.amountUnit')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.liabilities.map((l) => (
                        <tr key={l.id} className={l.isSystem ? 'bg-orange-50/50' : ''}>
                          <td className="py-2 px-4">
                            <span className="text-gray-900">{l.accountName}</span>
                            <span className="text-gray-400 text-xs ml-2">[{l.accountCode}]</span>
                          </td>
                          <td className="py-2 px-4 text-right font-medium text-gray-900">
                            {formatCurrency(l.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="bg-orange-100 px-4 py-3 flex items-center justify-between border-t-2 border-orange-300">
                    <span className="text-sm font-bold text-orange-900">{t('accounting.totalLiabilities')}</span>
                    <span className="text-lg font-bold text-orange-900">{formatCurrency(data.totalLiabilities)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Equity */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div
                className="bg-blue-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between cursor-pointer"
                onClick={() => toggleSection('equity')}
              >
                <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wide">{t('accounting.equitySection')}</h2>
                {collapsedSections.has('equity') ? <ChevronDown className="h-4 w-4 text-blue-600" /> : <ChevronUp className="h-4 w-4 text-blue-600" />}
              </div>
              {!collapsedSections.has('equity') && (
                <>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left py-2 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider">{t('accounting.account')}</th>
                        <th className="text-right py-2 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider">{t('accounting.amountUnit')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.equity.map((e) => (
                        <tr key={e.id}>
                          <td className="py-2 px-4">
                            <span className="text-gray-900">{e.accountName}</span>
                            <span className="text-gray-400 text-xs ml-2">[{e.accountCode}]</span>
                          </td>
                          <td className="py-2 px-4 text-right font-medium text-gray-900">
                            {formatCurrency(e.balance)}
                          </td>
                        </tr>
                      ))}
                      {/* Retained Earnings */}
                      <tr className="bg-blue-50/50">
                        <td className="py-2 px-4">
                          <span className="font-medium text-gray-900">{t('accounting.retainedEarnings')}</span>
                          <span className="text-gray-400 text-xs ml-2">{t('accounting.retainedEarningsNote')}</span>
                        </td>
                        <td className="py-2 px-4 text-right font-medium text-gray-900">
                          {formatCurrency(data.retainedEarnings)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="bg-blue-100 px-4 py-3 flex items-center justify-between border-t-2 border-blue-300">
                    <span className="text-sm font-bold text-blue-900">{t('accounting.totalEquity')}</span>
                    <span className="text-lg font-bold text-blue-900">{formatCurrency(data.totalEquity)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Balance Sheet Check ── */}
      {data && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Scale className="h-5 w-5 text-gray-500" />
            <span className="font-medium text-gray-900">{t('accounting.balanceSheetCheck')}</span>
            <span className="text-xs text-gray-400">{t('accounting.accountingEquation')}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-xs font-medium text-green-700 uppercase tracking-wide">{t('accounting.totalAssets')}</p>
              <p className="text-xl font-bold text-green-900 mt-1">{formatCurrency(data.totalAssets)}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 text-center">
              <p className="text-xs font-medium text-orange-700 uppercase tracking-wide">{t('accounting.totalLiabilities')}</p>
              <p className="text-xl font-bold text-orange-900 mt-1">{formatCurrency(data.totalLiabilities)}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">{t('accounting.totalLiabilitiesEquity')}</p>
              <p className="text-xl font-bold text-blue-900 mt-1">{formatCurrency(data.totalLiabilities + data.totalEquity)}</p>
            </div>
          </div>
          {Math.abs(data.totalAssets - (data.totalLiabilities + data.totalEquity)) > 0.01 ? (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {t('accounting.outOfBalance', { amount: formatCurrency(Math.abs(data.totalAssets - (data.totalLiabilities + data.totalEquity))) })}
            </div>
          ) : (
            <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 text-center font-medium">
              {t('accounting.inBalance')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
