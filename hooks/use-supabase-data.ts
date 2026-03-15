"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/supabase/auth-context"
import { db, localDataKey } from "@/lib/offline/db"
import { onlineStatus } from "@/lib/offline/online-status"

/**
 * Offline-first drop-in replacement for useLocalStorage that syncs to Supabase.
 *
 * Read path:  IndexedDB first (instant) → background pull from Supabase
 * Write path: IndexedDB (immediate) → Supabase upsert if online, else pendingOps queue
 *
 * Falls back to localStorage if user is not authenticated.
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

  // ── Read path: IndexedDB first, then background Supabase pull ──
  useEffect(() => {
    if (!user) {
      // No user — try localStorage fallback
      try {
        const raw = window.localStorage.getItem(key)
        if (raw) setStoredValue(JSON.parse(raw) as T)
      } catch {
        // ignore
      }
      setIsLoaded(true)
      return
    }

    let cancelled = false

    async function load() {
      const oid = orgId
      if (!oid) {
        setIsLoaded(true)
        return
      }

      const lk = localDataKey(oid, key)

      // 1. Try IndexedDB first (instant)
      try {
        const cached = await db.localData.get(lk)
        if (cached && !cancelled) {
          setStoredValue(cached.data as T)
          setIsLoaded(true)
        }
      } catch {
        // IndexedDB not available — continue to Supabase
      }

      // 2. Background: pull from Supabase if online
      if (onlineStatus.isOnline) {
        try {
          const { data, error } = await supabase
            .from("user_data")
            .select("data, updated_at")
            .eq("org_id", oid)
            .eq("data_key", key)
            .maybeSingle()

          if (cancelled) return

          if (!error && data?.data !== undefined) {
            const serverTime = data.updated_at
              ? new Date(data.updated_at as string).getTime()
              : 0

            // Check if we have pending ops for this key (local wins in that case)
            const hasPending = await db.pendingOps
              .where("dataKey")
              .equals(key)
              .filter((op) => op.orgId === oid)
              .count()
              .catch(() => 0)

            if (hasPending === 0) {
              // No pending local changes — use server data
              const localRow = await db.localData.get(lk).catch(() => null)
              if (!localRow || serverTime > localRow.updatedAt) {
                if (!cancelled) setStoredValue(data.data as T)
                // Cache in IndexedDB
                await db.localData
                  .put({
                    key: lk,
                    orgId: oid,
                    dataKey: key,
                    data: data.data,
                    updatedAt: serverTime || Date.now(),
                    synced: true,
                  })
                  .catch(() => {})
              }
            }

            if (!cancelled) setIsLoaded(true)
          } else if (!error && !data) {
            // First time — auto-seed with initial value
            const upsertData: Record<string, unknown> = {
              user_id: user!.id,
              data_key: key,
              data: initialValue,
            }
            if (oid) upsertData.org_id = oid

            Promise.resolve(
              supabase
                .from("user_data")
                .upsert(upsertData, {
                  onConflict: oid ? "org_id,data_key" : "user_id,data_key",
                })
            ).catch(() => {})

            // Also cache the initial value in IndexedDB
            await db.localData
              .put({
                key: lk,
                orgId: oid,
                dataKey: key,
                data: initialValue,
                updatedAt: Date.now(),
                synced: true,
              })
              .catch(() => {})

            if (!cancelled) setIsLoaded(true)
          } else {
            // Error fetching from Supabase — use whatever we have
            if (!cancelled) setIsLoaded(true)
          }
        } catch {
          // Network error — use cached data (already loaded from IndexedDB above)
          if (!cancelled) setIsLoaded(true)
        }
      } else {
        // Offline — IndexedDB data was already loaded above
        if (!cancelled) setIsLoaded(true)
      }
    }

    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, user?.id, orgId])

  // ── Write path: IndexedDB + Supabase/pendingOps ──
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const newValue = value instanceof Function ? value(prev) : value
        const currentUser = userRef.current
        const currentOrgId = orgIdRef.current

        if (currentUser && currentOrgId) {
          const lk = localDataKey(currentOrgId, key)
          const now = Date.now()

          // 1. Write to IndexedDB immediately (always)
          db.localData
            .put({
              key: lk,
              orgId: currentOrgId,
              dataKey: key,
              data: newValue,
              updatedAt: now,
              synced: false,
            })
            .catch(() => {})

          // 2. If online → try Supabase upsert; if offline → queue in pendingOps
          if (onlineStatus.isOnline) {
            const upsertData: Record<string, unknown> = {
              user_id: currentUser.id,
              org_id: currentOrgId,
              data_key: key,
              data: newValue,
            }

            Promise.resolve(
              supabase
                .from("user_data")
                .upsert(upsertData, { onConflict: "org_id,data_key" })
            )
              .then(({ error }) => {
                if (error) {
                  // Supabase upsert failed — queue for later
                  console.warn(
                    `[useSupabaseData] Save failed for "${key}", queuing:`,
                    error.message
                  )
                  db.pendingOps
                    .add({
                      orgId: currentOrgId,
                      dataKey: key,
                      data: newValue,
                      timestamp: now,
                      retries: 0,
                    })
                    .catch(() => {})
                } else {
                  // Mark as synced in IndexedDB
                  db.localData.update(lk, { synced: true }).catch(() => {})
                }
              })
              .catch(() => {
                // Network error — queue for later
                db.pendingOps
                  .add({
                    orgId: currentOrgId,
                    dataKey: key,
                    data: newValue,
                    timestamp: now,
                    retries: 0,
                  })
                  .catch(() => {})
              })
          } else {
            // Offline — add to pending ops queue
            db.pendingOps
              .add({
                orgId: currentOrgId,
                dataKey: key,
                data: newValue,
                timestamp: now,
                retries: 0,
              })
              .catch(() => {})
          }
        } else if (currentUser) {
          // User exists but no orgId yet — fallback to direct Supabase
          const upsertData: Record<string, unknown> = {
            user_id: currentUser.id,
            data_key: key,
            data: newValue,
          }
          supabase
            .from("user_data")
            .upsert(upsertData, { onConflict: "user_id,data_key" })
            .then(({ error }) => {
              if (error) {
                console.error(
                  `[useSupabaseData] Save failed for "${key}":`,
                  error.message
                )
              }
            })
        } else {
          // No user — save to localStorage as fallback
          try {
            window.localStorage.setItem(key, JSON.stringify(newValue))
          } catch {
            // ignore
          }
        }

        return newValue
      })
    },
    [key, supabase]
  )

  return [isLoaded ? storedValue : initialValue, setValue]
}
