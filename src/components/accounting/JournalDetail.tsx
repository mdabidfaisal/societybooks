import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatDate } from '../../lib/utils'
import { Spinner } from '../ui/Spinner'

interface JournalDetailProps {
  entryId: string
}

export function JournalDetail({ entryId }: JournalDetailProps) {
  const [lines, setLines] = useState<Record<string, unknown>[]>([])
  const [entry, setEntry] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: entryData } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('id', entryId)
        .single()
      if (entryData) setEntry(entryData)

      const { data: linesData } = await supabase
        .from('journal_entry_lines')
        .select(`
          debit_amount,
          credit_amount,
          description,
          account:account_id(account_code, account_name, account_type)
        `)
        .eq('journal_entry_id', entryId)

      if (linesData) setLines(linesData)
      setLoading(false)
    }
    load()
  }, [entryId])

  if (loading) return <Spinner size="sm" />
  if (!entry) return <p className="text-sm text-gray-500">Entry not found</p>

  return (
    <div className="space-y-3">
      <div className="text-sm space-y-1">
        <div className="flex justify-between"><span className="text-gray-500">Entry #</span><span className="font-mono font-medium">{entry.entry_number as string}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Date</span><span>{formatDate(entry.entry_date as string)}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Description</span><span className="font-medium">{entry.description as string}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="capitalize">{(entry.entry_type as string).replace(/_/g, ' ')}</span></div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs font-medium text-gray-500 uppercase">
              <th className="pb-2 pr-4">Account</th>
              <th className="pb-2 pr-4 text-right">Debit</th>
              <th className="pb-2 pr-4 text-right">Credit</th>
              <th className="pb-2 pr-4">Note</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => {
              const account = line.account as { account_code: string; account_name: string; account_type: string } | undefined
              return (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2 pr-4">
                    <span className="font-medium">{account?.account_name || 'Unknown'}</span>
                    <span className="text-gray-400 text-xs ml-1 font-mono">({account?.account_code})</span>
                  </td>
                  <td className="py-2 pr-4 text-right">{line.debit_amount ? formatCurrency(line.debit_amount as number) : '-'}</td>
                  <td className="py-2 pr-4 text-right">{line.credit_amount ? formatCurrency(line.credit_amount as number) : '-'}</td>
                  <td className="py-2 pr-4 text-gray-500">{line.description ? (line.description as string) : '-'}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t font-medium">
              <td className="pt-2 pr-4">Total</td>
              <td className="pt-2 pr-4 text-right">{formatCurrency(entry.total_debit as number)}</td>
              <td className="pt-2 pr-4 text-right">{formatCurrency(entry.total_credit as number)}</td>
              <td className="pt-2 pr-4" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
