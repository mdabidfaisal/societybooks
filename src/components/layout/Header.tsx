import { useEffect, useState } from 'react'
import { Menu, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { RoleBadge } from '../auth/RoleBadge'
import { LanguageToggle } from './LanguageToggle'
import { supabase } from '../../lib/supabase'
import { useTranslation } from 'react-i18next'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, role, samitiId, logout } = useAuth()
  const { t } = useTranslation()
  const [samitiName, setSamitiName] = useState('')

  useEffect(() => {
    if (!samitiId) return
    supabase.from('samiti_settings').select('samiti_name').eq('id', samitiId).single().then(({ data }) => {
      if (data) setSamitiName(data.samiti_name)
    })
  }, [samitiId])

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden text-gray-500 hover:text-gray-700 cursor-pointer">
          <Menu className="h-6 w-6" />
        </button>
        <div>
          <p className="text-sm font-semibold text-gray-900">{samitiName || t('layout.appName')}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-500">{user?.email}</span>
            <RoleBadge role={role || 'member'} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <LanguageToggle />
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">{t('auth.logout')}</span>
        </button>
      </div>
    </header>
  )
}
