import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { useUIStore } from '../store/uiStore'
import { SamitiConfigForm } from '../components/settings/SamitiConfigForm'
import { ProfitConfigForm } from '../components/settings/ProfitConfigForm'
import { UserManagement } from '../components/settings/UserManagement'
import { AuditLogView } from '../components/settings/AuditLogView'
import { AccountMappingsForm } from '../components/settings/AccountMappingsForm'
import { Settings, DollarSign, Users, ClipboardList, BookOpen } from 'lucide-react'

export default function AdminSettingsPage() {
  const activeModal = useUIStore((s) => s.activeModal)
  const openModal = useUIStore((s) => s.openModal)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          title={
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-400" />
              <span>Samiti Configuration</span>
            </div>
          }
          action={
            <button
              onClick={() => openModal('samiti-config')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Edit
            </button>
          }
        >
          <p className="text-sm text-gray-500">Manage samiti name, shares toggle, and other settings.</p>
        </Card>
        <Card
          title={
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-gray-400" />
              <span>Profit Configuration</span>
            </div>
          }
          action={
            <button
              onClick={() => openModal('profit-config')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Edit
            </button>
          }
        >
          <p className="text-sm text-gray-500">Configure default profit method and rate for loans.</p>
        </Card>
        <Card
          title={
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-gray-400" />
              <span>Account Mappings</span>
            </div>
          }
          action={
            <button
              onClick={() => openModal('account-mappings')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Configure
            </button>
          }
        >
          <p className="text-sm text-gray-500">Map transaction types to chart of accounts for auto journal entries.</p>
        </Card>
        <Card
          title={
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-400" />
              <span>User Management</span>
            </div>
          }
          action={
            <button
              onClick={() => openModal('user-mgmt')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Manage
            </button>
          }
        >
          <p className="text-sm text-gray-500">Create and manage Manager and Member accounts.</p>
        </Card>
        <Card
          title={
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-gray-400" />
              <span>Audit Log</span>
            </div>
          }
          action={
            <button
              onClick={() => openModal('audit-log')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View
            </button>
          }
        >
          <p className="text-sm text-gray-500">View audit trail of all financial transactions.</p>
        </Card>
      </div>

      {activeModal === 'samiti-config' && (
        <Modal title="Samiti Configuration">
          <SamitiConfigForm />
        </Modal>
      )}
      {activeModal === 'profit-config' && (
        <Modal title="Profit Configuration">
          <ProfitConfigForm />
        </Modal>
      )}
      {activeModal === 'account-mappings' && (
        <Modal title="Account Mappings" size="lg">
          <AccountMappingsForm />
        </Modal>
      )}
      {activeModal === 'user-mgmt' && (
        <Modal title="User Management" size="lg">
          <UserManagement />
        </Modal>
      )}
      {activeModal === 'audit-log' && (
        <Modal title="Audit Log" size="lg">
          <AuditLogView />
        </Modal>
      )}
    </div>
  )
}
