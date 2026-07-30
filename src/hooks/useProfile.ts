import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useProfile() {
  const { user } = useAuth()
  const [member, setMember] = useState<Record<string, unknown> | null>(null)
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    const memberId = user.user_metadata?.member_id
    const samitiId = user.user_metadata?.samiti_id

    const load = async () => {
      if (memberId) {
        const { data } = await supabase.from('members').select('*').eq('id', memberId).single()
        if (data) setMember(data as Record<string, unknown>)
      }
      if (samitiId) {
        const { data } = await supabase.from('samiti_settings').select('*').eq('id', samitiId).single()
        if (data) setSettings(data as Record<string, unknown>)
      }
      setLoading(false)
    }
    load()
  }, [user])

  return { member, settings, loading }
}
