"use client"

import { useOffline } from "./offline-provider"

/**
 * Convenience hook for components that only need the offline indicator state.
 * Re-exports a subset of the OfflineContext for simpler consumption.
 */
export function useOfflineIndicator() {
  const { isOnline, pendingCount, isSyncing } = useOffline()
  return { isOnline, pendingCount, isSyncing }
}
