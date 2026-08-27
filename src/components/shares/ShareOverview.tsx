import { Card } from '../ui/Card'
import { formatCurrency } from '../../lib/utils'
import { useTranslation } from 'react-i18next'

interface ShareOverviewProps {
  sharesEnabled: boolean
  shareValue: number
  sharesHeld?: number
}

export function ShareOverview({ sharesEnabled, shareValue, sharesHeld = 0 }: ShareOverviewProps) {
  const { t } = useTranslation()
  if (!sharesEnabled) return null

  const capital = sharesHeld * shareValue

  return (
    <Card title={t('shares.shareCapital')}>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-gray-500">{t('shares.shareValue')}</span><span className="font-medium">{formatCurrency(shareValue)}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">{t('shares.sharesHeld')}</span><span className="font-medium">{sharesHeld}</span></div>
        <div className="border-t pt-2 flex justify-between font-semibold"><span>{t('shares.totalCapital')}</span><span>{formatCurrency(capital)}</span></div>
      </div>
    </Card>
  )
}
