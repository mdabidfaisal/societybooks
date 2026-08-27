import { useParams, useNavigate } from 'react-router-dom'
import { useMembers } from '../hooks/useMembers'
import { useAuth } from '../hooks/useAuth'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Spinner } from '../components/ui/Spinner'
import { MemberProfile } from '../components/members/MemberProfile'
import { MemberExitForm } from '../components/members/MemberExitForm'
import { useUIStore } from '../store/uiStore'
import { formatCurrency, formatDate } from '../lib/utils'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Plus, Wallet, ToggleLeft, ToggleRight, Gift } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { ReportExportButtons } from '../components/reports/ReportExportButtons'
import type { SavingsAccountData } from '../hooks/useSavings'

export default function MemberDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { members, loading: membersLoading, toggleMemberStatus, fetchMembers } = useMembers()
  const { role } = useAuth()
  const activeModal = useUIStore((s) => s.activeModal)
  const openModal = useUIStore((s) => s.openModal)
  const modalData = useUIStore((s) => s.modalData) as { memberId: string; memberName: string } | null

  const [savingsAccounts, setSavingsAccounts] = useState<(SavingsAccountData & { balance: number })[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [loans, setLoans] = useState<{ id: string; loan_number: string; amount: number; status: string }[]>([])
  const [opening, setOpening] = useState(false)
  const [profitDistros, setProfitDistros] = useState<{ distro_num: string; date: string; amount: number }[]>([])

  const member = members.find((m) => m.id === id)

  const loadAccounts = useCallback(async () => {
    if (!id) return
    setLoadingAccounts(true)
    const { data: accts } = await supabase
      .from('savings_accounts')
      .select('*')
      .eq('member_id', id)
      .order('created_at', { ascending: false })
    if (!accts) { setLoadingAccounts(false); return }
    const withBal: (SavingsAccountData & { balance: number })[] = []
    for (const acct of accts as SavingsAccountData[]) {
      const { data: tx } = await supabase
        .from('savings_transactions')
        .select('balance_after')
        .eq('savings_account_id', acct.id)
        .order('created_at', { ascending: false })
        .limit(1)
      withBal.push({
        ...acct,
        balance: (tx && tx.length > 0) ? (tx[0] as { balance_after: number }).balance_after : 0,
      })
    }
    setSavingsAccounts(withBal)
    setLoadingAccounts(false)
  }, [id])

  useEffect(() => {
    loadAccounts()
    if (!id) return
    supabase.from('loans')
      .select('id, loan_number, amount, status')
      .eq('member_id', id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setLoans(data as { id: string; loan_number: string; amount: number; status: string }[]) })
    supabase.from('profit_distribution_items')
      .select('distribution_amount, profit_distribution_id')
      .eq('member_id', id)
      .then(async ({ data: items }) => {
        if (!items || items.length === 0) return
        const distroIds = items.map((i: { profit_distribution_id: string }) => i.profit_distribution_id)
        const { data: distros } = await supabase
          .from('profit_distributions')
          .select('id, distribution_number, distribution_date')
          .in('id', distroIds)
        const distroMap = new Map((distros || []).map((d: { id: string; distribution_number: string; distribution_date: string }) => [d.id, d]))
        setProfitDistros(items.map((i: { profit_distribution_id: string; distribution_amount: number }) => {
          const d = distroMap.get(i.profit_distribution_id)
          return { distro_num: d?.distribution_number || '', date: d?.distribution_date || '', amount: i.distribution_amount }
        }))
      })
  }, [id, loadAccounts])

  const handleOpenAccount = async () => {
    if (!id) return
    setOpening(true)
    const { error } = await supabase.from('savings_accounts').insert({
      samiti_id: member?.samiti_id,
      member_id: id,
      account_type: 'general',
      account_number: `SAV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
    } as never)
    setOpening(false)
    if (!error) loadAccounts()
  }

  if (membersLoading) return <Spinner size="lg" />
  if (!member) return <div className="text-center py-12 text-gray-500">{t('membership.notFound')}</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/members')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> {t('membership.backToMembers')}
        </Button>
        <div className="flex items-center gap-2">
          <ReportExportButtons
            filename={`member-${member.member_number}`}
            title={`${t('membership.profile')} - ${member.name}`}
            subtitle={`${t('membership.memberCode')}: ${member.member_number} · ${t('common.status')}: ${member.status} · ${t('membership.joinDate')}: ${formatDate(member.join_date)}`}
            headers={[t('membership.section'), t('membership.detail')]}
            rows={[
              [t('membership.memberCode'), member.member_number],
              [t('membership.fullName'), member.name],
              [t('membership.nameBangla'), member.name_bn || '-'],
              [t('membership.guardian'), member.guardian_name || '-'],
              [t('membership.motherName'), member.mother_name || '-'],
              [t('membership.spouse'), member.spouse_name || '-'],
              [t('membership.dateOfBirth'), member.date_of_birth ? formatDate(member.date_of_birth) : '-'],
              [t('membership.gender'), member.gender || '-'],
              [t('membership.bloodGroupLabel'), member.blood_group || '-'],
              [t('membership.maritalStatusLabel'), member.marital_status || '-'],
              [t('membership.nid'), member.nid || '-'],
              [t('membership.college'), member.college_name || '-'],
              [t('membership.occupation'), member.designation || '-'],
              [t('membership.department'), member.department || '-'],
              [t('membership.employeeId'), member.employee_id || '-'],
              [t('common.phone'), member.phone || '-'],
              [t('common.email'), member.email || '-'],
              [t('membership.presentAddress'), member.present_address || '-'],
              [t('membership.permanentAddress'), member.permanent_address || '-'],
              [t('membership.nomineeName'), `${member.nominee_name || '-'}${member.nominee_relation ? ` (${member.nominee_relation})` : ''}`],
              [t('membership.nomineePhone'), member.nominee_phone || '-'],
              [t('membership.bankName'), member.bank_name || '-'],
              [t('membership.bankAccountNumber'), member.bank_account_number || '-'],
              [t('membership.branchName'), member.branch_name || '-'],
              [t('membership.savingsAccountsCount'), String(savingsAccounts.length)],
              [t('savings.balance'), formatCurrency(savingsAccounts.reduce((s, a) => s + a.balance, 0))],
              [t('membership.loansTitle'), String(loans.length)],
              [t('membership.totalLoanAmount'), formatCurrency(loans.reduce((s, l) => s + l.amount, 0))],
              [t('membership.profitReceived'), formatCurrency(profitDistros.reduce((s, p) => s + p.amount, 0))],
              [t('common.status'), member.status],
              [t('membership.joinDate'), formatDate(member.join_date)],
            ]}
          />
          <Badge variant={member.status === 'active' ? 'success' : member.status === 'inactive' ? 'warning' : 'danger'}>
            {t(`membership.${member.status}`)}
          </Badge>
          {role !== 'member' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => { await toggleMemberStatus(member.id, member.status); fetchMembers() }}
              title={member.status === 'active' ? t('common.inactive') : t('common.active')}
            >
              {member.status === 'active'
                ? <><ToggleRight className="h-4 w-4 text-green-600 mr-1" /> {t('common.inactive')}</>
                : <><ToggleLeft className="h-4 w-4 text-gray-400 mr-1" /> {t('common.active')}</>
              }
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <MemberProfile member={member} />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card title={
            <div className="flex items-center justify-between w-full">
              <span>{t('membership.savingsAccountsTitle')}</span>
              <Button size="sm" onClick={handleOpenAccount} loading={opening}>
                <Plus className="h-4 w-4 mr-1" /> {t('membership.openAccount')}
              </Button>
            </div>
          }>
            {loadingAccounts ? (
              <Spinner size="sm" />
            ) : savingsAccounts.length === 0 ? (
              <p className="text-sm text-gray-500">{t('membership.noSavingsAccounts')}</p>
            ) : (
              <div className="space-y-3">
                {savingsAccounts.map((acct) => (
                  <div key={acct.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{acct.account_number}</span>
                      <Badge variant="default">{acct.account_type}</Badge>
                    </div>
                    <p className="text-lg font-bold">{formatCurrency(acct.balance)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title={t('membership.loansTitle')}>
            {loans.length === 0 ? (
              <p className="text-sm text-gray-500">{t('membership.noLoansFound')}</p>
            ) : (
              <div className="space-y-2">
                {loans.map((ln) => (
                  <div key={ln.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100" onClick={() => navigate(`/loans/${ln.id}`)}>
                    <div>
                      <p className="font-medium text-sm">{ln.loan_number}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(ln.amount)}</p>
                    </div>
                    <Badge variant={ln.status === 'disbursed' ? 'success' : ln.status === 'pending' ? 'warning' : ln.status === 'closed' ? 'default' : 'danger'}>{t(`status.${ln.status}`)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title={t('membership.profitDistributionsTitle')}>
            {profitDistros.length === 0 ? (
              <p className="text-sm text-gray-500">{t('membership.noProfitDistributions')}</p>
            ) : (
              <div className="space-y-2">
                {profitDistros.map((pd, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-purple-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{pd.distro_num}</p>
                        <p className="text-xs text-gray-500">{formatDate(pd.date)}</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-green-700">{formatCurrency(pd.amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {activeModal === 'exit-member' && modalData && (
        <Modal title={t('membership.processExit')}>
          <MemberExitForm memberId={modalData.memberId} memberName={modalData.memberName} />
        </Modal>
      )}
    </div>
  )
}
