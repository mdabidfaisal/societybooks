import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { getProfitAndLoss } from '../lib/accounting'
import { generateDistributionNumber } from '../lib/utils'
import type { ProfitDistributionRow, ProfitDistributionItemRow } from '../types/database'

export interface ProfitDistributionData extends ProfitDistributionRow {}
export interface ProfitDistributionItemData extends ProfitDistributionItemRow {
  member_name?: string
  member_number?: string
}

export function useProfitDistribution() {
  const { samitiId } = useAuth()
  const [distributions, setDistributions] = useState<ProfitDistributionData[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDistributions = useCallback(async () => {
    if (!samitiId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('profit_distributions')
      .select('*')
      .eq('samiti_id', samitiId)
      .order('created_at', { ascending: false })
    if (!error && data) setDistributions(data as ProfitDistributionData[])
    setLoading(false)
  }, [samitiId])

  useEffect(() => { fetchDistributions() }, [fetchDistributions])

  const getAvailableProfit = useCallback(async (fromDate: string, toDate: string): Promise<number> => {
    if (!samitiId) return 0
    const result = await getProfitAndLoss({ samitiId, fromDate, toDate })
    return result.netProfit
  }, [samitiId])

  const createDistribution = async (params: {
    total_profit_amount: number
    distribution_basis: string
    notes?: string
  }) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: distro, error } = await supabase.from('profit_distributions').insert({
      samiti_id: samitiId,
      distribution_number: generateDistributionNumber(),
      total_profit_amount: params.total_profit_amount,
      distribution_basis: params.distribution_basis,
      status: 'draft',
      notes: params.notes || null,
      performed_by: user?.id,
    } as never).select().single()

    if (!error && distro) {
      setDistributions(prev => [distro as ProfitDistributionData, ...prev])
    }
    return { data: distro as ProfitDistributionData | null, error }
  }

  const createDistributionItems = async (
    distributionId: string,
    items: { memberId: string; basisAmount: number; distributionAmount: number }[]
  ) => {
    const rows = items.map((item) => ({
      profit_distribution_id: distributionId,
      member_id: item.memberId,
      basis_amount: item.basisAmount,
      distribution_amount: item.distributionAmount,
    }))
    const { data, error } = await supabase.from('profit_distribution_items').insert(rows as never).select()
    return { data: data as ProfitDistributionItemData[] | null, error }
  }

  const confirmDistribution = async (distributionId: string) => {
    const { data, error } = await supabase
      .from('profit_distributions')
      .update({ status: 'distributed' })
      .eq('id', distributionId)
      .select().single()

    if (!error && data) {
      setDistributions(prev => prev.map(d => d.id === distributionId ? data as ProfitDistributionData : d))
    }
    return { data: data as ProfitDistributionData | null, error }
  }

  const getDistributionWithItems = async (distributionId: string) => {
    const { data: distro } = await supabase
      .from('profit_distributions')
      .select('*')
      .eq('id', distributionId)
      .single()

    const { data: items } = await supabase
      .from('profit_distribution_items')
      .select(`
        *,
        members!inner(name, member_number)
      `)
      .eq('profit_distribution_id', distributionId)

    const enriched: ProfitDistributionItemData[] = (items || []).map((item) => {
      const i = item as ProfitDistributionItemData & { members: { name: string; member_number: string } }
      return {
        ...i,
        member_name: i.members?.name,
        member_number: i.members?.member_number,
      }
    })

    return { distribution: distro as ProfitDistributionData | null, items: enriched }
  }

  return {
    distributions, loading, fetchDistributions,
    getAvailableProfit, createDistribution,
    createDistributionItems, confirmDistribution,
    getDistributionWithItems,
  }
}
