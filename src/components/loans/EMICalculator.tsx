import { useState } from 'react'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { ReportExportButtons } from '../reports/ReportExportButtons'
import { formatCurrency } from '../../lib/utils'
import { useTranslation } from 'react-i18next'
import { calculateEMISchedule } from '../../lib/profit'

export function EMICalculator() {
  const { t } = useTranslation()
  const [amount, setAmount] = useState(100000)
  const [tenure, setTenure] = useState(12)
  const [rate, setRate] = useState(12)
  const [method, setMethod] = useState<'flat' | 'reducing_balance'>('reducing_balance')
  const [schedule, setSchedule] = useState<ReturnType<typeof calculateEMISchedule> | null>(null)

  const handleCalculate = () => {
    if (amount <= 0 || tenure <= 0 || rate <= 0) return
    const result = calculateEMISchedule(amount, rate, tenure, method)
    setSchedule(result)
  }

  const totalPayable = schedule ? schedule.reduce((s, e) => s + e.total_amount, 0) : 0
  const totalProfit = schedule ? totalPayable - amount : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input id="emi-amount" label={`${t('loans.loanAmount')} (৳)`} type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        <Input id="emi-tenure" label={t('loans.loanTermMonths')} type="number" value={tenure} onChange={(e) => setTenure(Number(e.target.value))} />
        <Input id="emi-rate" label={`${t('loans.profitRate')} (% ${t('loans.perYear')})`} type="number" step="0.01" value={rate} onChange={(e) => setRate(Number(e.target.value))} />
        <Select
          id="emi-method"
          label={t('loans.profitMethod')}
          options={[
            { value: 'flat', label: t('loans.flatRate') },
            { value: 'reducing_balance', label: t('loans.reducingBalance') },
          ]}
          value={method}
          onChange={(e) => setMethod(e.target.value as 'flat' | 'reducing_balance')}
        />
      </div>

      <div className="flex justify-center">
        <Button onClick={handleCalculate}>{t('loans.calculateEmi')}</Button>
      </div>

      {schedule && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">{t('loans.monthlyEmi')}</p>
              <p className="text-lg font-bold text-blue-700">{formatCurrency(schedule[0]?.total_amount || 0)}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">{t('loans.totalPayable')}</p>
              <p className="text-lg font-bold text-green-700">{formatCurrency(totalPayable)}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">{t('loans.totalProfit')}</p>
              <p className="text-lg font-bold text-orange-700">{formatCurrency(totalProfit)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">{t('loans.repaymentSchedule')}</p>
            <ReportExportButtons
              filename={`emi-schedule-${amount}-${tenure}m-${method}`}
              title={t('loans.emiScheduleTitle')}
              subtitle={t('loans.scheduleSubtitle', { amount: formatCurrency(amount), months: tenure, rate, method: method === 'flat' ? t('loans.flatRate') : t('loans.reducingBalance') })}
              headers={['#', t('loans.dueDateHeader'), t('loans.principal'), t('loans.profitCol'), t('loans.totalHeader')]}
              rows={schedule.map((emi) => [
                emi.installment_no,
                emi.due_date.toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' }),
                emi.principal_amount,
                emi.profit_amount,
                emi.total_amount,
              ])}
              totals={[
                { label: t('loans.totalPayable'), value: formatCurrency(totalPayable) },
                { label: t('loans.totalProfit'), value: formatCurrency(totalProfit) },
              ]}
            />
          </div>

          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b text-left text-xs font-medium text-gray-500 uppercase">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">{t('loans.dueDateHeader')}</th>
                  <th className="pb-2 pr-4 text-right">{t('loans.principal')}</th>
                  <th className="pb-2 pr-4 text-right">{t('loans.profitCol')}</th>
                  <th className="pb-2 pr-4 text-right">{t('loans.totalHeader')}</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((emi) => (
                  <tr key={emi.installment_no} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{emi.installment_no}</td>
                    <td className="py-2 pr-4 text-gray-500">{emi.due_date.toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="py-2 pr-4 text-right">{formatCurrency(emi.principal_amount)}</td>
                    <td className="py-2 pr-4 text-right">{formatCurrency(emi.profit_amount)}</td>
                    <td className="py-2 pr-4 text-right font-medium">{formatCurrency(emi.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
