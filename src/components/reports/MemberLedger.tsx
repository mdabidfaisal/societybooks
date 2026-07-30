import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { TransactionList } from '../savings/TransactionList'

export function MemberLedger() {
  const [memberId, setMemberId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [members, setMembers] = useState<{ id: string; name: string; member_number: string }[]>([])
  const [accounts, setAccounts] = useState<{ id: string; account_number: string }[]>([])

  const loadMembers = async (search: string) => {
    const { data } = await supabase
      .from('members')
      .select('id, name, member_number')
      .ilike('name', `%${search}%`)
      .limit(20)
    if (data) setMembers(data as { id: string; name: string; member_number: string }[])
  }

  const loadAccounts = async (mId: string) => {
    const { data } = await supabase.from('savings_accounts').select('id, account_number').eq('member_id', mId)
    if (data) setAccounts(data as { id: string; account_number: string }[])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Select
            label="Select Member"
            placeholder="Search and select..."
            options={members.map((m) => ({ value: m.id, label: `${m.name} (${m.member_number})` }))}
            value={memberId}
            onChange={(e) => {
              setMemberId(e.target.value)
              loadAccounts(e.target.value)
            }}
          />
        </div>
        <Button size="sm" variant="secondary" onClick={() => loadMembers('')}>Load Members</Button>
      </div>

      {accounts.length > 0 && (
        <Select
          label="Select Account"
          placeholder="Choose account..."
          options={accounts.map((a) => ({ value: a.id, label: a.account_number }))}
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
        />
      )}

      {accountId && (
        <Card title="Transaction History">
          <TransactionList accountId={accountId} />
        </Card>
      )}
    </div>
  )
}
