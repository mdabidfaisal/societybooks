import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { useUIStore } from '../store/uiStore'
import { SamitiConfigForm } from '../components/settings/SamitiConfigForm'
import { ProfitConfigForm } from '../components/settings/ProfitConfigForm'
import { UserManagement } from '../components/settings/UserManagement'
import { AuditLogView } from '../components/settings/AuditLogView'
import { AccountMappingsForm } from '../components/settings/AccountMappingsForm'
import { useTranslation } from 'react-i18next'
import { Settings, DollarSign, Users, ClipboardList, BookOpen } from 'lucide-react'

export default function AdminSettingsPage() {
  const activeModal = useUIStore((s) => s.activeModal)
  const openModal = useUIStore((s) => s.openModal)
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('settings.adminTitle')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          title={
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-400" />
              <span>{t('settings.samitiConfig')}</span>
            </div>
          }
          action={
            <button
              onClick={() => openModal('samiti-config')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {t('settings.editAction')}
            </button>
          }
        >
          <p className="text-sm text-gray-500">{t('settings.samitiConfigDesc')}</p>
        </Card>
        <Card
          title={
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-gray-400" />
              <span>{t('settings.profitConfig')}</span>
            </div>
          }
          action={
            <button
              onClick={() => openModal('profit-config')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {t('settings.editAction')}
            </button>
          }
        >
          <p className="text-sm text-gray-500">{t('settings.profitConfigDescShort')}</p>
        </Card>
        <Card
          title={
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-gray-400" />
              <span>{t('settings.accountMappings')}</span>
            </div>
          }
          action={
            <button
              onClick={() => openModal('account-mappings')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {t('settings.configureAction')}
            </button>
          }
        >
          <p className="text-sm text-gray-500">{t('settings.accountMappingsDescShort')}</p>
        </Card>
        <Card
          title={
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-400" />
              <span>{t('settings.userManagement')}</span>
            </div>
          }
          action={
            <button
              onClick={() => openModal('user-mgmt')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {t('settings.manageAction')}
            </button>
          }
        >
          <p className="text-sm text-gray-500">{t('settings.userManagementDescShort')}</p>
        </Card>
        <Card
          title={
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-gray-400" />
              <span>{t('settings.auditLog')}</span>
            </div>
          }
          action={
            <button
              onClick={() => openModal('audit-log')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {t('settings.viewAction')}
            </button>
          }
        >
          <p className="text-sm text-gray-500">{t('settings.auditLogDescShort')}</p>
        </Card>
      </div>

      {activeModal === 'samiti-config' && (
        <Modal title={t('settings.samitiConfig')}>
          <SamitiConfigForm />
        </Modal>
      )}
      {activeModal === 'profit-config' && (
        <Modal title={t('settings.profitConfig')}>
          <ProfitConfigForm />
        </Modal>
      )}
      {activeModal === 'account-mappings' && (
        <Modal title={t('settings.accountMappings')} size="lg">
          <AccountMappingsForm />
        </Modal>
      )}
      {activeModal === 'user-mgmt' && (
        <Modal title={t('settings.userManagement')} size="lg">
          <UserManagement />
        </Modal>
      )}
      {activeModal === 'audit-log' && (
        <Modal title={t('settings.auditLog')} size="lg">
          <AuditLogView />
        </Modal>
      )}
    </div>
  )
}
