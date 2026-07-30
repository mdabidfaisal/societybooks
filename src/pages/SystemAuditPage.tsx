import { Card } from '../components/ui/Card'
import { SystemAuditLog } from '../components/super-admin/SystemAuditLog'
import { ShieldAlert } from 'lucide-react'

export default function SystemAuditPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldAlert className="h-6 w-6 text-gray-400" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Audit Log</h1>
          <p className="text-sm text-gray-500">Audit entries across all samitis.</p>
        </div>
      </div>

      <Card>
        <SystemAuditLog />
      </Card>
    </div>
  )
}
