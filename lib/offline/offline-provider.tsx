"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import { onlineStatus } from "./online-status"
import { syncEngine } from "./sync-engine"

interface OfflineContextValue {
  /** Whether the app can reach Supabase right now */
  isOnline: boolean
  /** Number of pending writes + pending logs waiting to sync */
  pendingCount: number
  /** Whether a sync cycle is in progress */
  isSyncing: boolean
  /** Manually trigger a sync cycle */
  triggerSync: () => Promise<void>
}

const OfflineContext = createContext<OfflineContextValue>({
  isOnline: true,
  pendingCount: 0,
  isSyncing: false,
  triggerSync: async () => {},
})

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    // Start the online-status watcher
    onlineStatus.start()
    setIsOnline(onlineStatus.isOnline)

    const unsubStatus = onlineStatus.subscribe((online) => {
      setIsOnline(online)
    })

    // Start the sync engine (listens for online transitions)
    syncEngine.start()

    const unsubSync = syncEngine.subscribe((event) => {
      if (event.type === "start") setIsSyncing(true)
      if (event.type === "done" || event.type === "error") setIsSyncing(false)
      setPendingCount(event.pendingCount)
    })

    // Get initial pending count
    syncEngine.pendingCount().then(setPendingCount)

    return () => {
      unsubStatus()
      unsubSync()
      syncEngine.stop()
      onlineStatus.stop()
    }
  }, [])

  const triggerSync = useCallback(async () => {
    await syncEngine.sync()
    const count = await syncEngine.pendingCount()
    setPendingCount(count)
  }, [])

  /** Re-check pending count periodically (every 5s) so UI stays fresh */
  useEffect(() => {
    const timer = setInterval(async () => {
      const count = await syncEngine.pendingCount()
      setPendingCount(count)
    }, 5_000)
    return () => clearInterval(timer)
  }, [])

  return (
    <OfflineContext.Provider
      value={{ isOnline, pendingCount, isSyncing, triggerSync }}
    >
      {children}
    </OfflineContext.Provider>
  )
}

export function useOffline() {
  return useContext(OfflineContext)
}
