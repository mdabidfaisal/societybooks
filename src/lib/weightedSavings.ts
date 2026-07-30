import { supabase } from './supabase'

export interface SavingsTxSummary {
  created_at: string
  balance_after: number
}

/**
 * Compute the time-weighted average savings balance for a member over a period.
 * 
 * Formula: Σ(balance_i × days_held_i) / total_days
 * 
 * This ensures fair profit distribution — a member who deposits 1000 tk
 * for 6 months gets more profit than someone who deposits 1000 tk for 1 month.
 */
export async function getWeightedAverageBalance(
  memberId: string,
  fromDate: string,
  toDate: string
): Promise<number> {
  const { data: accounts } = await supabase
    .from('savings_accounts')
    .select('id')
    .eq('member_id', memberId)
    .eq('status', 'active')

  if (!accounts || accounts.length === 0) return 0

  const accountIds = accounts.map((a) => a.id)

  // Get the balance JUST BEFORE the period starts
  const { data: preTx } = await supabase
    .from('savings_transactions')
    .select('balance_after')
    .in('savings_account_id', accountIds)
    .lt('created_at', fromDate + 'T00:00:00Z')
    .order('created_at', { ascending: false })
    .limit(1)

  // Get all transactions within the period
  const { data: periodTxns } = await supabase
    .from('savings_transactions')
    .select('created_at, balance_after')
    .in('savings_account_id', accountIds)
    .gte('created_at', fromDate + 'T00:00:00Z')
    .lte('created_at', toDate + 'T23:59:59Z')
    .order('created_at', { ascending: true })

  const startDate = new Date(fromDate + 'T00:00:00')
  const endDate = new Date(toDate + 'T00:00:00')
  const totalDays = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

  let weightedSum = 0
  let prevDate = startDate
  let prevBalance = preTx && preTx.length > 0
    ? Number((preTx[0] as SavingsTxSummary).balance_after)
    : 0

  if (periodTxns) {
    for (const raw of periodTxns) {
      const tx = raw as SavingsTxSummary
      const txDate = new Date(tx.created_at)
      const days = (txDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      if (days > 0) {
        weightedSum += prevBalance * days
      }
      prevDate = txDate
      prevBalance = Number(tx.balance_after)
    }
  }

  // Remaining days until end of period
  const remainingDays = (endDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
  if (remainingDays > 0) {
    weightedSum += prevBalance * remainingDays
  }

  return weightedSum / totalDays
}

/**
 * Get the profit period dates based on a reference year and the samiti's config.
 * Returns the start and end dates for the next/current period.
 */
export function getProfitPeriodDates(
  settings: {
    profit_period_1_start_month: number
    profit_period_1_end_month: number
    profit_period_2_start_month: number
    profit_period_2_end_month: number
  },
  year?: number
): { periodNumber: number; fromDate: string; toDate: string } {
  const now = new Date()
  const y = year || now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1-based

  const p1Start = settings.profit_period_1_start_month || 1
  const p1End = settings.profit_period_1_end_month || 6
  const p2Start = settings.profit_period_2_start_month || 7
  const p2End = settings.profit_period_2_end_month || 12

  // Determine which period we're in or the most recent completed period
  let pNum: number
  let fromYear = y
  let toYear = y

  if (currentMonth >= p1Start && currentMonth <= p1End) {
    pNum = 1
  } else if (currentMonth >= p2Start && currentMonth <= p2End) {
    pNum = 2
  } else if (currentMonth < p1Start) {
    // Before first period — use previous year's period 2
    pNum = 2
    fromYear = y - 1
    toYear = y - 1
  } else {
    // After period 2 ends, before period 1 of next year — use period 2 of current year
    pNum = 2
  }

  if (pNum === 1) {
    return {
      periodNumber: 1,
      fromDate: `${fromYear}-${String(p1Start).padStart(2, '0')}-01`,
      toDate: `${toYear}-${String(p1End).padStart(2, '0')}-${new Date(toYear, p1End, 0).getDate()}`,
    }
  } else {
    return {
      periodNumber: 2,
      fromDate: `${fromYear}-${String(p2Start).padStart(2, '0')}-01`,
      toDate: `${toYear}-${String(p2End).padStart(2, '0')}-${new Date(toYear, p2End, 0).getDate()}`,
    }
  }
}

/**
 * Fetch all active members' time-weighted balances and compute distribution.
 */
export async function computeWeightedDistribution(
  samitiId: string,
  fromDate: string,
  toDate: string,
  totalDistributeAmount: number
): Promise<{ memberId: string; memberNumber: string; name: string; basisAmount: number; distributionAmount: number }[]> {
  const { data: memberRows } = await supabase
    .from('members')
    .select('id, name, member_number')
    .eq('samiti_id', samitiId)
    .eq('status', 'active')

  if (!memberRows || memberRows.length === 0) return []

  const shares: { memberId: string; memberNumber: string; name: string; basisAmount: number; distributionAmount: number }[] = []

  let totalWeight = 0
  const weightMap: Record<string, number> = {}

  for (const m of memberRows) {
    const avgBalance = await getWeightedAverageBalance(m.id, fromDate, toDate)
    weightMap[m.id] = avgBalance
    totalWeight += avgBalance
  }

  for (const m of memberRows) {
    const w = weightMap[m.id] || 0
    const ratio = totalWeight > 0 ? w / totalWeight : 0
    shares.push({
      memberId: m.id,
      memberNumber: m.member_number,
      name: m.name,
      basisAmount: Math.round(w * 100) / 100,
      distributionAmount: Math.round(totalDistributeAmount * ratio * 100) / 100,
    })
  }

  return shares
}
