import type { SamitiSettingsRow, MemberRow } from './database'

export type SamitiSettings = SamitiSettingsRow
export type Member = MemberRow

export interface MemberWithSavings extends Member {
  savings_balance?: number
  total_shares?: number
  active_loans?: number
}
