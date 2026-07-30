import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string | null>(null)
  const [samitiId, setSamitiId] = useState<string | null>(null)
  const [memberId, setMemberId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setRole(session?.user?.user_metadata?.role ?? null)
      setSamitiId(session?.user?.user_metadata?.samiti_id ?? null)
      setMemberId(session?.user?.user_metadata?.member_id ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setRole(session?.user?.user_metadata?.role ?? null)
      setSamitiId(session?.user?.user_metadata?.samiti_id ?? null)
      setMemberId(session?.user?.user_metadata?.member_id ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
  }

  return { user, role, samitiId, memberId, loading, logout }
}
