import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { BarChart3, DollarSign, Users, BookOpen, AlertTriangle, TrendingDown, UserCheck } from 'lucide-react'

const reports = [
  {
    title: 'Daily Cash Summary',
    description: 'All cash receipts and payments for a selected date — deposits, withdrawals, and net cash flow.',
    path: '/reports/daily-cash',
    icon: DollarSign,
    color: 'text-emerald-600 bg-emerald-100',
  },
  {
    title: 'Society Summary',
    description: 'Key metrics at a glance — members, savings, loans outstanding, cash in hand, and more.',
    path: '/reports/society-summary',
    icon: Users,
    color: 'text-blue-600 bg-blue-100',
  },
  {
    title: 'Loan Register',
    description: 'Complete list of all loans with status, amounts, profit method, and member details.',
    path: '/reports/loan-register',
    icon: BookOpen,
    color: 'text-purple-600 bg-purple-100',
  },
  {
    title: 'Overdue EMIs',
    description: 'All overdue EMI installments with days past due, member info, and amounts.',
    path: '/reports/overdue-emis',
    icon: AlertTriangle,
    color: 'text-red-600 bg-red-100',
  },
  {
    title: 'Profit & Loss',
    description: 'Income and expense breakdown for any date range with net profit calculation.',
    path: '/reports/pnl',
    icon: TrendingDown,
    color: 'text-orange-600 bg-orange-100',
  },
  {
    title: 'Member Ledger',
    description: 'Per-member transaction history — savings transactions, loan details, and profit distributions.',
    path: '/reports/member-ledger',
    icon: UserCheck,
    color: 'text-indigo-600 bg-indigo-100',
  },
]

export default function ReportsPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Select a report to view detailed information.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((r) => {
          const Icon = r.icon
          return (
            <div
              key={r.path}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md cursor-pointer transition-all group"
              onClick={() => navigate(r.path)}
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${r.color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{r.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{r.description}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
