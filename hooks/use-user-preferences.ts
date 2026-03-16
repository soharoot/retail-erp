"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/supabase/auth-context"
import type { UserPreferences } from "@/lib/types"
import { defaultUserPreferences } from "@/lib/types"

/**
 * Per-user appearance preferences hook.
 *
 * - Reads from localStorage immediately (instant, offline-friendly)
 * - Background-syncs with Supabase `user_preferences` table
 * - Saves to both localStorage and Supabase on change
 * - Falls back to defaults if no preferences found
 */
export function useUserPreferences(): [
  UserPreferences,
  (p: UserPreferences) => void,
  boolean,
] {
  const { user } = useAuth()
  const [prefs, setPrefsState] = useState<UserPreferences>(defaultUserPreferences)
  const [loading, setLoading] = useState(true)

  const cacheKey = user ? `erp-prefs-${user.id}` : "erp-prefs-guest"

  useEffect(() => {
    // 1. Load from localStorage immediately (zero-latency)
    try {
      const raw = localStorage.getItem(cacheKey)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<UserPreferences>
        setPrefsState({
          theme: parsed.theme ?? defaultUserPreferences.theme,
          interfaceStyle: parsed.interfaceStyle ?? defaultUserPreferences.interfaceStyle,
          dashboardLayout: parsed.dashboardLayout ?? defaultUserPreferences.dashboardLayout,
        })
        setLoading(false) // render immediately with cache
      }
    } catch {
      // ignore
    }

    if (!user) {
      setLoading(false)
      return
    }

    // 2. Fetch from Supabase in background (authoritative source)
    const supabase = createClient()
    Promise.resolve(
      supabase
        .from("user_preferences")
        .select("theme, interface_style, dashboard_layout")
        .eq("user_id", user.id)
        .maybeSingle()
    ).then(({ data, error }) => {
      if (!error && data) {
        const loaded: UserPreferences = {
          theme: (data.theme as UserPreferences["theme"]) ?? defaultUserPreferences.theme,
          interfaceStyle:
            (data.interface_style as UserPreferences["interfaceStyle"]) ??
            defaultUserPreferences.interfaceStyle,
          dashboardLayout:
            (data.dashboard_layout as UserPreferences["dashboardLayout"]) ??
            defaultUserPreferences.dashboardLayout,
        }
        setPrefsState(loaded)
        // Update cache with authoritative server data
        try {
          localStorage.setItem(cacheKey, JSON.stringify(loaded))
        } catch {
          // ignore
        }
      }
      setLoading(false)
    }).catch(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const setPrefs = useCallback(
    (newPrefs: UserPreferences) => {
      setPrefsState(newPrefs)

      // Save to localStorage immediately
      try {
        localStorage.setItem(cacheKey, JSON.stringify(newPrefs))
      } catch {
        // ignore
      }

      // Save to Supabase if authenticated (fire-and-forget)
      if (user) {
        const supabase = createClient()
        Promise.resolve(
          supabase
            .from("user_preferences")
            .upsert(
              {
                user_id: user.id,
                theme: newPrefs.theme,
                interface_style: newPrefs.interfaceStyle,
                dashboard_layout: newPrefs.dashboardLayout,
              },
              { onConflict: "user_id" }
            )
        ).then(() => {}).catch(() => {})
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, cacheKey]
  )

  return [prefs, setPrefs, loading]
}
