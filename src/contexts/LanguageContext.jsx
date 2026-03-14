import { createContext, useCallback, useContext, useState } from 'react'

import translations from '../data/translations'

const LANGUAGE_STORAGE_KEY = 'march-language'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(
    () => localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? 'en',
  )

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => {
      const next = prev === 'en' ? 'uk' : 'en'
      localStorage.setItem(LANGUAGE_STORAGE_KEY, next)
      return next
    })
  }, [])

  // t() returns the translated string for a key, falling back to the English
  // value and then the raw key so the UI never silently breaks.
  const t = useCallback(
    (key) => {
      return translations[language]?.[key] ?? translations.en[key] ?? key
    },
    [language],
  )

  return (
    <LanguageContext.Provider value={{ language, t, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(LanguageContext)

  if (!context) {
    throw new Error('useTranslation must be used inside a LanguageProvider')
  }

  return context
}
