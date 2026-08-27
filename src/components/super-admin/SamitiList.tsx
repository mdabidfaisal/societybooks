import { Table, type Column } from '../ui/Table'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { formatDate } from '../../lib/utils'
import { useTranslation } from 'react-i18next'
import { Pencil, Trash2, ExternalLink, ToggleLeft, ToggleRight, UserPlus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

export interface SamitiRow {
  id: string
  samiti_name: string
  samiti_code: string
  default_profit_method: string
  default_profit_rate: number
  shares_enabled: boolean
  share_value: number
  address: string | null
  phone: string | null
  is_active: boolean
  created_at: string
}

interface SamitiListProps {
  data: SamitiRow[]
  loading: boolean
  onEdit: (samiti: SamitiRow) => void
  onDelete: (samiti: SamitiRow) => void
  onToggleActive: (samiti: SamitiRow) => void
  onCreateAdmin: (samiti: SamitiRow) => void
}

export function SamitiList({ data, loading, onEdit, onDelete, onToggleActive, onCreateAdmin }: SamitiListProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const handleToggle = async (s: SamitiRow) => {
    setTogglingId(s.id)
    await onToggleActive(s)
    setTogglingId(null)
  }

  const columns: Column<SamitiRow>[] = [
    { key: 'samiti_name', header: t('common.name'), sortable: true, render: (s) => (
      <button onClick={() => navigate(`/super-admin/samiti/${s.id}`)} className="text-blue-600 hover:text-blue-800 font-medium text-left">
        {s.samiti_name}
      </button>
    )},
    { key: 'samiti_code', header: t('common.code'), sortable: true },
    { key: 'status', header: t('common.status'), render: (s) => s.is_active
      ? <Badge variant="success">{t('common.active')}</Badge>
      : <Badge variant="danger">{t('common.inactive')}</Badge>
    },
    { key: 'default_profit_method', header: t('superAdmin.profitMethod'), render: (s) => (
      <Badge variant="info">{s.default_profit_method === 'flat' ? t('loans.flatRate') : t('loans.reducingBalance')}</Badge>
    )},
    { key: 'default_profit_rate', header: t('superAdmin.profitRate'), render: (s) => `${s.default_profit_rate}%` },
    { key: 'shares_enabled', header: t('superAdmin.shares'), render: (s) => s.shares_enabled ? <Badge variant="success">{t('common.enabled')}</Badge> : <Badge variant="default">{t('common.disabled')}</Badge> },
    { key: 'created_at', header: t('common.created'), render: (s) => formatDate(s.created_at) },
    { key: 'actions', header: t('common.actions'), render: (s) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/super-admin/samiti/${s.id}`)} title={t('common.view')}>
          <ExternalLink className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onEdit(s)} title={t('common.edit')}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => handleToggle(s)} disabled={togglingId === s.id} title={s.is_active ? t('superAdmin.deactivate') : t('superAdmin.activate')}>
          {s.is_active ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4 text-gray-400" />}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onCreateAdmin(s)} title={t('superAdmin.createAdmin')}>
          <UserPlus className="h-4 w-4 text-blue-500" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(s)} title={t('common.delete')}>
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    )},
  ]

  return (
    <Table
      columns={columns}
      data={data}
      keyExtractor={(s) => s.id}
      loading={loading}
      emptyMessage={t('superAdmin.noSamitis')}
    />
  )
}
