import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { formatDate, formatCurrency } from '../../lib/utils'
import { useUIStore } from '../../store/uiStore'
import { useAuth } from '../../hooks/useAuth'
import { MemberExitForm } from './MemberExitForm'
import { CreateLoginForm } from './CreateLoginForm'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()

  const genderLabel = member.gender === 'male' ? t('membership.genderMale') : member.gender === 'female' ? t('membership.genderFemale') : member.gender === 'other' ? t('membership.genderOther') : null
  const maritalLabel = member.marital_status === 'unmarried' ? t('membership.maritalSingle') : member.marital_status === 'married' ? t('membership.maritalMarried') : member.marital_status === 'divorced' ? t('membership.maritalDivorced') : member.marital_status === 'widowed' ? t('membership.maritalWidowed') : null
  const employmentLabel = member.employment_status === 'permanent' ? t('membership.employmentPermanent') : member.employment_status === 'deputation' ? t('membership.employmentDeputation') : member.employment_status === 'contract' ? t('membership.employmentContract') : member.employment_status === 'other' ? t('membership.other') : null

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
            <Badge variant={statusVariant[member.status] || 'default'}>{t(`membership.${member.status}`, { defaultValue: member.status })}</Badge>
            {member.designation && <Badge variant="info">{member.designation}</Badge>}
          </div>
        </div>

        {member.status === 'active' && (
          <div className="mt-4 pt-3 border-t space-y-2">
            <Button variant="secondary" size="sm" className="w-full" onClick={() => openModal('edit-member')}>
              <Pencil className="h-4 w-4 mr-2" /> {t('membership.editInfo')}
            </Button>
            {role === 'society_admin' && (
              <Button variant="secondary" size="sm" className="w-full" onClick={() => openModal('create-login')}>
                <UserPlus className="h-4 w-4 mr-2" /> {t('membership.createLogin')}
              </Button>
            )}
            <Button variant="danger" size="sm" className="w-full" onClick={() => openModal('exit-member', { memberId: member.id, memberName: member.name })}>
              <LogOut className="h-4 w-4 mr-2" /> {t('membership.processExit')}
            </Button>
          </div>
        )}
      </Card>

      <Card title={t('membership.personalInfo')}>
        <DetailRow label={t('membership.fatherHusbandShort')} value={member.guardian_name} />
        <DetailRow label={t('membership.mother')} value={member.mother_name} />
        {member.spouse_name && <DetailRow label={t('membership.spouse')} value={member.spouse_name} />}
        <DetailRow label={t('membership.dobShort')} value={member.date_of_birth ? formatDate(member.date_of_birth) : null} />
        <DetailRow label={t('membership.gender')} value={genderLabel} />
        <DetailRow label={t('membership.bloodGroup')} value={member.blood_group} />
        <DetailRow label={t('membership.maritalStatus')} value={maritalLabel} />
        <DetailRow label={t('membership.nid')} value={member.nid} />
      </Card>

      <Card title={t('membership.collegeEmployment')}>
        <DetailRow label={t('membership.college')} value={member.college_name} />
        <DetailRow label={t('membership.eiin')} value={member.college_code} />
        <DetailRow label={t('membership.designation')} value={member.designation} />
        <DetailRow label={t('membership.department')} value={member.department} />
        <DetailRow label={t('membership.employeeId')} value={member.employee_id} />
        <DetailRow label={t('membership.mpoIndex')} value={member.mpo_index_number} />
        <DetailRow label={t('membership.mpoEnrolled')} value={member.mpo_enrolled_date ? formatDate(member.mpo_enrolled_date) : null} />
        <DetailRow label={t('membership.govtService')} value={member.govt_service_date ? formatDate(member.govt_service_date) : null} />
        <DetailRow label={t('membership.collegeJoin')} value={member.present_college_joining_date ? formatDate(member.present_college_joining_date) : null} />
        <DetailRow label={t('membership.retirement')} value={member.retirement_date ? formatDate(member.retirement_date) : null} />
        <DetailRow label={t('membership.employment')} value={employmentLabel} />
        <DetailRow label={t('membership.qualification')} value={member.qualification} />
      </Card>

      <Card title={t('membership.contactTitle')}>
        <DetailRow label={t('membership.phonePrimary')} value={member.phone} />
        <DetailRow label={t('auth.email')} value={member.email} />
        <DetailRow label={t('membership.presentAddress')} value={member.present_address} />
        <DetailRow label={t('membership.permanentAddress')} value={member.permanent_address} />
      </Card>

      <Card title={t('membership.nomineeTitle')}>
        <DetailRow label={t('membership.nameLabel')} value={member.nominee_name} />
        <DetailRow label={t('membership.relation')} value={member.nominee_relation} />
        <DetailRow label={t('membership.nid')} value={member.nominee_nid} />
        <DetailRow label={t('membership.phonePrimary')} value={member.nominee_phone} />
        <DetailRow label={t('membership.addressPrimary')} value={member.nominee_address} />
      </Card>

      <Card title={t('membership.bankAccountTitle')}>
        <DetailRow label={t('membership.bankName')} value={member.bank_name} />
        <DetailRow label={t('membership.accountNo')} value={member.bank_account_number} />
        <DetailRow label={t('membership.branchName')} value={member.branch_name} />
        <DetailRow label={t('membership.routing')} value={member.routing_number} />
      </Card>

      <Card title={t('membership.otherTitle')}>
        <DetailRow label={t('membership.joined')} value={formatDate(member.join_date)} />
        <DetailRow label={t('membership.remarks')} value={member.remarks} />
        {member.exit_date && <DetailRow label={t('membership.exitDate')} value={formatDate(member.exit_date)} />}
        {member.exit_settlement_amount != null && <DetailRow label={t('membership.settlement')} value={formatCurrency(member.exit_settlement_amount)} />}
      </Card>

      {activeModal === 'edit-member' && (
        <Modal title={t('membership.editMember')} size="xl">
          <MemberForm editMember={member} />
        </Modal>
      )}

      {activeModal === 'create-login' && (
        <Modal title={t('membership.createMemberLoginTitle')}>
          <CreateLoginForm memberId={member.id} samitiId={samitiId || ''} name={member.name} />
        </Modal>
      )}

      {activeModal === 'exit-member' && (
        <Modal title={t('membership.processExit')}>
          <MemberExitForm memberId={member.id} memberName={member.name} />
        </Modal>
      )}
    </div>
  )
}
