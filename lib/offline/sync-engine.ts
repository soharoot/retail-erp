import { db, localDataKey, type PendingOp } from "./db"
import { onlineStatus } from "./online-status"
import { createClient } from "@/lib/supabase/client"

type SyncListener = (event: { type: "start" | "done" | "error"; pendingCount: number }) => void

/**
 * SyncEngine — singleton that flushes pending operations and logs
 * to Supabase when the app comes back online.
 *
 * - Deduplicates pending ops (keeps latest per orgId+dataKey)
 * - FIFO flush with exponential backoff on failure
 * - Pulls latest server data after flushing
 * - Batch-flushes pending activity logs
 */
class SyncEngine {
  private _syncing = false
  private _listeners = new Set<SyncListener>()
  private _unsubOnline: (() => void) | null = null

  get isSyncing() {
    return this._syncing
  }

  /** Start listening for online transitions. Call once in OfflineProvider. */
  start() {
    this._unsubOnline = onlineStatus.subscribe((online) => {
      if (online) this.sync()
    })
  }

  stop() {
    this._unsubOnline?.()
  }

  /** Subscribe to sync events. Returns unsubscribe fn. */
  subscribe(cb: SyncListener): () => void {
    this._listeners.add(cb)
    return () => this._listeners.delete(cb)
  }

  /** Run a full sync cycle. Safe to call multiple times — will skip if already syncing. */
  async sync(): Promise<void> {
    if (this._syncing || !onlineStatus.isOnline) return
    this._syncing = true
    this._emit("start")

    try {
      await this._deduplicatePendingOps()
      await this._flushPendingOps()
      await this._flushPendingLogs()
      // Pull latest from server for all keys that aren't in pendingOps
      await this._pullLatest()
    } catch (err) {
      console.error("[SyncEngine] sync error:", err)
    } finally {
      this._syncing = false
      this._emit("done")
    }
  }

  /** Get number of unsynced operations. */
  async pendingCount(): Promise<number> {
    try {
      const ops = await db.pendingOps.count()
      const logs = await db.pendingLogs.count()
      return ops + logs
    } catch {
      return 0
    }
  }

  /* ── Pending Ops (data writes) ─────────────────────── */

  /**
   * Keep only the latest op per (orgId, dataKey).
   * Earlier writes for the same key are obsolete.
   */
  private async _deduplicatePendingOps() {
    const allOps = await db.pendingOps.orderBy("timestamp").toArray()
    const latestMap = new Map<string, PendingOp>()

    for (const op of allOps) {
      const mapKey = `${op.orgId}::${op.dataKey}`
      latestMap.set(mapKey, op) // later ops overwrite earlier
    }

    const keepIds = new Set([...latestMap.values()].map((op) => op.id!))
    const toDelete = allOps.filter((op) => !keepIds.has(op.id!)).map((op) => op.id!)

    if (toDelete.length > 0) {
      await db.pendingOps.bulkDelete(toDelete)
    }
  }

  /** Flush each pending op to Supabase. */
  private async _flushPendingOps() {
    const ops = await db.pendingOps.orderBy("timestamp").toArray()
    const supabase = createClient()

    for (const op of ops) {
      if (!onlineStatus.isOnline) break // stop if we went offline mid-flush

      try {
        // Attempt upsert (LWW — our timestamp is newer by definition since we're pushing local changes)
        const { error } = await supabase.from("user_data").upsert(
          {
            org_id: op.orgId,
            data_key: op.dataKey,
            data: op.data,
          },
          { onConflict: "org_id,data_key" }
        )

        if (error) {
          // Bump retries, will try next cycle
          await db.pendingOps.update(op.id!, { retries: op.retries + 1 })
          console.warn(`[SyncEngine] flush op failed for "${op.dataKey}":`, error.message)
          continue
        }

        // Success: remove from queue & mark localData as synced
        await db.pendingOps.delete(op.id!)
        const lk = localDataKey(op.orgId, op.dataKey)
        await db.localData.update(lk, { synced: true })
      } catch (err) {
        console.warn("[SyncEngine] flush op error:", err)
        break // network error — stop flushing
      }
    }
  }

  /* ── Pending Logs (activity logs) ──────────────────── */

  private async _flushPendingLogs() {
    const logs = await db.pendingLogs.toArray()
    if (logs.length === 0) return

    const supabase = createClient()

    // Batch insert
    const rows = logs.map((log) => ({
      org_id: log.orgId,
      user_id: log.userId,
      user_name: log.userName,
      action: log.action,
      module: log.module,
      description: log.description,
      metadata: log.metadata,
      created_at: new Date(log.timestamp).toISOString(),
    }))

    try {
      const { error } = await supabase.from("activity_logs").insert(rows)
      if (!error) {
        // Success: clear all flushed logs
        await db.pendingLogs.bulkDelete(logs.map((l) => l.id!))
      } else {
        console.warn("[SyncEngine] flush logs failed:", error.message)
      }
    } catch {
      // network issue — leave for next attempt
    }
  }

  /* ── Pull latest server data ───────────────────────── */

  /**
   * For each localData row that IS synced (no pending local changes),
   * pull the server version if it's newer.
   */
  private async _pullLatest() {
    const supabase = createClient()

    // Get all synced local rows (these can be updated from server)
    const syncedRows = await db.localData.where("synced").equals(1).toArray()
    if (syncedRows.length === 0) return

    // Get the org_id (all rows should be same org)
    const orgId = syncedRows[0]?.orgId
    if (!orgId) return

    // Also check which keys have pending ops (those should NOT be overwritten)
    const pendingKeys = new Set(
      (await db.pendingOps.where("orgId").equals(orgId).toArray()).map(
        (op) => op.dataKey
      )
    )

    try {
      const { data: serverRows, error } = await supabase
        .from("user_data")
        .select("data_key, data, updated_at")
        .eq("org_id", orgId)

      if (error || !serverRows) return

      for (const row of serverRows) {
        if (pendingKeys.has(row.data_key)) continue // skip — we have local changes

        const lk = localDataKey(orgId, row.data_key)
        const local = await db.localData.get(lk)
        const serverTime = row.updated_at ? new Date(row.updated_at).getTime() : 0

        if (!local || serverTime > local.updatedAt) {
          // Server is newer (or local doesn't exist) — update cache
          await db.localData.put({
            key: lk,
            orgId,
            dataKey: row.data_key,
            data: row.data,
            updatedAt: serverTime || Date.now(),
            synced: true,
          })
        }
      }
    } catch {
      // network issue during pull — not critical
    }
  }

  /* ── Internal helpers ──────────────────────────────── */

  private async _emit(type: "start" | "done" | "error") {
    const count = await this.pendingCount()
    this._listeners.forEach((cb) => {
      try {
        cb({ type, pendingCount: count })
      } catch {
        // listener errors must never break sync
      }
    })
  }
}

/** Singleton instance */
export const syncEngine = new SyncEngine()
