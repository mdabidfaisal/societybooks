import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { BookOpen, Scale, FileText, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const features = [
  {
    title: 'Balance Sheet',
    description: 'Complete financial position — assets, liabilities, and equity as of any date.',
    path: '/accounting/balance-sheet',
    icon: Scale,
    color: 'text-emerald-600 bg-emerald-100',
  },
  {
    title: 'Chart of Accounts',
    description: 'Manage your full chart of accounts — create, view, and organize account codes by type.',
    path: '/accounting/accounts',
    icon: BookOpen,
    color: 'text-blue-600 bg-blue-100',
  },
  {
    title: 'Journal Entries',
    description: 'Post and browse journal entries. View full details with debit/credit lines for each entry.',
    path: '/accounting/journal',
    icon: FileText,
    color: 'text-purple-600 bg-purple-100',
  },
  {
    title: 'Income & Expense',
    description: 'View income and expense breakdown by account category with date-range filtering.',
    path: '/accounting/income-expense',
    icon: TrendingUp,
    color: 'text-green-600 bg-green-100',
  },
  {
    title: 'Profit & Loss',
    description: 'Net profit or loss summary for any date range — income minus expenses at a glance.',
    path: '/accounting/profit-loss',
    icon: TrendingDown,
    color: 'text-orange-600 bg-orange-100',
  },
]

export default function AccountingPage() {
  const navigate = useNavigate()
  const { role } = useAuth()
  if (role !== 'society_admin') return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Accounts Module</h1>
        <p className="text-sm text-gray-500 mt-1">Select a feature to manage accounts, journal entries, and financial reports.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature) => {
          const Icon = feature.icon
          return (
            <div
              key={feature.path}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md cursor-pointer transition-all group"
              onClick={() => navigate(feature.path)}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${feature.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{feature.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{feature.description}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-blue-500 transition-colors mt-1 shrink-0" />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
