import { createClient } from "@/lib/supabase/client"

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
  try {
    const supabase = createClient()
    await supabase.from("activity_logs").insert({
      org_id: orgId,
      user_id: userId,
      user_name: userName ?? null,
      action,
      module,
      description,
      metadata,
    })
  } catch {
    // Logging must never crash the application
  }
}
