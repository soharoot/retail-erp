"use client"

import { Wifi, WifiOff, RefreshCw } from "lucide-react"
import { useOffline } from "@/lib/offline/offline-provider"

/**
 * Compact offline/online indicator for the header bar.
 * - Online: small green dot (or hidden)
 * - Offline: yellow banner with pending count
 * - Syncing: spinning refresh icon
 */
export function OfflineIndicator() {
  const { isOnline, pendingCount, isSyncing, triggerSync } = useOffline()

  // Online with nothing pending — show nothing (clean header)
  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null
  }

  // Syncing state
  if (isSyncing) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        <span>Syncing…</span>
      </div>
    )
  }

  // Online but has pending items (sync in progress or waiting)
  if (isOnline && pendingCount > 0) {
    return (
      <button
        onClick={() => triggerSync()}
        className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
        title="Click to sync pending changes"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        <span>{pendingCount} pending</span>
      </button>
    )
  }

  // Offline
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700">
      <WifiOff className="h-3.5 w-3.5" />
      <span>
        Offline{pendingCount > 0 ? ` · ${pendingCount} pending` : ""}
      </span>
    </div>
  )
}
