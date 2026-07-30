import type { ProfitDistributionRow, ProfitDistributionItemRow } from './database'

export type ProfitDistribution = ProfitDistributionRow
export type ProfitDistributionItem = ProfitDistributionItemRow

export interface ProfitDistributionWithItems extends ProfitDistribution {
  items?: (ProfitDistributionItem & {
    member_name?: string
    member_number?: string
  })[]
}
