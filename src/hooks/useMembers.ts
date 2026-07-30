import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { generateMemberNumber } from '../lib/utils'

export interface MemberData {
  id: string
  samiti_id: string
  member_number: string
  status: 'active' | 'inactive' | 'exited'

  name: string
  name_bn: string | null
  guardian_name: string | null
  mother_name: string | null
  spouse_name: string | null
  date_of_birth: string | null
  gender: string | null
  blood_group: string | null
  marital_status: string | null
  nid: string | null

  college_name: string | null
  college_code: string | null
  designation: string | null
  department: string | null
  employee_id: string | null
  mpo_index_number: string | null
  mpo_enrolled_date: string | null
  govt_service_date: string | null
  present_college_joining_date: string | null
  retirement_date: string | null
  employment_status: string | null

  phone: string | null
  email: string | null
  present_address: string | null
  permanent_address: string | null

  nominee_name: string | null
  nominee_relation: string | null
  nominee_nid: string | null
  nominee_phone: string | null
  nominee_address: string | null

  bank_name: string | null
  bank_account_number: string | null
  branch_name: string | null
  routing_number: string | null

  qualification: string | null
  remarks: string | null
  photo_url: string | null
  join_date: string
  exit_date: string | null
  exit_settlement_amount: number | null
  exit_note: string | null
  created_at: string
  updated_at: string
}

export type MemberCreateData = Omit<MemberData, 'id' | 'samiti_id' | 'member_number' | 'status' | 'join_date' | 'exit_date' | 'exit_settlement_amount' | 'exit_note' | 'created_at' | 'updated_at' | 'photo_url'>

export function useMembers() {
  const { samitiId, role } = useAuth()
  const [members, setMembers] = useState<MemberData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    if (!samitiId) {
      setError('No samiti ID found. Check user metadata.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    let query = supabase.from('members').select('*')

    if (role === 'member') {
      const { data: { user } } = await supabase.auth.getUser()
      const memberId = user?.user_metadata?.member_id
      if (memberId) {
        query = query.eq('id', memberId)
      }
    } else {
      query = query.eq('samiti_id', samitiId)
    }

    const { data, error: fetchError } = await query.order('created_at', { ascending: false })
    if (fetchError) {
      setError(fetchError.message)
    } else if (data) {
      setMembers(data as MemberData[])
    }
    setLoading(false)
  }, [samitiId, role])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const createMember = async (memberData: Partial<MemberCreateData>) => {
    const { data, error } = await supabase.from('members').insert({
      samiti_id: samitiId,
      member_number: generateMemberNumber(),
      ...memberData,
    } as never).select().single()
    if (!error && data) {
      setMembers(prev => [data as MemberData, ...prev])
    }
    return { data: data as MemberData | null, error }
  }

  const updateMember = async (id: string, updates: Partial<MemberData>) => {
    const { data, error } = await supabase.from('members').update(updates).eq('id', id).select().single()
    if (!error && data) {
      setMembers(prev => prev.map(m => m.id === id ? data as MemberData : m))
    }
    return { data: data as MemberData | null, error }
  }

  const toggleMemberStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    return updateMember(id, { status: newStatus as 'active' | 'inactive' })
  }

  const exitMember = async (id: string, settlementAmount: number, note: string) => {
    const updates = {
      status: 'exited',
      exit_date: new Date().toISOString().split('T')[0],
      exit_settlement_amount: settlementAmount,
      exit_note: note,
    }
    const { data, error } = await supabase.from('members').update(updates).eq('id', id).select().single()
    if (!error && data) {
      setMembers(prev => prev.map(m => m.id === id ? data as MemberData : m))
    }
    return { data: data as MemberData | null, error }
  }

  return { members, loading, error, fetchMembers, createMember, updateMember, toggleMemberStatus, exitMember }
}
