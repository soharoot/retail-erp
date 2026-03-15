import { createClient } from "@/lib/supabase/client"
import { db } from "@/lib/offline/db"
import { onlineStatus } from "@/lib/offline/online-status"

export interface LogActionParams {
  /** Short machine-readable action name, e.g. "sale.created", "user.invited" */
  action: string
  /** Module this action belongs to, e.g. "sales", "inventory", "users" */
  module: string
  /** Human-readable description stored in the log */
  description: string
  /** Optional extra data (JSON-serialisable) */
  metadata?: Record<string, unknown>
  /** ID of the user performing the action */
  userId: string
  /** ID of the organisation */
  orgId: string
  /** Display name shown in the log — usually the user's name or email */
  userName?: string
}

/**
 * Write a single activity-log entry.
 * - Online: inserts directly to Supabase (existing behavior)
 * - Offline: queues to IndexedDB pendingLogs (flushed by SyncEngine on reconnect)
 *
 * Fire-and-forget — never throws, so it never breaks caller logic.
 */
export async function logAction({
  action,
  module,
  description,
  metadata = {},
  userId,
  orgId,
  userName,
}: LogActionParams): Promise<void> {
  if (!userId || !orgId) return

  const now = Date.now()

  // If online, try to insert directly to Supabase
  if (onlineStatus.isOnline) {
    try {
      const supabase = createClient()
      const { error } = await supabase.from("activity_logs").insert({
        org_id: orgId,
        user_id: userId,
        user_name: userName ?? null,
        action,
        module,
        description,
        metadata,
      })
      if (!error) return // success — done

      // Supabase insert failed — fall through to queue
    } catch {
      // Network error — fall through to queue
    }
  }

  // Offline or Supabase failed — queue in IndexedDB for later sync
  try {
    await db.pendingLogs.add({
      orgId,
      userId,
      userName: userName ?? null,
      action,
      module,
      description,
      metadata,
      timestamp: now,
    })
  } catch {
    // IndexedDB not available — log is lost (acceptable: logging must never crash)
  }
}
