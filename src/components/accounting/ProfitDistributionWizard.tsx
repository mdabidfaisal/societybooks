import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Spinner } from '../ui/Spinner'
import { useAuth } from '../../hooks/useAuth'
import { useProfitDistribution } from '../../hooks/useProfitDistribution'
import { useUIStore } from '../../store/uiStore'
import { formatCurrency } from '../../lib/utils'
import { computeWeightedDistribution, getProfitPeriodDates } from '../../lib/weightedSavings'

interface MemberShare {
  memberId: string
  memberNumber: string
  name: string
  basisAmount: number
  distributionAmount: number
}

export function ProfitDistributionWizard() {
  const { samitiId } = useAuth()
  const { getAvailableProfit, createDistribution, createDistributionItems, confirmDistribution } = useProfitDistribution()
  const closeModal = useUIStore((s) => s.closeModal)

  const [periodSettings, setPeriodSettings] = useState<{
    profit_period_1_start_month: number
    profit_period_1_end_month: number
    profit_period_2_start_month: number
    profit_period_2_end_month: number
  } | null>(null)

  const currentYear = new Date().getFullYear()
  const [step, setStep] = useState(1)
  const [fromDate, setFromDate] = useState(`${currentYear}-01-01`)
  const [toDate, setToDate] = useState(`${currentYear}-06-30`)
  const [profitAmount, setProfitAmount] = useState(0)
  const [profitLoading, setProfitLoading] = useState(false)
  const [basis, setBasis] = useState<'savings_weighted' | 'equal'>('savings_weighted')
  const [distributePercent, setDistributePercent] = useState(70)
  const [members, setMembers] = useState<MemberShare[]>([])
  const [memberLoading, setMemberLoading] = useState(false)
  const [distributing, setDistributing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load profit period settings
  useEffect(() => {
    if (!samitiId) return
    supabase.from('samiti_settings').select(
      'profit_period_1_start_month, profit_period_1_end_month, profit_period_2_start_month, profit_period_2_end_month'
    ).eq('id', samitiId).single().then(({ data }) => {
      if (data) {
        const s = data as { profit_period_1_start_month: number; profit_period_1_end_month: number; profit_period_2_start_month: number; profit_period_2_end_month: number }
        setPeriodSettings(s)
        const p = getProfitPeriodDates(s, currentYear)
        setFromDate(p.fromDate)
        setToDate(p.toDate)
      }
    })
  }, [samitiId, currentYear])

  const setPeriod = (num: 1 | 2) => {
    if (!periodSettings) return
    const p = getProfitPeriodDates(periodSettings, currentYear)
    if (num === 1) {
      const p1 = getProfitPeriodDates(periodSettings, currentYear)
      if (p1.periodNumber === 1) { setFromDate(p1.fromDate); setToDate(p1.toDate) }
      else {
        // Next period 1 is next year
        const p1next = getProfitPeriodDates(periodSettings, currentYear + 1)
        setFromDate(p1next.fromDate); setToDate(p1next.toDate)
      }
    } else {
      const p2 = getProfitPeriodDates(periodSettings, currentYear)
      if (p2.periodNumber === 2) { setFromDate(p2.fromDate); setToDate(p2.toDate) }
      else {
        const p2prev = getProfitPeriodDates(periodSettings, currentYear - 1)
        setFromDate(p2prev.fromDate); setToDate(p2prev.toDate)
      }
    }
  }

  // Step 1: Load available profit
  const loadProfit = async () => {
    setProfitLoading(true)
    setError(null)
    const p = await getAvailableProfit(fromDate, toDate)
    setProfitAmount(p)
    setProfitLoading(false)
  }

  useEffect(() => { loadProfit() }, [fromDate, toDate, getAvailableProfit])

  // Step 2: Calculate per-member shares with time-weighted balance
  const calculateShares = async () => {
    setMemberLoading(true)
    setError(null)

    const distributeAmount = Math.round(profitAmount * (distributePercent / 100) * 100) / 100

    if (basis === 'equal') {
      const { data: memberRows } = await supabase
        .from('members')
        .select('id, name, member_number')
        .eq('samiti_id', samitiId)
        .eq('status', 'active')

      if (!memberRows || memberRows.length === 0) {
        setError('No active members found')
        setMemberLoading(false)
        return
      }

      const perMember = distributeAmount / memberRows.length
      setMembers(memberRows.map((m) => ({
        memberId: m.id,
        memberNumber: m.member_number,
        name: m.name,
        basisAmount: 0,
        distributionAmount: Math.round(perMember * 100) / 100,
      })))
    } else {
      // Time-weighted savings balance
      const shares = await computeWeightedDistribution(samitiId!, fromDate, toDate, distributeAmount)
      if (shares.length === 0) {
        setError('No active members with savings found')
        setMemberLoading(false)
        return
      }
      setMembers(shares)
    }

    setStep(2)
    setMemberLoading(false)
  }

  // Step 3: Confirm and create
  const handleDistribute = async () => {
    setDistributing(true)
    setError(null)
    try {
      const { data: distro, error: createErr } = await createDistribution({
        total_profit_amount: profitAmount,
        distribution_basis: basis === 'equal' ? 'equal' : 'savings',
        notes: `Distributed ${distributePercent}% of ${formatCurrency(profitAmount)} profit for ${fromDate} to ${toDate} (weighted balance basis)`,
      })
      if (createErr || !distro) throw new Error(createErr?.message || 'Failed to create distribution')

      const { data: { user } } = await supabase.auth.getUser()

      // Create distribution items + credit each member's savings account
      const itemsToCreate: { memberId: string; basisAmount: number; distributionAmount: number }[] = []
      for (const m of members) {
        if (m.distributionAmount <= 0) continue

        itemsToCreate.push({
          memberId: m.memberId,
          basisAmount: basis === 'savings_weighted' ? m.basisAmount : 0,
          distributionAmount: m.distributionAmount,
        })
      }

      const { error: itemsErr } = await createDistributionItems(distro.id, itemsToCreate)
      if (itemsErr) throw new Error(itemsErr.message)

      // Credit each member's savings account — this triggers the DB trigger
      // which auto-creates the journal entry (Dr SAVINGS_PROFIT_EXP, Cr SAVINGS_LIABILITY)
      for (const m of members) {
        if (m.distributionAmount <= 0) continue

        const { data: accts } = await supabase
          .from('savings_accounts')
          .select('id')
          .eq('member_id', m.memberId)
          .eq('status', 'active')
          .limit(1)

        if (!accts || accts.length === 0) continue

        const { data: lastTx } = await supabase
          .from('savings_transactions')
          .select('balance_after')
          .eq('savings_account_id', accts[0].id)
          .order('created_at', { ascending: false })
          .limit(1)

        const currentBal = (lastTx && lastTx.length > 0) ? Number((lastTx[0] as { balance_after: number }).balance_after) : 0

        const { data: savingsTx, error: savingsErr } = await supabase.from('savings_transactions').insert({
          samiti_id: samitiId,
          savings_account_id: accts[0].id,
          transaction_type: 'profit',
          amount: m.distributionAmount,
          balance_after: currentBal + m.distributionAmount,
          reference: `Distribution ${distro.distribution_number}`,
          performed_by: user?.id,
        } as never).select().single()

        if (savingsErr) throw new Error(`Failed to credit savings for ${m.name}: ${savingsErr.message}`)

        // Link the distribution item to the savings transaction
        if (savingsTx) {
          await supabase.from('profit_distribution_items')
            .update({ savings_transaction_id: (savingsTx as { id: string }).id })
            .eq('profit_distribution_id', distro.id)
            .eq('member_id', m.memberId)
        }
      }

      await confirmDistribution(distro.id)
      closeModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Distribution failed')
    }
    setDistributing(false)
  }

  const totalDistribute = members.reduce((s, m) => s + m.distributionAmount, 0)
  const netReserve = profitAmount - totalDistribute

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>
      )}

      {step === 1 && (
        <>
          <h3 className="font-semibold text-gray-900">Step 1: Select Period & Configure</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Profit Period From</label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>

          {periodSettings && (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setPeriod(1)}>
                Period 1 (Month {periodSettings.profit_period_1_start_month}–{periodSettings.profit_period_1_end_month})
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setPeriod(2)}>
                Period 2 (Month {periodSettings.profit_period_2_start_month}–{periodSettings.profit_period_2_end_month})
              </Button>
            </div>
          )}

          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Net Profit for Period</span>
              {profitLoading ? (
                <Spinner size="sm" />
              ) : (
                <span className="text-xl font-bold text-gray-900">{formatCurrency(profitAmount)}</span>
              )}
            </div>
          </div>

          <Select
            id="basis"
            label="Distribution Basis"
            value={basis}
            onChange={(e) => setBasis(e.target.value as typeof basis)}
            options={[
              { value: 'savings_weighted', label: 'By Weighted Savings Balance (fair — based on time held)' },
              { value: 'equal', label: 'Equal Share (same amount per member)' },
            ]}
          />

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Distribute {distributePercent}% of Profit
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={distributePercent}
              onChange={(e) => setDistributePercent(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>Reserve: {formatCurrency(netReserve)}</span>
              <span>Distribute: {formatCurrency(Math.round(profitAmount * distributePercent / 100 * 100) / 100)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={calculateShares} loading={memberLoading}>
              Preview Distribution
            </Button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h3 className="font-semibold text-gray-900">Step 2: Preview Per-Member Distribution</h3>

          <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Period</span>
              <span>{fromDate} → {toDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Net Profit</span>
              <span className="font-medium">{formatCurrency(profitAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Distributing</span>
              <span className="font-medium text-green-700">{distributePercent}% = {formatCurrency(totalDistribute)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Reserve</span>
              <span className="font-medium text-orange-700">{formatCurrency(netReserve)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Basis</span>
              <span>{basis === 'equal' ? 'Equal Share' : 'Weighted Savings Balance'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Members</span>
              <span>{members.length}</span>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
            <div className="sticky top-0 bg-gray-100 px-3 py-2 flex text-xs font-medium text-gray-600 uppercase tracking-wider">
              <span className="w-16 shrink-0">ID</span>
              <span className="flex-1">Member</span>
              {basis === 'savings_weighted' && <span className="w-28 text-right shrink-0">Avg Balance</span>}
              <span className="w-28 text-right shrink-0">Distribution</span>
            </div>
            {members.map((m) => (
              <div key={m.memberId} className="px-3 py-2 flex items-center text-sm hover:bg-gray-50">
                <span className="w-16 shrink-0 text-gray-500 text-xs font-mono">{m.memberNumber}</span>
                <span className="flex-1 text-gray-900 truncate">{m.name}</span>
                {basis === 'savings_weighted' && <span className="w-28 text-right text-gray-600 shrink-0">{formatCurrency(m.basisAmount)}</span>}
                <span className="w-28 text-right font-medium text-green-700 shrink-0">{formatCurrency(m.distributionAmount)}</span>
              </div>
            ))}
          </div>

          <div className="bg-gray-100 rounded-lg px-3 py-2 flex justify-between text-sm font-bold">
            <span>Total Distributed</span>
            <span className="text-green-700">{formatCurrency(totalDistribute)}</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setStep(1)} disabled={distributing}>Back</Button>
            <Button onClick={handleDistribute} loading={distributing}>Confirm & Distribute</Button>
          </div>
        </>
      )}
    </div>
  )
}
