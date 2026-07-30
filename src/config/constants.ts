export const ROLES = {
  MEMBER: 'member',
  MANAGER: 'manager',
  SOCIETY_ADMIN: 'society_admin',
  SUPER_ADMIN: 'super_admin',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const ROLE_LABELS: Record<Role, string> = {
  member: 'Member',
  manager: 'Manager',
  society_admin: 'Society Admin',
  super_admin: 'Super Admin',
}

export const MEMBER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  EXITED: 'exited',
} as const

export const LOAN_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  DISBURSED: 'disbursed',
  CLOSED: 'closed',
} as const

export const EMI_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  PARTIAL: 'partial',
  OVERDUE: 'overdue',
} as const

export const TRANSACTION_TYPE = {
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
  PROFIT: 'profit',
  CORRECTION: 'correction',
  EXIT_SETTLEMENT: 'exit_settlement',
} as const
