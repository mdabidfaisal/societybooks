import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en } from './en'
import { bn } from './bn'

const STORAGE_KEY = 'samiti_lang'

export type Language = 'en' | 'bn'

export function getStoredLanguage(): Language {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'bn' ? 'bn' : 'en'
}

export function setStoredLanguage(lang: Language) {
  localStorage.setItem(STORAGE_KEY, lang)
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    bn: { translation: bn },
  },
  lng: getStoredLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
