"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/supabase/auth-context"
import { useRBAC } from "@/lib/rbac/rbac-context"
import { type Settings, defaultSettings, toCamelCase, toSnakeCase } from "@/lib/types"

/**
 * Hook for org_settings table. Returns [settings, updateSettings, loading].
 * Auto-creates a settings row if none exists for the org.
 */
export function useSettings(): [Settings, (updates: Partial<Settings>) => Promise<void>, boolean] {
  const { user } = useAuth()
  const { orgId } = useRBAC()
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const supabase = useRef(createClient()).current
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (!user || !orgId || fetchedRef.current) return
    fetchedRef.current = true

    const fetch = async () => {
      setLoading(true)
      try {
        const { data, error } = await Promise.resolve(
          supabase.from("org_settings").select("*").eq("org_id", orgId).single()
        )

        if (error && error.code === "PGRST116") {
          // No row found — create default settings
          const { data: created } = await Promise.resolve(
            supabase
              .from("org_settings")
              .insert({ org_id: orgId })
              .select()
              .single()
          )
          if (created) {
            setSettings({ ...defaultSettings, ...toCamelCase<Settings>(created as Record<string, unknown>) })
          }
        } else if (data) {
          setSettings({ ...defaultSettings, ...toCamelCase<Settings>(data as Record<string, unknown>) })
        }
      } catch (err) {
        console.error("[useSettings] Error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetch()
  }, [user, orgId, supabase])

  // Reset on orgId change
  useEffect(() => {
    fetchedRef.current = false
  }, [orgId])

  const updateSettings = useCallback(
    async (updates: Partial<Settings>) => {
      if (!orgId) return

      // Optimistic update
      setSettings((prev) => ({ ...prev, ...updates }))

      const dbUpdates = toSnakeCase(updates as Record<string, unknown>)
      // Remove orgId from updates (it's the PK, shouldn't change)
      delete dbUpdates.org_id

      try {
        const { error } = await Promise.resolve(
          supabase.from("org_settings").update(dbUpdates).eq("org_id", orgId)
        )
        if (error) {
          console.error("[useSettings] Update error:", error)
        }
      } catch (err) {
        console.error("[useSettings] Update exception:", err)
      }
    },
    [orgId, supabase]
  )

  return [settings, updateSettings, loading]
}
