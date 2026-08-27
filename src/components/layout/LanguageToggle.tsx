import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'
import { getStoredLanguage, setStoredLanguage, type Language } from '../../i18n'

export function LanguageToggle() {
  const { i18n } = useTranslation()

  const currentLang: Language = getStoredLanguage()

  const toggle = () => {
    const next: Language = currentLang === 'en' ? 'bn' : 'en'
    setStoredLanguage(next)
    i18n.changeLanguage(next)
  }

  return (
    <button
      onClick={toggle}
      title={currentLang === 'en' ? 'বাংলা' : 'English'}
      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
    >
      <Languages className="h-4 w-4" />
      <span className="hidden sm:inline">{currentLang === 'en' ? 'বাংলা' : 'English'}</span>
    </button>
  )
}
