import { useEffect, useState, useRef } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Spinner } from '../ui/Spinner'
import { supabase } from '../../lib/supabase'
import type { Role } from '../../config/constants'

interface ProtectedRouteProps {
  allowedRoles: Role[]
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, role, samitiId, memberId, loading } = useAuth()
  const [checkingActive, setCheckingActive] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const checkAccess = async () => {
    if (!user || !samitiId || role === 'super_admin') {
      setCheckingActive(false)
      return
    }

    const { data: samiti } = await supabase
      .from('samiti_settings')
      .select('is_active')
      .eq('id', samitiId)
      .single()

    if (samiti && !samiti.is_active) {
      await supabase.auth.signOut()
      window.location.href = '/login?deactivated=1'
      return
    }

    if (role === 'member' && memberId) {
      const { data: member } = await supabase
        .from('members')
        .select('status')
        .eq('id', memberId)
        .single()

      if (member && member.status !== 'active') {
        await supabase.auth.signOut()
        window.location.href = '/login?member_inactive=1'
        return
      }
    }

    setCheckingActive(false)
  }

  useEffect(() => {
    checkAccess()

    intervalRef.current = setInterval(checkAccess, 60000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [user, samitiId, role, memberId])

  if (loading || checkingActive) return <Spinner size="lg" />
  if (!user) return <Navigate to="/login" replace />
  if (!role || !allowedRoles.includes(role as Role)) return <Navigate to="/dashboard" replace />

  return <Outlet />
}
