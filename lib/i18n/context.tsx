"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react"
import { translations, resolveKey } from "./translations"
import { setCurrency } from "@/lib/utils"

interface I18nContextValue {
  language: "fr"
  dir: "ltr"
  t: (key: string) => string
  setLanguage: (lang: string) => void
}

const I18nContext = createContext<I18nContextValue>({
  language: "fr",
  dir: "ltr",
  t: (key) => key,
  setLanguage: () => {},
})

export function I18nProvider({ children }: { children: ReactNode }) {
  // Force French language and DZD currency for Algeria
  const language = "fr" as const
  const dir = "ltr" as const

  // Keep <html lang> in sync
  useEffect(() => {
    document.documentElement.lang = "fr"
    document.documentElement.dir = "ltr"
  }, [])

  // Force DZD currency
  useEffect(() => {
    setCurrency("DZD")
  }, [])

  const t = useMemo(() => {
    const langObj = translations.fr as Record<string, unknown>
    return (key: string): string => resolveKey(langObj, key)
  }, [])

  // setLanguage is a no-op (French only)
  const setLanguage = () => {}

  return (
    <I18nContext.Provider value={{ language, dir, t, setLanguage }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
