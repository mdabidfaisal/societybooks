import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '../components/auth/ProtectedRoute'
import { AppLayout } from '../components/layout/AppLayout'
import LoginPage from '../pages/LoginPage'
import DashboardPage from '../pages/DashboardPage'
import MembersPage from '../pages/MembersPage'
import MemberDetailPage from '../pages/MemberDetailPage'
import SavingsPage from '../pages/SavingsPage'
import SavingDetailPage from '../pages/SavingDetailPage'
import LoansPage from '../pages/LoansPage'
import LoanDetailPage from '../pages/LoanDetailPage'
import ReportsPage from '../pages/ReportsPage'
import AccountingPage from '../pages/AccountingPage'
import ChartOfAccountsPage from '../pages/ChartOfAccountsPage'
import JournalPage from '../pages/JournalPage'
import IncomeExpensePage from '../pages/IncomeExpensePage'
import ProfitLossPage from '../pages/ProfitLossPage'
import BalanceSheetPage from '../pages/BalanceSheetPage'
import ProfitDistributionPage from '../pages/ProfitDistributionPage'
import DailyCashPage from '../pages/DailyCashPage'
import SocietySummaryPage from '../pages/SocietySummaryPage'
import LoanRegisterPage from '../pages/LoanRegisterPage'
import OverdueEmisPage from '../pages/OverdueEmisPage'
import MemberLedgerPage from '../pages/MemberLedgerPage'
import AdminSettingsPage from '../pages/AdminSettingsPage'
import SuperAdminPage from '../pages/SuperAdminPage'
import SamitiDetailPage from '../pages/SamitiDetailPage'
import SystemAuditPage from '../pages/SystemAuditPage'
import PassbookPage from '../pages/PassbookPage'
import NotFoundPage from '../pages/NotFoundPage'
import type { Role } from '../config/constants'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <ProtectedRoute allowedRoles={['super_admin', 'society_admin', 'manager', 'member'] as Role[]} />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'passbook', element: <PassbookPage /> },

          {
            path: 'members',
            element: <ProtectedRoute allowedRoles={['society_admin', 'manager'] as Role[]} />,
            children: [
              { index: true, element: <MembersPage /> },
              { path: ':id', element: <MemberDetailPage /> },
            ],
          },

          {
            path: 'savings',
            element: <ProtectedRoute allowedRoles={['society_admin', 'manager', 'member'] as Role[]} />,
            children: [
              { index: true, element: <SavingsPage /> },
              { path: ':id', element: <SavingDetailPage /> },
            ],
          },

          {
            path: 'loans',
            element: <ProtectedRoute allowedRoles={['society_admin', 'manager', 'member'] as Role[]} />,
            children: [
              { index: true, element: <LoansPage /> },
              { path: ':id', element: <LoanDetailPage /> },
            ],
          },

          {
            path: 'accounting',
            element: <ProtectedRoute allowedRoles={['society_admin'] as Role[]} />,
            children: [
              { index: true, element: <AccountingPage /> },
              { path: 'accounts', element: <ChartOfAccountsPage /> },
              { path: 'journal', element: <JournalPage /> },
              { path: 'income-expense', element: <IncomeExpensePage /> },
              { path: 'profit-loss', element: <ProfitLossPage /> },
              { path: 'balance-sheet', element: <BalanceSheetPage /> },
            ],
          },

          {
            path: 'profit-distribution',
            element: <ProtectedRoute allowedRoles={['society_admin'] as Role[]} />,
            children: [
              { index: true, element: <ProfitDistributionPage /> },
            ],
          },

          {
            path: 'reports',
            element: <ProtectedRoute allowedRoles={['society_admin', 'manager'] as Role[]} />,
            children: [
              { index: true, element: <ReportsPage /> },
              { path: 'daily-cash', element: <DailyCashPage /> },
              { path: 'society-summary', element: <SocietySummaryPage /> },
              { path: 'loan-register', element: <LoanRegisterPage /> },
              { path: 'overdue-emis', element: <OverdueEmisPage /> },
              { path: 'pnl', element: <ProfitLossPage /> },
              { path: 'member-ledger', element: <MemberLedgerPage /> },
            ],
          },

          {
            path: 'admin',
            element: <ProtectedRoute allowedRoles={['society_admin'] as Role[]} />,
            children: [
              { index: true, element: <AdminSettingsPage /> },
            ],
          },

          {
            path: 'super-admin',
            element: <ProtectedRoute allowedRoles={['super_admin'] as Role[]} />,
            children: [
              { index: true, element: <SuperAdminPage /> },
              { path: 'samiti/:id', element: <SamitiDetailPage /> },
              { path: 'audit-log', element: <SystemAuditPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
