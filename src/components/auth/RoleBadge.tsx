import { Badge } from '../ui/Badge'
import { ROLE_LABELS, type Role } from '../../config/constants'

interface RoleBadgeProps {
  role: string
}

const variantMap: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  member: 'default',
  manager: 'info',
  society_admin: 'warning',
  super_admin: 'danger',
}

export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <Badge variant={variantMap[role] || 'default'}>
      {ROLE_LABELS[role as Role] || role}
    </Badge>
  )
}
