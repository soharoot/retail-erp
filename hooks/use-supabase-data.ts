"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/supabase/auth-context"

/**
 * Drop-in replacement for useLocalStorage that syncs data to Supabase.
 * Exact same signature: [value, setValue]
 *
 * Data is stored in `user_data` table keyed by (org_id, data_key).
 * All members of the same organization share the same data.
 * Falls back to (user_id, data_key) for backward compatibility.
 */
export function useSupabaseData<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue)
  const [isLoaded, setIsLoaded] = useState(false)
  const supabase = createClient()
  const { user, orgId } = useAuth()

  // Keep stable refs so setValue callback doesn't need user/orgId as deps
  const userRef = useRef(user)
  const orgIdRef = useRef(orgId)
  useEffect(() => {
    userRef.current = user
    orgIdRef.current = orgId
  }, [user, orgId])

  // Fetch from Supabase when user/org becomes available
  useEffect(() => {
    if (!user) {
      setIsLoaded(true)
      return
    }

    // Prefer org_id query (multi-tenant), fall back to user_id
    const query = orgId
      ? supabase
          .from("user_data")
          .select("data")
          .eq("org_id", orgId)
          .eq("data_key", key)
          .maybeSingle()
      : supabase
          .from("user_data")
          .select("data")
          .eq("user_id", user.id)
          .eq("data_key", key)
          .maybeSingle()

    query.then(({ data, error }) => {
      if (!error && data?.data !== undefined) {
        setStoredValue(data.data as T)
      } else if (!error && !data) {
        // First time — auto-seed with initial value
        const upsertData: Record<string, unknown> = {
          user_id: user!.id,
          data_key: key,
          data: initialValue,
        }
        if (orgId) upsertData.org_id = orgId

        supabase
          .from("user_data")
          .upsert(upsertData, {
            onConflict: orgId ? "org_id,data_key" : "user_id,data_key",
          })
          .then(({ error: seedError }) => {
            if (seedError) {
              console.warn(`[useSupabaseData] Could not seed "${key}":`, seedError.message)
            }
          })
      }
      setIsLoaded(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, user?.id, orgId])

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const newValue = value instanceof Function ? value(prev) : value
        const currentUser = userRef.current
        const currentOrgId = orgIdRef.current

        if (currentUser) {
          const upsertData: Record<string, unknown> = {
            user_id: currentUser.id,
            data_key: key,
            data: newValue,
          }
          if (currentOrgId) upsertData.org_id = currentOrgId

          // Fire-and-forget upsert to Supabase
          supabase
            .from("user_data")
            .upsert(upsertData, {
              onConflict: currentOrgId ? "org_id,data_key" : "user_id,data_key",
            })
            .then(({ error }) => {
              if (error) {
                console.error(`[useSupabaseData] Save failed for "${key}":`, error.message)
              }
            })
        } else {
          // Fallback: save to localStorage if user not available
          try {
            window.localStorage.setItem(key, JSON.stringify(newValue))
          } catch {
            // ignore
          }
        }

        return newValue
      })
    },
    [key]
  )

  return [isLoaded ? storedValue : initialValue, setValue]
}
