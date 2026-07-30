import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { formatDate, formatCurrency } from '../../lib/utils'
import { useUIStore } from '../../store/uiStore'
import { useAuth } from '../../hooks/useAuth'
import { MemberExitForm } from './MemberExitForm'
import { CreateLoginForm } from './CreateLoginForm'
import type { MemberData } from '../../hooks/useMembers'
import { UserPlus, LogOut, Pencil } from 'lucide-react'
import { useState } from 'react'
import { MemberForm } from './MemberForm'

const statusVariant: Record<string, 'success' | 'warning' | 'danger'> = {
  active: 'success',
  inactive: 'warning',
  exited: 'danger',
}

interface MemberProfileProps {
  member: MemberData
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-1.5 text-sm border-b border-gray-100 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-right">{value || <span className="text-gray-300">—</span>}</span>
    </div>
  )
}

export function MemberProfile({ member }: MemberProfileProps) {
  const openModal = useUIStore((s) => s.openModal)
  const closeModal = useUIStore((s) => s.closeModal)
  const activeModal = useUIStore((s) => s.activeModal)
  const { role, samitiId } = useAuth()

  return (
    <div className="space-y-4">
      <Card>
        <div className="text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl font-bold text-blue-600">{member.name.charAt(0)}</span>
          </div>
          <h2 className="text-lg font-bold text-gray-900">{member.name}</h2>
          {member.name_bn && <p className="text-sm text-gray-500">{member.name_bn}</p>}
          <p className="text-xs text-gray-400">{member.member_number}</p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <Badge variant={statusVariant[member.status] || 'default'}>{member.status}</Badge>
            {member.designation && <Badge variant="info">{member.designation}</Badge>}
          </div>
        </div>

        {member.status === 'active' && (
          <div className="mt-4 pt-3 border-t space-y-2">
            <Button variant="secondary" size="sm" className="w-full" onClick={() => openModal('edit-member')}>
              <Pencil className="h-4 w-4 mr-2" /> Edit Info
            </Button>
            {role === 'society_admin' && (
              <Button variant="secondary" size="sm" className="w-full" onClick={() => openModal('create-login')}>
                <UserPlus className="h-4 w-4 mr-2" /> Create Login
              </Button>
            )}
            <Button variant="danger" size="sm" className="w-full" onClick={() => openModal('exit-member', { memberId: member.id, memberName: member.name })}>
              <LogOut className="h-4 w-4 mr-2" /> Process Exit
            </Button>
          </div>
        )}
      </Card>

      <Card title="Personal Info">
        <DetailRow label="Father/Husband" value={member.guardian_name} />
        <DetailRow label="Mother" value={member.mother_name} />
        {member.spouse_name && <DetailRow label="Spouse" value={member.spouse_name} />}
        <DetailRow label="DOB" value={member.date_of_birth ? formatDate(member.date_of_birth) : null} />
        <DetailRow label="Gender" value={member.gender} />
        <DetailRow label="Blood Group" value={member.blood_group} />
        <DetailRow label="Marital Status" value={member.marital_status} />
        <DetailRow label="NID" value={member.nid} />
      </Card>

      <Card title="College / Employment">
        <DetailRow label="College" value={member.college_name} />
        <DetailRow label="EIIN" value={member.college_code} />
        <DetailRow label="Designation" value={member.designation} />
        <DetailRow label="Department" value={member.department} />
        <DetailRow label="Employee ID" value={member.employee_id} />
        <DetailRow label="MPO Index" value={member.mpo_index_number} />
        <DetailRow label="MPO Enrolled" value={member.mpo_enrolled_date ? formatDate(member.mpo_enrolled_date) : null} />
        <DetailRow label="Govt. Service" value={member.govt_service_date ? formatDate(member.govt_service_date) : null} />
        <DetailRow label="College Join" value={member.present_college_joining_date ? formatDate(member.present_college_joining_date) : null} />
        <DetailRow label="Retirement" value={member.retirement_date ? formatDate(member.retirement_date) : null} />
        <DetailRow label="Employment" value={member.employment_status} />
        <DetailRow label="Qualification" value={member.qualification} />
      </Card>

      <Card title="Contact">
        <DetailRow label="Phone" value={member.phone} />
        <DetailRow label="Email" value={member.email} />
        <DetailRow label="Present Address" value={member.present_address} />
        <DetailRow label="Permanent Address" value={member.permanent_address} />
      </Card>

      <Card title="Nominee">
        <DetailRow label="Name" value={member.nominee_name} />
        <DetailRow label="Relation" value={member.nominee_relation} />
        <DetailRow label="NID" value={member.nominee_nid} />
        <DetailRow label="Phone" value={member.nominee_phone} />
        <DetailRow label="Address" value={member.nominee_address} />
      </Card>

      <Card title="Bank Account">
        <DetailRow label="Bank" value={member.bank_name} />
        <DetailRow label="Account No" value={member.bank_account_number} />
        <DetailRow label="Branch" value={member.branch_name} />
        <DetailRow label="Routing" value={member.routing_number} />
      </Card>

      <Card title="Other">
        <DetailRow label="Joined" value={formatDate(member.join_date)} />
        <DetailRow label="Remarks" value={member.remarks} />
        {member.exit_date && <DetailRow label="Exit Date" value={formatDate(member.exit_date)} />}
        {member.exit_settlement_amount != null && <DetailRow label="Settlement" value={formatCurrency(member.exit_settlement_amount)} />}
      </Card>

      {activeModal === 'edit-member' && (
        <Modal title="Edit Member" size="xl">
          <MemberForm editMember={member} />
        </Modal>
      )}

      {activeModal === 'create-login' && (
        <Modal title="Create Member Login">
          <CreateLoginForm memberId={member.id} samitiId={samitiId || ''} name={member.name} />
        </Modal>
      )}

      {activeModal === 'exit-member' && (
        <Modal title="Process Member Exit">
          <MemberExitForm memberId={member.id} memberName={member.name} />
        </Modal>
      )}
    </div>
  )
}
