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
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    roles: ['member', 'manager', 'society_admin', 'super_admin'],
  },
  {
    label: 'Passbook',
    path: '/passbook',
    icon: BookDown,
    roles: ['member', 'manager', 'society_admin'],
  },
  {
    label: 'Members',
    path: '/members',
    icon: Users,
    roles: ['manager', 'society_admin'],
  },
  {
    label: 'Savings',
    path: '/savings',
    icon: Wallet,
    roles: ['member', 'manager', 'society_admin'],
  },
  {
    label: 'Loans',
    path: '/loans',
    icon: HandCoins,
    roles: ['member', 'manager', 'society_admin'],
  },
  {
    label: 'Accounts',
    path: '/accounting',
    icon: BookOpen,
    roles: ['society_admin'],
  },
  {
    label: 'Profit Distribution',
    path: '/profit-distribution',
    icon: PiggyBank,
    roles: ['society_admin'],
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: BarChart3,
    roles: ['manager', 'society_admin'],
  },
  {
    label: 'Admin',
    path: '/admin',
    icon: Settings,
    roles: ['society_admin'],
  },
  {
    label: 'Super Admin',
    path: '/super-admin',
    icon: Shield,
    roles: ['super_admin'],
  },
  {
    label: 'Audit Log',
    path: '/super-admin/audit-log',
    icon: ScrollText,
    roles: ['super_admin'],
  },
]
