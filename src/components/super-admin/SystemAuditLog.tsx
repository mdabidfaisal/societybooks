import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatDate } from '../../lib/utils'
import { Table, type Column } from '../ui/Table'
import { Badge } from '../ui/Badge'
import { RefreshButton } from '../ui/RefreshButton'
import { Input } from '../ui/Input'
import { Search } from 'lucide-react'

export interface AuditEntry {
  id: string
  samiti_id: string | null
  actor_id: string
  action: string
  table_name: string
  record_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  created_at: string
}

const actionVariant: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  INSERT: 'success',
  UPDATE: 'warning',
  DELETE: 'danger',
}

export function SystemAuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const fetchLogs = async () => {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (fetchError) {
      setError(fetchError.message)
    } else {
      setEntries(data as AuditEntry[])
    }
    setLoading(false)
  }

  useEffect(() => { fetchLogs() }, [])

  const filtered = entries.filter((e) =>
    !search ||
    e.action.toLowerCase().includes(search.toLowerCase()) ||
    e.table_name.toLowerCase().includes(search.toLowerCase()) ||
    (e.record_id && e.record_id.toLowerCase().includes(search.toLowerCase()))
  )

  const columns: Column<AuditEntry>[] = [
    { key: 'action', header: 'Action', render: (e) => (
      <Badge variant={actionVariant[e.action] || 'default'}>{e.action}</Badge>
    )},
    { key: 'table_name', header: 'Table', render: (e) => (
      <span className="font-medium">{e.table_name}</span>
    )},
    { key: 'samiti_id', header: 'Samiti', render: (e) => e.samiti_id ? (
      <span className="text-xs font-mono">{e.samiti_id.slice(0, 8)}...</span>
    ) : <span className="text-gray-400">—</span>},
    { key: 'record_id', header: 'Record ID', render: (e) => e.record_id ? (
      <span className="text-xs font-mono">{e.record_id.slice(0, 8)}...</span>
    ) : <span className="text-gray-400">—</span>},
    { key: 'created_at', header: 'Date', render: (e) => formatDate(e.created_at) },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 max-w-md flex-1">
          <Search className="h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search by action, table, or record ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <RefreshButton onRefresh={fetchLogs} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>
      )}

      <Table
        columns={columns}
        data={filtered}
        keyExtractor={(e) => e.id}
        loading={loading}
        emptyMessage="No audit entries found."
      />
    </div>
  )
}
