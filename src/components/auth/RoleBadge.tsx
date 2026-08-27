import { Badge } from '../ui/Badge'
import { useTranslation } from 'react-i18next'
import type { Role } from '../../config/constants'

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
  const { t } = useTranslation()
  return (
    <Badge variant={variantMap[role] || 'default'}>
      {t(`roles.${role as Role}`)}
    </Badge>
  )
}
