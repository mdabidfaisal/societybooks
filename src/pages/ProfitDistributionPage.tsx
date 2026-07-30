import { useState } from 'react'
import { useProfitDistribution, type ProfitDistributionData, type ProfitDistributionItemData } from '../hooks/useProfitDistribution'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { RefreshButton } from '../components/ui/RefreshButton'
import { ProfitDistributionWizard } from '../components/accounting/ProfitDistributionWizard'
import { useUIStore } from '../store/uiStore'
import { formatCurrency, formatDate } from '../lib/utils'
import { supabase } from '../lib/supabase'
import { Gift, ChevronDown, ChevronUp, Search } from 'lucide-react'

const statusVariant: Record<string, 'success' | 'warning'> = { distributed: 'success', draft: 'warning' }

export default function ProfitDistributionPage() {
  const { distributions, loading, fetchDistributions } = useProfitDistribution()
  const activeModal = useUIStore((s) => s.activeModal)
  const openModal = useUIStore((s) => s.openModal)
  const [selectedDistro, setSelectedDistro] = useState<ProfitDistributionData | null>(null)
  const [distroItems, setDistroItems] = useState<ProfitDistributionItemData[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)
  const [itemSearch, setItemSearch] = useState('')

  const openDetail = async (d: ProfitDistributionData) => {
    setSelectedDistro(d)
    setItemsLoading(true)
    const { data: items } = await supabase
      .from('profit_distribution_items')
      .select(`
        *,
        members!inner(name, member_number)
      `)
      .eq('profit_distribution_id', d.id)
    if (items) {
      setDistroItems(items.map((i) => {
        const item = i as ProfitDistributionItemData & { members: { name: string; member_number: string } }
        return { ...item, member_name: item.members?.name, member_number: item.members?.member_number }
      }))
    }
    setItemsLoading(false)
  }

  if (loading) return <Spinner size="lg" />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Profit Distribution</h1>
        <div className="flex items-center gap-2">
          <RefreshButton onRefresh={fetchDistributions} />
          <Button onClick={() => openModal('new-distribution')}>
            <Gift className="h-4 w-4 mr-1" /> New Distribution
          </Button>
        </div>
      </div>

      {distributions.length === 0 ? (
        <EmptyState
          title="No profit distributions"
          description="Distribute profit to members based on savings or equal share."
        />
      ) : (
        <div className="space-y-3">
          {distributions.map((d) => (
            <Card key={d.id}>
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => openDetail(d)}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                    <Gift className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{d.distribution_number}</span>
                      <Badge variant={statusVariant[d.status] || 'default'}>{d.status}</Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {formatDate(d.distribution_date)} &middot; Basis: <span className="capitalize">{d.distribution_basis}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 mr-2">
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(d.total_profit_amount)}</p>
                  <p className="text-xs text-gray-400">Total Profit</p>
                </div>
                {selectedDistro?.id === d.id ? <ChevronUp className="h-5 w-5 text-gray-400 ml-2" /> : <ChevronDown className="h-5 w-5 text-gray-400 ml-2" />}
              </div>

              {selectedDistro?.id === d.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-gray-700">Member Distribution Detail</h3>
                    <div className="relative ml-auto">
                      <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search members..."
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        className="pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none w-48"
                      />
                    </div>
                  </div>

                  {itemsLoading ? (
                    <Spinner size="sm" />
                  ) : distroItems.length === 0 ? (
                    <p className="text-sm text-gray-500">No distribution items found.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                            <th className="py-2 px-3">Member</th>
                            <th className="py-2 px-3">ID</th>
                            {d.distribution_basis === 'savings' && <th className="py-2 px-3 text-right">Savings</th>}
                            <th className="py-2 px-3 text-right">Distribution</th>
                            <th className="py-2 px-3 text-right">% of Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {distroItems
                            .filter((item) => {
                              if (!itemSearch) return true
                              const q = itemSearch.toLowerCase()
                              return (item.member_name || '').toLowerCase().includes(q) || (item.member_number || '').toLowerCase().includes(q)
                            })
                            .map((item) => {
                              const pct = d.total_profit_amount > 0 ? (item.distribution_amount / d.total_profit_amount) * 100 : 0
                              return (
                                <tr key={item.id} className="hover:bg-gray-50">
                                  <td className="py-2 px-3 font-medium text-gray-900">{item.member_name || 'Unknown'}</td>
                                  <td className="py-2 px-3 text-gray-500 font-mono text-xs">{item.member_number || '-'}</td>
                                  {d.distribution_basis === 'savings' && (
                                    <td className="py-2 px-3 text-right text-gray-600">{formatCurrency(item.basis_amount)}</td>
                                  )}
                                  <td className="py-2 px-3 text-right font-medium text-green-700">{formatCurrency(item.distribution_amount)}</td>
                                  <td className="py-2 px-3 text-right text-gray-500">{pct.toFixed(2)}%</td>
                                </tr>
                              )
                            })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-100 font-medium">
                            <td className="py-2 px-3 text-gray-700" colSpan={d.distribution_basis === 'savings' ? 2 : 1}>
                              {distroItems.length} members
                            </td>
                            {d.distribution_basis === 'savings' && <td></td>}
                            <td className="py-2 px-3 text-right font-bold text-green-800">
                              {formatCurrency(distroItems.reduce((s, i) => s + i.distribution_amount, 0))}
                            </td>
                            <td className="py-2 px-3 text-right text-gray-400">100%</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {activeModal === 'new-distribution' && (
        <Modal title="New Profit Distribution" size="xl">
          <ProfitDistributionWizard />
        </Modal>
      )}
    </div>
  )
}
