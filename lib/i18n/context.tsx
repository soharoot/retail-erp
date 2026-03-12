"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { defaultSettings, type Settings } from "@/lib/types"
import { translations, resolveKey, type Language } from "./translations"
import { setCurrency } from "@/lib/utils"

interface I18nContextValue {
  language: Language
  dir: "ltr" | "rtl"
  t: (key: string) => string
  setLanguage: (lang: Language) => void
}

const I18nContext = createContext<I18nContextValue>({
  language: "en",
  dir: "ltr",
  t: (key) => key,
  setLanguage: () => {},
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useSupabaseData<Settings>(
    "erp-settings",
    defaultSettings
  )

  const language: Language =
    (settings.language as Language) in translations
      ? (settings.language as Language)
      : "en"

  const dir: "ltr" | "rtl" = language === "ar" ? "rtl" : "ltr"

  // Keep <html lang> and <html dir> in sync without a server-component rewrite
  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = dir
  }, [language, dir])

  // Keep formatCurrency in sync with settings.currency across all pages
  useEffect(() => {
    setCurrency(settings.currency || "USD")
  }, [settings.currency])

  const t = useMemo(() => {
    const langObj = translations[language] as Record<string, unknown>
    return (key: string): string => resolveKey(langObj, key)
  }, [language])

  const setLanguage = (lang: Language) => {
    setSettings({ ...settings, language: lang })
  }

  return (
    <I18nContext.Provider value={{ language, dir, t, setLanguage }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
