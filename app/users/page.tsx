"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/supabase/auth-context"
import { useRBAC } from "@/lib/rbac/rbac-context"
import { PageHeader } from "@/components/layout/page-header"
import { KpiCard } from "@/components/shared/kpi-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { SearchInput } from "@/components/shared/search-input"
import { PageGuard, PermissionGuard } from "@/components/shared/permission-guard"
import { PERMISSIONS, MODULE_DEFINITIONS } from "@/lib/rbac/permissions"
import {
  Shield, Users, UserCheck, UserX, Pencil, Trash2, X,
  Key, Clock, Plus, Check, Mail,
} from "lucide-react"
import { formatDate } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"
import { logAction } from "@/lib/activity/log-action"

// ── Types ──

interface OrgMember {
  id: string
  org_id: string
  user_id: string | null
  role_id: string | null
  invited_email: string | null
  status: string
  created_at: string
  // Joined data
  profile_name: string | null
  profile_email: string | null
  role_name: string | null
}

interface Role {
  id: string
  org_id: string
  name: string
  description: string | null
  is_system: boolean
  created_at: string
  permissions: string[] // permission codes
  member_count: number
}

// ── Component ──

export default function UsersPage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const { orgId, isAdmin, hasPermission, refetch: refetchRBAC } = useRBAC()
  const supabase = createClient()

  // State
  const [members, setMembers] = useState<OrgMember[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [allPermissions, setAllPermissions] = useState<{ id: string; code: string }[]>([])
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState<"members" | "roles" | "activity">("members")
  const [loading, setLoading] = useState(true)

  // Dialogs
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [editingMember, setEditingMember] = useState<OrgMember | null>(null)
  const [showEditMemberDialog, setShowEditMemberDialog] = useState(false)

  // Forms
  const [inviteForm, setInviteForm] = useState({ email: "", name: "", role_id: "" })
  const [roleForm, setRoleForm] = useState({ name: "", description: "", permissions: [] as string[] })

  // ── Fetch data ──

  const fetchMembers = useCallback(async () => {
    if (!orgId) return
    const { data } = await supabase
      .from("org_members")
      .select("id, org_id, user_id, role_id, invited_email, status, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: true })

    if (!data) return

    // Fetch profiles and roles for each member
    const enriched: OrgMember[] = []
    for (const m of data) {
      let profileName: string | null = null
      let profileEmail: string | null = null
      let roleName: string | null = null

      if (m.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", m.user_id)
          .maybeSingle()
        profileName = profile?.full_name ?? null

        // Get email from auth (we can use the invited_email fallback)
        profileEmail = m.invited_email
      }

      if (m.role_id) {
        const { data: role } = await supabase
          .from("roles")
          .select("name")
          .eq("id", m.role_id)
          .maybeSingle()
        roleName = role?.name ?? null
      }

      enriched.push({
        ...m,
        profile_name: profileName ?? m.invited_email?.split("@")[0] ?? "Unknown",
        profile_email: profileEmail ?? m.invited_email,
        role_name: roleName,
      })
    }
    setMembers(enriched)
  }, [orgId])

  const fetchRoles = useCallback(async () => {
    if (!orgId) return
    const { data: rolesData } = await supabase
      .from("roles")
      .select("id, org_id, name, description, is_system, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: true })

    if (!rolesData) return

    // Fetch permissions for each role + member count
    const enriched: Role[] = []
    for (const r of rolesData) {
      const { data: rps } = await supabase
        .from("role_permissions")
        .select("permissions ( code )")
        .eq("role_id", r.id)
      const codes = (rps ?? []).map((rp) => {
        const p = rp.permissions as unknown as { code: string } | null
        return p?.code
      }).filter(Boolean) as string[]

      const { count } = await supabase
        .from("org_members")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("role_id", r.id)

      enriched.push({ ...r, permissions: codes, member_count: count ?? 0 })
    }
    setRoles(enriched)
  }, [orgId])

  const fetchPermissions = useCallback(async () => {
    const { data } = await supabase.from("permissions").select("id, code").order("code")
    setAllPermissions(data ?? [])
  }, [])

  useEffect(() => {
    if (orgId) {
      Promise.all([fetchMembers(), fetchRoles(), fetchPermissions()]).finally(() => setLoading(false))
    }
  }, [orgId, fetchMembers, fetchRoles, fetchPermissions])

  // ── Handlers ──

  const handleInvite = async () => {
    if (!inviteForm.email || !inviteForm.role_id || !orgId) return

    const { error } = await supabase.from("org_members").insert({
      org_id: orgId,
      invited_email: inviteForm.email,
      role_id: inviteForm.role_id,
      invited_by: user?.id,
      status: "invited",
    })

    if (error) {
      alert(t("rbac.inviteError") + ": " + error.message)
      return
    }

    const roleName = roles.find((r) => r.id === inviteForm.role_id)?.name ?? inviteForm.role_id
    if (user?.id && orgId) {
      logAction({
        action: "user.invited",
        module: "users",
        description: `Invited ${inviteForm.email} with role "${roleName}"`,
        userId: user.id,
        orgId,
        userName: user.email ?? undefined,
        metadata: { invited_email: inviteForm.email, role: roleName },
      })
    }

    setShowInviteDialog(false)
    setInviteForm({ email: "", name: "", role_id: "" })
    fetchMembers()
  }

  const handleUpdateMemberRole = async () => {
    if (!editingMember) return
    const { error } = await supabase
      .from("org_members")
      .update({ role_id: editingMember.role_id })
      .eq("id", editingMember.id)

    if (error) {
      alert("Error: " + error.message)
      return
    }

    const newRoleName = roles.find((r) => r.id === editingMember.role_id)?.name ?? editingMember.role_id
    if (user?.id && orgId) {
      logAction({
        action: "user.role_changed",
        module: "users",
        description: `Changed role of "${editingMember.profile_name ?? editingMember.invited_email}" to "${newRoleName}"`,
        userId: user.id,
        orgId,
        userName: user.email ?? undefined,
        metadata: { member_id: editingMember.id, new_role: newRoleName },
      })
    }

    setShowEditMemberDialog(false)
    setEditingMember(null)
    fetchMembers()
    refetchRBAC()
  }

  const handleToggleMemberStatus = async (member: OrgMember) => {
    const newStatus = member.status === "active" ? "disabled" : "active"
    await supabase.from("org_members").update({ status: newStatus }).eq("id", member.id)
    if (user?.id && orgId) {
      logAction({
        action: `user.${newStatus === "active" ? "enabled" : "disabled"}`,
        module: "users",
        description: `${newStatus === "active" ? "Enabled" : "Disabled"} member "${member.profile_name ?? member.invited_email}"`,
        userId: user.id,
        orgId,
        userName: user.email ?? undefined,
        metadata: { member_id: member.id, new_status: newStatus },
      })
    }
    fetchMembers()
  }

  const handleRemoveMember = async (member: OrgMember) => {
    if (member.user_id === user?.id) {
      alert(t("rbac.cannotRemoveSelf"))
      return
    }
    if (!confirm(t("rbac.confirmRemove"))) return
    await supabase.from("org_members").delete().eq("id", member.id)
    fetchMembers()
  }

  const handleSaveRole = async () => {
    if (!roleForm.name || !orgId) return

    if (editingRole) {
      // Update role name/description
      await supabase
        .from("roles")
        .update({ name: roleForm.name, description: roleForm.description })
        .eq("id", editingRole.id)

      // Sync permissions: delete all, re-insert selected
      await supabase.from("role_permissions").delete().eq("role_id", editingRole.id)
      const permIds = allPermissions.filter((p) => roleForm.permissions.includes(p.code)).map((p) => p.id)
      if (permIds.length > 0) {
        await supabase.from("role_permissions").insert(
          permIds.map((pid) => ({ role_id: editingRole.id, permission_id: pid }))
        )
      }
      if (user?.id) {
        logAction({
          action: "role.updated",
          module: "users",
          description: `Updated role "${roleForm.name}" (${roleForm.permissions.length} permissions)`,
          userId: user.id,
          orgId,
          userName: user.email ?? undefined,
          metadata: { role_id: editingRole.id, role_name: roleForm.name, permission_count: roleForm.permissions.length },
        })
      }
    } else {
      // Create new role
      const { data: newRole } = await supabase
        .from("roles")
        .insert({ org_id: orgId, name: roleForm.name, description: roleForm.description })
        .select("id")
        .single()

      if (newRole) {
        const permIds = allPermissions.filter((p) => roleForm.permissions.includes(p.code)).map((p) => p.id)
        if (permIds.length > 0) {
          await supabase.from("role_permissions").insert(
            permIds.map((pid) => ({ role_id: newRole.id, permission_id: pid }))
          )
        }
        if (user?.id) {
          logAction({
            action: "role.created",
            module: "users",
            description: `Created role "${roleForm.name}" with ${permIds.length} permissions`,
            userId: user.id,
            orgId,
            userName: user.email ?? undefined,
            metadata: { role_id: newRole.id, role_name: roleForm.name, permission_count: permIds.length },
          })
        }
      }
    }

    setShowRoleDialog(false)
    setEditingRole(null)
    setRoleForm({ name: "", description: "", permissions: [] })
    fetchRoles()
    refetchRBAC()
  }

  const handleDeleteRole = async (role: Role) => {
    if (role.is_system) {
      alert(t("rbac.cannotDeleteSystem"))
      return
    }
    if (role.member_count > 0) {
      alert(t("rbac.roleHasMembers"))
      return
    }
    if (!confirm(t("rbac.confirmDeleteRole"))) return
    await supabase.from("role_permissions").delete().eq("role_id", role.id)
    await supabase.from("roles").delete().eq("id", role.id)
    fetchRoles()
  }

  const openEditRole = (role: Role) => {
    setEditingRole(role)
    setRoleForm({ name: role.name, description: role.description ?? "", permissions: role.permissions })
    setShowRoleDialog(true)
  }

  const openEditMember = (member: OrgMember) => {
    setEditingMember(member)
    setShowEditMemberDialog(true)
  }

  const togglePermission = (code: string) => {
    setRoleForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(code)
        ? prev.permissions.filter((p) => p !== code)
        : [...prev.permissions, code],
    }))
  }

  // ── Derived ──

  const filteredMembers = members.filter(
    (m) =>
      (m.profile_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (m.profile_email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (m.role_name ?? "").toLowerCase().includes(search.toLowerCase())
  )

  const activeMembers = members.filter((m) => m.status === "active").length
  const invitedMembers = members.filter((m) => m.status === "invited").length
  const disabledMembers = members.filter((m) => m.status === "disabled").length

  const roleColors: Record<string, string> = {
    Admin: "bg-red-100 text-red-700",
    Manager: "bg-blue-100 text-blue-700",
    Employee: "bg-green-100 text-green-700",
    Viewer: "bg-gray-100 text-gray-600",
  }

  const statusMap: Record<string, string> = {
    active: "active",
    invited: "pending",
    disabled: "inactive",
  }

  // Activity tab — fetch last 50 user-module logs from real table
  const [activityLogs, setActivityLogs] = useState<{
    id: string; user_name: string | null; action: string; description: string; created_at: string
  }[]>([])

  const fetchActivityLogs = useCallback(async () => {
    if (!orgId) return
    const { data } = await supabase
      .from("activity_logs")
      .select("id, user_name, action, description, created_at")
      .eq("org_id", orgId)
      .eq("module", "users")
      .order("created_at", { ascending: false })
      .limit(50)
    setActivityLogs(data ?? [])
  }, [orgId])

  useEffect(() => {
    if (activeTab === "activity") fetchActivityLogs()
  }, [activeTab, fetchActivityLogs])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00483c]" />
      </div>
    )
  }

  return (
    <PageGuard permission={PERMISSIONS.USERS_VIEW}>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title={t("users.title")}
          subtitle={t("users.subtitle")}
          action={
            hasPermission(PERMISSIONS.USERS_MANAGE)
              ? {
                  label: t("users.inviteMember"),
                  onClick: () => {
                    setInviteForm({ email: "", name: "", role_id: roles[0]?.id ?? "" })
                    setShowInviteDialog(true)
                  },
                }
              : undefined
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title={t("users.totalUsers")} value={String(members.length)} subtitle={t("users.allAccounts")} icon={Users} />
          <KpiCard title={t("users.activeUsers")} value={String(activeMembers)} subtitle={t("users.currentlyActive")} icon={UserCheck} />
          <KpiCard title={t("users.invited")} value={String(invitedMembers)} subtitle={t("users.pendingInvites")} icon={Mail} />
          <KpiCard title={t("users.roles")} value={String(roles.length)} subtitle={t("users.definedRoles")} icon={Shield} />
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-200">
          {[
            { id: "members" as const, label: t("users.members") },
            { id: "roles" as const, label: t("users.roles") },
            { id: "activity" as const, label: t("users.activity") },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-[#00483c] text-[#00483c]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ Members Tab ═══ */}
        {activeTab === "members" && (
          <>
            <SearchInput placeholder={t("common.search")} value={search} onChange={setSearch} />
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("users.user")}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("users.role")}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("common.status")}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("users.joined")}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#cce0db] text-[#00483c] text-sm font-bold">
                            {(member.profile_name ?? "?")
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{member.profile_name}</p>
                            <p className="text-xs text-gray-500">{member.profile_email ?? member.invited_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            roleColors[member.role_name ?? ""] ?? "bg-purple-100 text-purple-700"
                          }`}
                        >
                          <Key className="h-3 w-3" />
                          {member.role_name ?? "No role"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={statusMap[member.status] ?? member.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(member.created_at)}</td>
                      <td className="px-4 py-3">
                        <PermissionGuard permission={PERMISSIONS.USERS_MANAGE}>
                          <div className="flex items-center gap-2">
                            {member.user_id !== user?.id && (
                              <>
                                <button
                                  onClick={() => openEditMember(member)}
                                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                                  title={t("rbac.changeRole")}
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleToggleMemberStatus(member)}
                                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                                  title={member.status === "active" ? t("rbac.disable") : t("rbac.enable")}
                                >
                                  {member.status === "active" ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                                </button>
                                <button
                                  onClick={() => handleRemoveMember(member)}
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                                  title={t("common.delete")}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            {member.user_id === user?.id && (
                              <span className="text-xs text-gray-400 italic">{t("rbac.you")}</span>
                            )}
                          </div>
                        </PermissionGuard>
                      </td>
                    </tr>
                  ))}
                  {filteredMembers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                        {t("common.noResults")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ═══ Roles Tab ═══ */}
        {activeTab === "roles" && (
          <div className="space-y-6">
            <PermissionGuard permission={PERMISSIONS.USERS_MANAGE}>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setEditingRole(null)
                    setRoleForm({ name: "", description: "", permissions: [] })
                    setShowRoleDialog(true)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-[#00483c] text-white text-sm font-medium rounded-lg hover:bg-[#003d33]"
                >
                  <Plus className="h-4 w-4" />
                  {t("rbac.createRole")}
                </button>
              </div>
            </PermissionGuard>

            {roles.map((role) => (
              <div key={role.id} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${
                        roleColors[role.name] ?? "bg-purple-100 text-purple-700"
                      }`}
                    >
                      <Shield className="h-4 w-4" />
                      {role.name}
                    </span>
                    <span className="text-sm text-gray-500">
                      {role.member_count} {t("users.members").toLowerCase()}
                    </span>
                    {role.is_system && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{t("rbac.systemRole")}</span>
                    )}
                  </div>
                  <PermissionGuard permission={PERMISSIONS.USERS_MANAGE}>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditRole(role)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {!role.is_system && (
                        <button
                          onClick={() => handleDeleteRole(role)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </PermissionGuard>
                </div>
                {role.description && <p className="text-sm text-gray-500 mb-4">{role.description}</p>}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {MODULE_DEFINITIONS.map((mod) =>
                    mod.actions.map((action) => {
                      const code = `${mod.module}.${action}`
                      const hasIt = role.permissions.includes(code)
                      return (
                        <div
                          key={code}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                            hasIt ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-400"
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full ${hasIt ? "bg-green-500" : "bg-gray-300"}`} />
                          <span>
                            {mod.label} <span className="capitalize">({action})</span>
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ Activity Tab ═══ */}
        {activeTab === "activity" && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-900">{t("users.recentActivity")}</h3>
            </div>
            {activityLogs.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">
                No user-management activity recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {activityLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#cce0db] text-[#00483c] text-xs font-bold flex-shrink-0">
                      {(log.user_name ?? "?")
                        .split(/[\s@]+/)
                        .map((n: string) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{log.description}</p>
                      {log.user_name && (
                        <p className="text-xs text-gray-400">by {log.user_name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                      <Clock className="h-3 w-3" />
                      {new Date(log.created_at).toLocaleString(undefined, {
                        month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ Invite Member Dialog ═══ */}
        {showInviteDialog && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowInviteDialog(false)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-bold text-gray-900">{t("users.inviteMember")}</h2>
                <button onClick={() => setShowInviteDialog(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.email")}</label>
                  <input
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    placeholder="staff@example.com"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00483c]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("rbac.assignRole")}</label>
                  <select
                    value={inviteForm.role_id}
                    onChange={(e) => setInviteForm({ ...inviteForm, role_id: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00483c]"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-gray-500">{t("rbac.inviteHint")}</p>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={() => setShowInviteDialog(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    onClick={handleInvite}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#00483c] rounded-lg hover:bg-[#003d33]"
                  >
                    {t("rbac.sendInvite")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ Edit Member Role Dialog ═══ */}
        {showEditMemberDialog && editingMember && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowEditMemberDialog(false)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-bold text-gray-900">{t("rbac.changeRole")}</h2>
                <button onClick={() => setShowEditMemberDialog(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600">
                  {t("rbac.changingRoleFor")} <strong>{editingMember.profile_name}</strong>
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("rbac.newRole")}</label>
                  <select
                    value={editingMember.role_id ?? ""}
                    onChange={(e) => setEditingMember({ ...editingMember, role_id: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00483c]"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={() => setShowEditMemberDialog(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    onClick={handleUpdateMemberRole}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#00483c] rounded-lg hover:bg-[#003d33]"
                  >
                    {t("common.save")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ Create/Edit Role Dialog ═══ */}
        {showRoleDialog && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowRoleDialog(false)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
                <h2 className="text-lg font-bold text-gray-900">
                  {editingRole ? t("rbac.editRole") : t("rbac.createRole")}
                </h2>
                <button onClick={() => setShowRoleDialog(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("rbac.roleName")}</label>
                    <input
                      value={roleForm.name}
                      onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                      placeholder="e.g. Cashier"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00483c]"
                      disabled={editingRole?.is_system}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("rbac.roleDescription")}</label>
                    <input
                      value={roleForm.description}
                      onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                      placeholder="Short description..."
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00483c]"
                    />
                  </div>
                </div>

                {/* Permission Grid */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">{t("rbac.permissions")}</h3>
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">{t("rbac.module")}</th>
                          <th className="text-center px-4 py-2 text-xs font-medium text-gray-500 uppercase">{t("rbac.view")}</th>
                          <th className="text-center px-4 py-2 text-xs font-medium text-gray-500 uppercase">{t("rbac.manage")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {MODULE_DEFINITIONS.map((mod) => (
                          <tr key={mod.module} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-700">{mod.label}</td>
                            {["view", "manage"].map((action) => {
                              const code = `${mod.module}.${action}`
                              const available = (mod.actions as readonly string[]).includes(action)
                              const checked = roleForm.permissions.includes(code)
                              return (
                                <td key={action} className="text-center px-4 py-2">
                                  {available ? (
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => togglePermission(code)}
                                      className="h-4 w-4 rounded border-gray-300 text-[#00483c] focus:ring-[#00483c]"
                                    />
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Quick select */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setRoleForm({
                        ...roleForm,
                        permissions: allPermissions.map((p) => p.code),
                      })
                    }
                    className="px-3 py-1.5 text-xs font-medium text-[#00483c] border border-[#99c1b6] rounded-lg hover:bg-[#e6f0ed]"
                  >
                    {t("rbac.selectAll")}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setRoleForm({
                        ...roleForm,
                        permissions: allPermissions.filter((p) => p.code.endsWith(".view")).map((p) => p.code),
                      })
                    }
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    {t("rbac.viewOnly")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleForm({ ...roleForm, permissions: [] })}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    {t("rbac.clearAll")}
                  </button>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={() => setShowRoleDialog(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    onClick={handleSaveRole}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#00483c] rounded-lg hover:bg-[#003d33]"
                  >
                    {editingRole ? t("common.save") : t("rbac.createRole")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageGuard>
  )
}
