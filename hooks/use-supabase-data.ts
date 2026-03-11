"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/supabase/auth-context"

/**
 * Drop-in replacement for useLocalStorage that syncs data to Supabase.
 * Exact same signature: [value, setValue]
 *
 * Data is stored in a single `user_data` table using the key as identifier.
 * Each user's data is isolated via Row Level Security.
 */
export function useSupabaseData<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue)
  const [isLoaded, setIsLoaded] = useState(false)
  const supabase = createClient()
  const { user } = useAuth()

  // Keep a stable ref to the user so setValue callback doesn't need user as dep
  const userRef = useRef(user)
  useEffect(() => {
    userRef.current = user
  }, [user])

  // Fetch from Supabase when user becomes available
  useEffect(() => {
    if (!user) {
      setIsLoaded(true)
      return
    }

    supabase
      .from("user_data")
      .select("data")
      .eq("user_id", user.id)
      .eq("data_key", key)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data?.data !== undefined) {
          // Existing data found - use it
          setStoredValue(data.data as T)
        } else if (!error && !data) {
          // First time this user visits this module - auto-seed with initial mock data
          supabase
            .from("user_data")
            .upsert(
              { user_id: user!.id, data_key: key, data: initialValue },
              { onConflict: "user_id,data_key" }
            )
            .then(({ error: seedError }) => {
              if (seedError) {
                console.warn(`[useSupabaseData] Could not seed "${key}":`, seedError.message)
              }
            })
        }
        setIsLoaded(true)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, user?.id])

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const newValue = value instanceof Function ? value(prev) : value
        const currentUser = userRef.current

        if (currentUser) {
          // Fire-and-forget upsert to Supabase
          supabase
            .from("user_data")
            .upsert(
              {
                user_id: currentUser.id,
                data_key: key,
                data: newValue,
              },
              { onConflict: "user_id,data_key" }
            )
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
