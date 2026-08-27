import { Card } from '../components/ui/Card'
import { SystemAuditLog } from '../components/super-admin/SystemAuditLog'
import { useTranslation } from 'react-i18next'
import { ShieldAlert } from 'lucide-react'

export default function SystemAuditPage() {
  const { t } = useTranslation()
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldAlert className="h-6 w-6 text-gray-400" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('superAdmin.systemAudit')}</h1>
          <p className="text-sm text-gray-500">{t('superAdmin.systemAuditDesc')}</p>
        </div>
      </div>

      <Card>
        <SystemAuditLog />
      </Card>
    </div>
  )
}
