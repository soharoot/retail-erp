import { createClient } from "@/lib/supabase/client"

type StatusCallback = (online: boolean) => void

/**
 * Two-layer online detection:
 * 1. navigator.onLine — instant but unreliable (misses captive portals)
 * 2. Supabase heartbeat — SELECT 1 every 30s to verify real connectivity
 *
 * Usage: singleton, initialised in OfflineProvider.
 */
class OnlineStatus {
  private _isOnline = true
  private _listeners = new Set<StatusCallback>()
  private _heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private _started = false

  get isOnline() {
    return this._isOnline
  }

  /** Start listening for network changes. Call once. */
  start() {
    if (this._started || typeof window === "undefined") return
    this._started = true

    this._isOnline = navigator.onLine

    window.addEventListener("online", this._handleBrowserOnline)
    window.addEventListener("offline", this._handleBrowserOffline)

    // Heartbeat: verify real Supabase connectivity every 30s
    this._heartbeatTimer = setInterval(() => {
      if (navigator.onLine) this._pingSupabase()
    }, 30_000)

    // Run first ping immediately
    if (navigator.onLine) this._pingSupabase()
  }

  /** Stop all listeners. */
  stop() {
    if (typeof window === "undefined") return
    window.removeEventListener("online", this._handleBrowserOnline)
    window.removeEventListener("offline", this._handleBrowserOffline)
    if (this._heartbeatTimer) clearInterval(this._heartbeatTimer)
    this._started = false
  }

  /** Subscribe to online/offline transitions. Returns unsubscribe fn. */
  subscribe(cb: StatusCallback): () => void {
    this._listeners.add(cb)
    return () => this._listeners.delete(cb)
  }

  /** Force a connectivity check right now. */
  async check(): Promise<boolean> {
    if (!navigator.onLine) {
      this._setOnline(false)
      return false
    }
    return this._pingSupabase()
  }

  /* ── internal ──────────────────────────────────────── */

  private _handleBrowserOnline = () => {
    // Browser says "online" — verify with heartbeat
    this._pingSupabase()
  }

  private _handleBrowserOffline = () => {
    this._setOnline(false)
  }

  private async _pingSupabase(): Promise<boolean> {
    try {
      const supabase = createClient()
      const { error } = await supabase.from("permissions").select("id").limit(1).maybeSingle()
      // any small table works; permissions is always seeded
      const ok = !error
      this._setOnline(ok)
      return ok
    } catch {
      this._setOnline(false)
      return false
    }
  }

  private _setOnline(value: boolean) {
    if (value === this._isOnline) return
    this._isOnline = value
    this._listeners.forEach((cb) => {
      try {
        cb(value)
      } catch {
        // listener errors must never break the status system
      }
    })
  }
}

/** Singleton instance */
export const onlineStatus = new OnlineStatus()
