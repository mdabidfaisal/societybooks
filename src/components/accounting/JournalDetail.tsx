import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatDate } from '../../lib/utils'
import { Spinner } from '../ui/Spinner'
import { useTranslation } from 'react-i18next'

interface JournalDetailProps {
  entryId: string
}

interface MemberRef {
  name: string
  member_number: string
  reference: string
}

function first<T>(v: T | T[] | undefined | null): T | undefined {
  return Array.isArray(v) ? v[0] : (v ?? undefined)
}

export function JournalDetail({ entryId }: JournalDetailProps) {
  const { t } = useTranslation()
  const [lines, setLines] = useState<Record<string, unknown>[]>([])
  const [entry, setEntry] = useState<Record<string, unknown> | null>(null)
  const [member, setMember] = useState<MemberRef | null>(null)
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

      // Resolve the linked member from the source record (if any)
      if (entryData?.reference_id && entryData?.reference_table) {
        const refId = entryData.reference_id as string
        const refTable = entryData.reference_table as string
        if (refTable === 'savings_transactions') {
          const { data: tx } = await supabase
            .from('savings_transactions')
            .select(`
              savings_account_id,
              savings_accounts(account_number, members(name, member_number))
            `)
            .eq('id', refId)
            .maybeSingle()
          const acct = first(tx?.savings_accounts) as { account_number: string; members: unknown } | undefined
          const m = first(acct?.members) as { name: string; member_number: string } | undefined
          if (m?.name) {
            setMember({ name: m.name, member_number: m.member_number || '', reference: acct?.account_number || '' })
          }
        } else if (refTable === 'loans') {
          const { data: loan } = await supabase
            .from('loans')
            .select('loan_number, members(name, member_number)')
            .eq('id', refId)
            .maybeSingle()
          const l = loan as { loan_number: string; members: unknown } | null
          const m = first(l?.members) as { name: string; member_number: string } | undefined
          if (m?.name) {
            setMember({ name: m.name, member_number: m.member_number || '', reference: l?.loan_number || '' })
          }
        } else if (refTable === 'loan_transactions') {
          const { data: tx } = await supabase
            .from('loan_transactions')
            .select(`
              loan_id,
              loans(loan_number, members(name, member_number))
            `)
            .eq('id', refId)
            .maybeSingle()
          const loan = first(tx?.loans) as { loan_number: string; members: unknown } | undefined
          const m = first(loan?.members) as { name: string; member_number: string } | undefined
          if (m?.name) {
            setMember({ name: m.name, member_number: m.member_number || '', reference: loan?.loan_number || '' })
          }
        }
      }

      setLoading(false)
    }
    load()
  }, [entryId])

  if (loading) return <Spinner size="sm" />
  if (!entry) return <p className="text-sm text-gray-500">{t('accounting.entryNotFound')}</p>

  return (
    <div className="space-y-3">
      <div className="text-sm space-y-1">
        <div className="flex justify-between"><span className="text-gray-500">{t('accounting.entryNo')}</span><span className="font-mono font-medium">{entry.entry_number as string}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">{t('common.date')}</span><span>{formatDate(entry.entry_date as string)}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">{t('accounting.description')}</span><span className="font-medium">{entry.description as string}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">{t('common.type')}</span><span className="capitalize">{t(`txnType.${entry.entry_type as string}`, { defaultValue: (entry.entry_type as string).replace(/_/g, ' ') })}</span></div>
        {member && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('accounting.member')}</span>
              <span className="font-medium">
                {member.name}
                {member.member_number && <span className="text-gray-400 text-xs ml-1 font-mono">({member.member_number})</span>}
              </span>
            </div>
            {member.reference && (
              <div className="flex justify-between">
                <span className="text-gray-500">{t('accounting.accountLoan')}</span>
                <span className="font-mono font-medium">{member.reference}</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs font-medium text-gray-500 uppercase">
              <th className="pb-2 pr-4">{t('accounting.account')}</th>
              <th className="pb-2 pr-4 text-right">{t('accounting.debit')}</th>
              <th className="pb-2 pr-4 text-right">{t('accounting.credit')}</th>
              <th className="pb-2 pr-4">{t('accounting.note')}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => {
              const account = line.account as { account_code: string; account_name: string; account_type: string } | undefined
              return (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2 pr-4">
                    <span className="font-medium">{account?.account_name || t('loans.unknownMember')}</span>
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
              <td className="pt-2 pr-4">{t('common.total')}</td>
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
