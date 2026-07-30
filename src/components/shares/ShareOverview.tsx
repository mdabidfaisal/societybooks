import { Card } from '../ui/Card'
import { formatCurrency } from '../../lib/utils'

interface ShareOverviewProps {
  sharesEnabled: boolean
  shareValue: number
  sharesHeld?: number
}

export function ShareOverview({ sharesEnabled, shareValue, sharesHeld = 0 }: ShareOverviewProps) {
  if (!sharesEnabled) return null

  const capital = sharesHeld * shareValue

  return (
    <Card title="Share Capital">
      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-gray-500">Share Value</span><span className="font-medium">{formatCurrency(shareValue)}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Shares Held</span><span className="font-medium">{sharesHeld}</span></div>
        <div className="border-t pt-2 flex justify-between font-semibold"><span>Total Capital</span><span>{formatCurrency(capital)}</span></div>
      </div>
    </Card>
  )
}
