"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRBAC } from "@/lib/rbac/rbac-context"
import { PageGuard } from "@/components/shared/permission-guard"
import { PageHeader } from "@/components/layout/page-header"
import { PERMISSIONS } from "@/lib/rbac/permissions"
import { useI18n } from "@/lib/i18n/context"
import { Activity, Clock, Search, RefreshCw } from "lucide-react"

// ── Types ──

interface ActivityLog {
  id: string
  user_id: string | null
  user_name: string | null
  action: string
  module: string
  description: string
  metadata: Record<string, unknown>
  created_at: string
}

// ── Module badge colours ──

const MODULE_COLORS: Record<string, string> = {
  auth:      "bg-blue-100 text-blue-700",
  sales:     "bg-green-100 text-green-700",
  inventory: "bg-yellow-100 text-yellow-700",
  users:     "bg-purple-100 text-purple-700",
  settings:  "bg-gray-100 text-gray-700",
  financial: "bg-emerald-100 text-emerald-700",
  purchases: "bg-orange-100 text-orange-700",
}

function moduleBadgeClass(module: string) {
  return MODULE_COLORS[module] ?? "bg-[#cce0db] text-[#003d33]"
}

function formatTimestamp(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function userInitials(name: string | null) {
  if (!name) return "?"
  return name
    .split(/[\s@]+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

// ── Page ──

export default function ActivityPage() {
  const { t } = useI18n()
  const { orgId } = useRBAC()
  const supabase = createClient()

  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterModule, setFilterModule] = useState("")

  const fetchLogs = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    const { data } = await supabase
      .from("activity_logs")
      .select("id, user_id, user_name, action, module, description, metadata, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(500)

    setLogs(data ?? [])
    setLoading(false)
  }, [orgId])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // ── Derived ──

  const modules = Array.from(new Set(logs.map((l) => l.module))).sort()

  const filtered = logs.filter((log) => {
    const matchModule = !filterModule || log.module === filterModule
    const matchSearch =
      !search ||
      log.description.toLowerCase().includes(search.toLowerCase()) ||
      (log.user_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase())
    return matchModule && matchSearch
  })

  return (
    <PageGuard permission={PERMISSIONS.ACTIVITY_VIEW}>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title={t("activity.title")}
          subtitle={t("activity.subtitle")}
          action={{
            label: "",
            onClick: fetchLogs,
          }}
        />

        {/* Refresh + Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("common.search")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-[#00483c]"
            />
          </div>

          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00483c]"
          >
            <option value="">{t("activity.allModules")}</option>
            {modules.map((m) => (
              <option key={m} value={m} className="capitalize">
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </option>
            ))}
          </select>

          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Count */}
        {!loading && (
          <p className="text-xs text-gray-400">
            {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
            {filterModule || search ? " (filtered)" : ""}
          </p>
        )}

        {/* Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00483c]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Activity className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">{t("activity.noLogs")}</p>
              <p className="text-sm text-gray-400 mt-1">{t("activity.noLogsDesc")}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((log) => (
                <div key={log.id} className="flex items-start gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
                  {/* Avatar */}
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#cce0db] text-[#00483c] text-xs font-bold">
                    {userInitials(log.user_name)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      {/* Module badge */}
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${moduleBadgeClass(log.module)}`}>
                        {log.module}
                      </span>
                      {/* Action */}
                      <span className="text-xs font-mono text-gray-400">{log.action}</span>
                    </div>
                    <p className="text-sm text-gray-900">{log.description}</p>
                    {log.user_name && (
                      <p className="text-xs text-gray-500 mt-0.5">by {log.user_name}</p>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="flex-shrink-0 flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="whitespace-nowrap">{formatTimestamp(log.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageGuard>
  )
}
