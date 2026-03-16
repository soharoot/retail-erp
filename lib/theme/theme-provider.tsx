"use client"

import {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from "react"
import { useUserPreferences } from "@/hooks/use-user-preferences"
import type { UserPreferences } from "@/lib/types"
import { defaultUserPreferences } from "@/lib/types"

interface ThemeContextValue {
  preferences: UserPreferences
  setPreferences: (p: UserPreferences) => void
  loading: boolean
}

const ThemeContext = createContext<ThemeContextValue>({
  preferences: defaultUserPreferences,
  setPreferences: () => {},
  loading: true,
})

/**
 * ThemeProvider — reads user preferences and applies them to the DOM.
 *
 * - Adds/removes `dark` class on <html> for theme
 * - Adds `interface-compact` or `interface-comfortable` class for interface style
 * - Listens to system media query when theme = "system"
 * - Exposes preferences via context for settings page
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences, loading] = useUserPreferences()

  // ── Apply theme ──────────────────────────────────────────────
  useEffect(() => {
    const root = document.documentElement

    const applyTheme = (isDark: boolean) => {
      root.classList.toggle("dark", isDark)
    }

    if (preferences.theme === "dark") {
      applyTheme(true)
    } else if (preferences.theme === "light") {
      applyTheme(false)
    } else {
      // "system" — follow OS preference
      const mq = window.matchMedia("(prefers-color-scheme: dark)")
      applyTheme(mq.matches)

      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches)
      mq.addEventListener("change", handler)
      return () => mq.removeEventListener("change", handler)
    }
  }, [preferences.theme])

  // ── Apply interface style ────────────────────────────────────
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove("interface-compact", "interface-comfortable")
    if (preferences.interfaceStyle === "compact") {
      root.classList.add("interface-compact")
    } else if (preferences.interfaceStyle === "comfortable") {
      root.classList.add("interface-comfortable")
    }
  }, [preferences.interfaceStyle])

  return (
    <ThemeContext.Provider value={{ preferences, setPreferences, loading }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
