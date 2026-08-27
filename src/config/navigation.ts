import {
  LayoutDashboard, Users, Wallet, HandCoins,
  BookOpen, PiggyBank, BarChart3, Settings, Shield,
  ScrollText, BookDown,
} from 'lucide-react'
import type { Role } from './constants'

export interface NavItem {
  label: string
  path: string
  icon: React.ComponentType<{ className?: string }>
  roles: Role[]
}

export const navigation: NavItem[] = [
  {
    label: 'nav.dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    roles: ['member', 'manager', 'society_admin', 'super_admin'],
  },
  {
    label: 'nav.passbook',
    path: '/passbook',
    icon: BookDown,
    roles: ['member', 'manager', 'society_admin'],
  },
  {
    label: 'nav.members',
    path: '/members',
    icon: Users,
    roles: ['manager', 'society_admin'],
  },
  {
    label: 'nav.savings',
    path: '/savings',
    icon: Wallet,
    roles: ['member', 'manager', 'society_admin'],
  },
  {
    label: 'nav.loans',
    path: '/loans',
    icon: HandCoins,
    roles: ['member', 'manager', 'society_admin'],
  },
  {
    label: 'nav.accounting',
    path: '/accounting',
    icon: BookOpen,
    roles: ['society_admin'],
  },
  {
    label: 'nav.profitDistribution',
    path: '/profit-distribution',
    icon: PiggyBank,
    roles: ['society_admin'],
  },
  {
    label: 'nav.reports',
    path: '/reports',
    icon: BarChart3,
    roles: ['manager', 'society_admin'],
  },
  {
    label: 'nav.admin',
    path: '/admin',
    icon: Settings,
    roles: ['society_admin'],
  },
  {
    label: 'nav.superAdmin',
    path: '/super-admin',
    icon: Shield,
    roles: ['super_admin'],
  },
  {
    label: 'nav.auditLog',
    path: '/super-admin/audit-log',
    icon: ScrollText,
    roles: ['super_admin'],
  },
]
