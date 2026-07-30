import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useSamitiConfig() {
  const { samitiId } = useAuth()
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!samitiId) return
    supabase.from('samiti_settings').select('*').eq('id', samitiId).single().then(({ data }) => {
      if (data) setSettings(data as Record<string, unknown>)
      setLoading(false)
    })
  }, [samitiId])

  const updateSettings = async (updates: Record<string, unknown>) => {
    if (!samitiId) return { data: null, error: new Error('No samiti ID') }
    const { data, error } = await supabase
      .from('samiti_settings')
      .update(updates)
      .eq('id', samitiId)
      .select()
      .single()
    if (!error && data) setSettings(data as Record<string, unknown>)
    return { data, error }
  }

  return { settings, loading, updateSettings }
}
