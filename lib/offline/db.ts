import Dexie, { type Table } from "dexie"

/* ── Row types ───────────────────────────────────────── */

export interface LocalDataRow {
  /** Composite key: `${orgId}::${dataKey}` */
  key: string
  orgId: string
  dataKey: string
  /** The JSON blob (products[], sales[], settings, etc.) */
  data: unknown
  /** Client-side timestamp — used for LWW conflict resolution */
  updatedAt: number
  /** true = matches Supabase; false = local-only change */
  synced: boolean
}

export interface PendingOp {
  id?: number
  orgId: string
  dataKey: string
  data: unknown
  timestamp: number
  retries: number
}

export interface CachedRBAC {
  /** `${userId}::rbac` */
  key: string
  userId: string
  orgId: string
  orgName: string | null
  roleName: string | null
  roleId: string | null
  permissions: string[]
  cachedAt: number
}

export interface PendingLog {
  id?: number
  orgId: string
  userId: string
  userName: string | null
  action: string
  module: string
  description: string
  metadata: Record<string, unknown>
  timestamp: number
}

/* ── Dexie database ──────────────────────────────────── */

class ERPDatabase extends Dexie {
  localData!: Table<LocalDataRow, string>
  pendingOps!: Table<PendingOp, number>
  cachedRBAC!: Table<CachedRBAC, string>
  pendingLogs!: Table<PendingLog, number>

  constructor() {
    super("erp-offline")
    this.version(1).stores({
      localData: "key, orgId, dataKey, synced",
      pendingOps: "++id, orgId, dataKey, timestamp",
      cachedRBAC: "key, userId, orgId",
      pendingLogs: "++id, timestamp",
    })
  }
}

/** Singleton database instance */
export const db = new ERPDatabase()

/* ── Helpers ─────────────────────────────────────────── */

/** Build the composite key for localData */
export function localDataKey(orgId: string, dataKey: string): string {
  return `${orgId}::${dataKey}`
}
