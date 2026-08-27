import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BarChart3, DollarSign, Users, BookOpen, AlertTriangle, TrendingDown, UserCheck } from 'lucide-react'

export default function ReportsPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const reports = [
    {
      title: t('reports.dailyCashReport'),
      description: t('reports.dailyCashDesc'),
      path: '/reports/daily-cash',
      icon: DollarSign,
      color: 'text-emerald-600 bg-emerald-100',
    },
    {
      title: t('reports.societySummary'),
      description: t('reports.societySummaryDesc'),
      path: '/reports/society-summary',
      icon: Users,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      title: t('reports.loanRegister'),
      description: t('reports.loanRegisterDesc'),
      path: '/reports/loan-register',
      icon: BookOpen,
      color: 'text-purple-600 bg-purple-100',
    },
    {
      title: t('reports.overdueReport'),
      description: t('reports.overdueDesc'),
      path: '/reports/overdue-emis',
      icon: AlertTriangle,
      color: 'text-red-600 bg-red-100',
    },
    {
      title: t('reports.profitLossReport'),
      description: t('reports.profitLossDesc'),
      path: '/reports/pnl',
      icon: TrendingDown,
      color: 'text-orange-600 bg-orange-100',
    },
    {
      title: t('reports.memberLedger'),
      description: t('reports.memberLedgerDesc'),
      path: '/reports/member-ledger',
      icon: UserCheck,
      color: 'text-indigo-600 bg-indigo-100',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('reports.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('reports.generateReport')}</p>
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
