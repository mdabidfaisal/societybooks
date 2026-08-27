import { useEffect, useState } from 'react'
import { Spinner } from '../ui/Spinner'
import { RefreshButton } from '../ui/RefreshButton'
import { Badge } from '../ui/Badge'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatDate } from '../../lib/utils'
import { useTranslation } from 'react-i18next'
import { Clock } from 'lucide-react'

interface AuditEntry {
  id: string
  actor_id: string
  action: string
  table_name: string
  record_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  created_at: string
}

const actionVariant: Record<string, 'success' | 'warning' | 'danger'> = {
  INSERT: 'success',
  UPDATE: 'warning',
  DELETE: 'danger',
}

export function AuditLogView() {
  const { samitiId } = useAuth()
  const { t } = useTranslation()
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = async () => {
    if (!samitiId) return
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('audit_log')
      .select('*')
      .eq('samiti_id', samitiId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (fetchError) {
      setError(fetchError.message)
    } else {
      setEntries(data as AuditEntry[])
    }
    setLoading(false)
  }

  useEffect(() => { fetchLogs() }, [samitiId])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{t('settings.last50Audit')}</p>
        <RefreshButton onRefresh={fetchLogs} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>
      )}

      {loading ? (
        <Spinner size="sm" />
      ) : entries.length === 0 ? (
        <p className="text-sm text-gray-500">
          {t('settings.noAuditEntriesYet')}
        </p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {entries.map((e) => (
            <div key={e.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg text-sm">
              <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant={actionVariant[e.action] || 'default'}>{e.action}</Badge>
                  <span className="font-medium">{e.table_name}</span>
                  <span className="text-xs text-gray-500 ml-auto">{formatDate(e.created_at)}</span>
                </div>
                {e.record_id && <p className="text-xs text-gray-500 mt-1">ID: {e.record_id}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
