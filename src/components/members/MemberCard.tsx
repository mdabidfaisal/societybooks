import { useNavigate } from 'react-router-dom'
import { Badge } from '../ui/Badge'
import { formatDate } from '../../lib/utils'
import { useTranslation } from 'react-i18next'
import type { MemberData } from '../../hooks/useMembers'

const statusVariant: Record<string, 'success' | 'warning' | 'danger'> = {
  active: 'success',
  inactive: 'warning',
  exited: 'danger',
}

interface MemberCardProps {
  member: MemberData
}

export function MemberCard({ member }: MemberCardProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md cursor-pointer transition-shadow"
      onClick={() => navigate(`/members/${member.id}`)}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-blue-600">{member.name.charAt(0)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{member.name}</p>
          <p className="text-xs text-gray-500">{member.member_number}</p>
        </div>
        <Badge variant={statusVariant[member.status]}>{t(`membership.${member.status}`)}</Badge>
      </div>
      <div className="text-xs text-gray-500 space-y-1 border-t pt-2">
        {member.designation && <p>🎓 {member.designation}</p>}
        {member.college_name && <p>🏛️ {member.college_name}</p>}
        {member.phone && <p>📞 {member.phone}</p>}
        {member.mpo_index_number && <p>📋 MPO: {member.mpo_index_number}</p>}
        <p>📅 {t('membership.memberSince', { date: formatDate(member.join_date) })}</p>
      </div>
    </div>
  )
}
