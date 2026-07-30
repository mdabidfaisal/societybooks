import { useState } from 'react'
import { useMembers } from '../hooks/useMembers'
import type { MemberData } from '../hooks/useMembers'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { RefreshButton } from '../components/ui/RefreshButton'
import { MemberCard } from '../components/members/MemberCard'
import { MemberForm } from '../components/members/MemberForm'
import { useUIStore } from '../store/uiStore'
import { Search, UserPlus, AlertCircle, ToggleLeft, ToggleRight, Pencil } from 'lucide-react'

export default function MembersPage() {
  const { members, loading, error, fetchMembers, toggleMemberStatus } = useMembers()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const activeModal = useUIStore((s) => s.activeModal)
  const openModal = useUIStore((s) => s.openModal)
  const closeModal = useUIStore((s) => s.closeModal)
  const modalData = useUIStore((s) => s.modalData) as { member?: MemberData } | null

  const filtered = members.filter((m) => {
    const matchesSearch = !search ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.member_number.toLowerCase().includes(search.toLowerCase()) ||
      (m.phone && m.phone.includes(search)) ||
      (m.designation && m.designation.toLowerCase().includes(search.toLowerCase())) ||
      (m.college_name && m.college_name.toLowerCase().includes(search.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) return <Spinner size="lg" />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Members</h1>
        <div className="flex items-center gap-2">
          <RefreshButton onRefresh={fetchMembers} />
          <Button onClick={() => openModal('add-member')}>
            <UserPlus className="h-4 w-4 mr-2" /> Add Member
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 max-w-md flex-1 min-w-[200px]">
          <Search className="h-5 w-5 text-gray-400 shrink-0" />
          <Input
            placeholder="Search by name, ID, phone, college, designation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {['all', 'active', 'inactive', 'exited'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                statusFilter === s
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Error loading members</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {!error && filtered.length === 0 && (
        <EmptyState title="No members found" description={search || statusFilter !== 'all' ? 'Try adjusting your search or filter.' : 'Add your first member to get started.'} />
      )}

      {!error && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <div key={m.id} className="relative group">
              <MemberCard member={m} />
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openModal('edit-member', { member: m }) }} title="Edit">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={async (e) => { e.stopPropagation(); await toggleMemberStatus(m.id, m.status); fetchMembers() }} title={m.status === 'active' ? 'Deactivate' : 'Activate'}>
                  {m.status === 'active'
                    ? <ToggleRight className="h-4 w-4 text-green-600" />
                    : <ToggleLeft className="h-4 w-4 text-gray-400" />
                  }
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeModal === 'add-member' && (
        <Modal title="Add New Member" size="xl">
          <MemberForm />
        </Modal>
      )}

      {activeModal === 'edit-member' && modalData?.member && (
        <Modal title={`Edit: ${modalData.member.name}`} size="xl">
          <MemberForm editMember={modalData.member} />
        </Modal>
      )}
    </div>
  )
}
