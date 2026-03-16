"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/supabase/auth-context"
import { useRBAC } from "@/lib/rbac/rbac-context"
import { toCamelCase, toSnakeCase } from "@/lib/types"

// ── Types ────────────────────────────────────────────────────

interface UseTableDataOptions {
  /** Additional filters as { column: value } */
  filters?: Record<string, unknown>
  /** Order results by column */
  orderBy?: { column: string; ascending?: boolean }
  /** Include soft-deleted records (deleted_at IS NOT NULL) */
  includeDeleted?: boolean
  /** Supabase select string for joins, e.g. "*, sale_items(*)" */
  select?: string
  /** Disable auto-fetch on mount (for manual control) */
  manual?: boolean
}

interface UseTableDataReturn<T> {
  data: T[]
  loading: boolean
  error: string | null
  insert: (record: Partial<T>) => Promise<T | null>
  update: (id: string, changes: Partial<T>) => Promise<void>
  remove: (id: string, soft?: boolean) => Promise<void>
  refresh: () => Promise<void>
}

// ── Snake/Camel conversion for arrays ───────────────────────

function rowsToCamel<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map((row) => toCamelCase<T>(row as Record<string, unknown>))
}

function prepareForDb(obj: Partial<Record<string, unknown>>): Record<string, unknown> {
  const snake = toSnakeCase(obj as Record<string, unknown>)
  // Remove undefined values and nested arrays (handled separately)
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(snake)) {
    if (value !== undefined && !Array.isArray(value)) {
      result[key] = value
    }
  }
  return result
}

// ── Hook ─────────────────────────────────────────────────────

export function useTableData<T extends { id: string }>(
  tableName: string,
  options: UseTableDataOptions = {}
): UseTableDataReturn<T> {
  const { user } = useAuth()
  const { orgId } = useRBAC()
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = useRef(createClient()).current
  const fetchedRef = useRef(false)

  const {
    filters,
    orderBy,
    includeDeleted = false,
    select = "*",
    manual = false,
  } = options

  // ── Fetch data ──────────────────────────────────────────────

  const refresh = useCallback(async () => {
    if (!user || !orgId) return

    setLoading(true)
    setError(null)

    try {
      let query = supabase.from(tableName).select(select)

      // Tables with org_id column get org filter
      // Child tables (sale_items, purchase_items, etc.) are filtered via their parent join
      const childTables = ["sale_items", "purchase_items", "debt_payments", "tasks"]
      if (!childTables.includes(tableName)) {
        query = query.eq("org_id", orgId)
      }

      // Soft delete filter
      if (!includeDeleted) {
        // Only apply if table supports soft delete (has deleted_at column)
        const softDeleteTables = ["products", "suppliers", "customers"]
        if (softDeleteTables.includes(tableName)) {
          query = query.is("deleted_at", null)
        }
      }

      // Additional filters
      if (filters) {
        for (const [col, val] of Object.entries(filters)) {
          const snakeCol = col.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`)
          query = query.eq(snakeCol, val)
        }
      }

      // Ordering
      if (orderBy) {
        const snakeCol = orderBy.column.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`)
        query = query.order(snakeCol, { ascending: orderBy.ascending ?? true })
      } else {
        // Default order by created_at desc for most tables
        query = query.order("created_at", { ascending: false })
      }

      const { data: rows, error: fetchError } = await Promise.resolve(query)

      if (fetchError) {
        console.error(`[useTableData] Error fetching ${tableName}:`, fetchError)
        setError(fetchError.message)
      } else if (rows) {
        // Convert nested relations too
        const converted = (rows as unknown as Record<string, unknown>[]).map((row) => {
          const camel = toCamelCase<Record<string, unknown>>(row as Record<string, unknown>)
          // Convert nested arrays (e.g., sale_items, purchase_items, payments)
          for (const [key, value] of Object.entries(camel)) {
            if (Array.isArray(value) && value.length > 0 && typeof value[0] === "object") {
              camel[key] = value.map((item: Record<string, unknown>) =>
                toCamelCase<Record<string, unknown>>(item)
              )
            }
          }
          return camel as T
        })
        setData(converted)
      }
    } catch (err) {
      console.error(`[useTableData] Unexpected error for ${tableName}:`, err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [user, orgId, tableName, select, includeDeleted, supabase, filters, orderBy])

  // Auto-fetch on mount (unless manual)
  useEffect(() => {
    if (!manual && user && orgId && !fetchedRef.current) {
      fetchedRef.current = true
      refresh()
    }
  }, [manual, user, orgId, refresh])

  // Reset when orgId changes
  useEffect(() => {
    fetchedRef.current = false
  }, [orgId])

  // ── Insert ──────────────────────────────────────────────────

  const insert = useCallback(
    async (record: Partial<T>): Promise<T | null> => {
      if (!orgId) return null

      const dbRecord = prepareForDb(record)
      // Add org_id for top-level tables
      const childTables = ["sale_items", "purchase_items", "debt_payments", "tasks"]
      if (!childTables.includes(tableName)) {
        dbRecord.org_id = orgId
      }
      // Remove id if empty (let DB generate UUID)
      if (!dbRecord.id) delete dbRecord.id

      try {
        const { data: inserted, error: insertError } = await Promise.resolve(
          supabase.from(tableName).insert(dbRecord).select().single()
        )

        if (insertError) {
          console.error(`[useTableData] Insert error on ${tableName}:`, insertError)
          setError(insertError.message)
          return null
        }

        if (inserted) {
          const camel = toCamelCase<T>(inserted as Record<string, unknown>)
          setData((prev) => [camel, ...prev])
          return camel
        }
        return null
      } catch (err) {
        console.error(`[useTableData] Insert exception on ${tableName}:`, err)
        setError(err instanceof Error ? err.message : "Insert failed")
        return null
      }
    },
    [orgId, tableName, supabase]
  )

  // ── Update ──────────────────────────────────────────────────

  const update = useCallback(
    async (id: string, changes: Partial<T>): Promise<void> => {
      const dbChanges = prepareForDb(changes)

      try {
        const { error: updateError } = await Promise.resolve(
          supabase.from(tableName).update(dbChanges).eq("id", id)
        )

        if (updateError) {
          console.error(`[useTableData] Update error on ${tableName}:`, updateError)
          setError(updateError.message)
          return
        }

        // Optimistic update in local state
        setData((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, ...changes } : item
          )
        )
      } catch (err) {
        console.error(`[useTableData] Update exception on ${tableName}:`, err)
        setError(err instanceof Error ? err.message : "Update failed")
      }
    },
    [tableName, supabase]
  )

  // ── Remove (soft or hard delete) ───────────────────────────

  const remove = useCallback(
    async (id: string, soft = true): Promise<void> => {
      try {
        const softDeleteTables = ["products", "suppliers", "customers"]

        if (soft && softDeleteTables.includes(tableName)) {
          // Soft delete: set deleted_at
          const { error: delError } = await Promise.resolve(
            supabase
              .from(tableName)
              .update({ deleted_at: new Date().toISOString() })
              .eq("id", id)
          )
          if (delError) {
            setError(delError.message)
            return
          }
          // Remove from visible data
          setData((prev) => prev.filter((item) => item.id !== id))
        } else {
          // Hard delete
          const { error: delError } = await Promise.resolve(
            supabase.from(tableName).delete().eq("id", id)
          )
          if (delError) {
            setError(delError.message)
            return
          }
          setData((prev) => prev.filter((item) => item.id !== id))
        }
      } catch (err) {
        console.error(`[useTableData] Delete exception on ${tableName}:`, err)
        setError(err instanceof Error ? err.message : "Delete failed")
      }
    },
    [tableName, supabase]
  )

  return { data, loading, error, insert, update, remove, refresh }
}

// ── Convenience: insert multiple child rows ─────────────────

export async function insertChildRows(
  tableName: string,
  rows: Record<string, unknown>[]
): Promise<{ data: Record<string, unknown>[] | null; error: string | null }> {
  const supabase = createClient()
  const dbRows = rows.map((row) => prepareForDb(row))

  const { data, error } = await Promise.resolve(
    supabase.from(tableName).insert(dbRows).select()
  )

  if (error) {
    return { data: null, error: error.message }
  }
  return {
    data: (data as Record<string, unknown>[]).map((r) =>
      toCamelCase<Record<string, unknown>>(r)
    ),
    error: null,
  }
}

// ── Convenience: delete child rows by parent ID ─────────────

export async function deleteChildRows(
  tableName: string,
  parentColumn: string,
  parentId: string
): Promise<void> {
  const supabase = createClient()
  const snakeCol = parentColumn.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`)
  await Promise.resolve(
    supabase.from(tableName).delete().eq(snakeCol, parentId)
  )
}
