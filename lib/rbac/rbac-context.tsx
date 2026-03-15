"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/supabase/auth-context"
import { db } from "@/lib/offline/db"
import type { PermissionCode } from "./permissions"

interface RBACContextValue {
  orgId: string | null
  orgName: string | null
  roleName: string | null
  roleId: string | null
  permissions: string[]
  isAdmin: boolean
  loading: boolean
  hasPermission: (code: PermissionCode | string) => boolean
  refetch: () => Promise<void>
}

const RBACContext = createContext<RBACContextValue>({
  orgId: null,
  orgName: null,
  roleName: null,
  roleId: null,
  permissions: [],
  isAdmin: false,
  loading: true,
  hasPermission: () => false,
  refetch: async () => {},
})

export function RBACProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [orgId, setOrgId] = useState<string | null>(null)
  const [orgName, setOrgName] = useState<string | null>(null)
  const [roleName, setRoleName] = useState<string | null>(null)
  const [roleId, setRoleId] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchRBAC = useCallback(async () => {
    if (!user) {
      setOrgId(null)
      setOrgName(null)
      setRoleName(null)
      setRoleId(null)
      setPermissions([])
      setLoading(false)
      return
    }

    const cacheKey = `${user.id}::rbac`

    try {
      // 1. Get org membership + role info
      const { data: membership, error: memErr } = await supabase
        .from("org_members")
        .select(`
          org_id,
          role_id,
          organizations ( name ),
          roles ( name )
        `)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle()

      if (memErr || !membership) {
        // Supabase fetch failed or no membership — try cached RBAC
        await _loadCachedRBAC(cacheKey)
        setLoading(false)
        return
      }

      const mOrgId = membership.org_id
      const mRoleId = membership.role_id
      const mOrgName = (membership.organizations as unknown as { name: string } | null)?.name ?? null
      const mRoleName = (membership.roles as unknown as { name: string } | null)?.name ?? null

      setOrgId(mOrgId)
      setOrgName(mOrgName)
      setRoleName(mRoleName)
      setRoleId(mRoleId)

      // 2. Get permissions for this role
      let codes: string[] = []
      if (mRoleId) {
        const { data: perms } = await supabase
          .from("role_permissions")
          .select("permissions ( code )")
          .eq("role_id", mRoleId)

        codes = (perms ?? [])
          .map((rp) => (rp.permissions as unknown as { code: string } | null)?.code)
          .filter(Boolean) as string[]

        setPermissions(codes)
      }

      // 3. Cache RBAC data in IndexedDB for offline use
      try {
        await db.cachedRBAC.put({
          key: cacheKey,
          userId: user.id,
          orgId: mOrgId,
          orgName: mOrgName,
          roleName: mRoleName,
          roleId: mRoleId,
          permissions: codes,
          cachedAt: Date.now(),
        })
      } catch {
        // IndexedDB cache write failed — non-critical
      }
    } catch (err) {
      console.error("[RBAC] Failed to fetch, trying offline cache:", err)
      // Network error — try to load from IndexedDB cache
      await _loadCachedRBAC(cacheKey)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  /** Load RBAC data from IndexedDB cache (offline fallback). */
  const _loadCachedRBAC = useCallback(
    async (cacheKey: string) => {
      try {
        const cached = await db.cachedRBAC.get(cacheKey)
        if (cached) {
          setOrgId(cached.orgId)
          setOrgName(cached.orgName)
          setRoleName(cached.roleName)
          setRoleId(cached.roleId)
          setPermissions(cached.permissions)
        }
      } catch {
        // IndexedDB not available — user will see no permissions
      }
    },
    []
  )

  useEffect(() => {
    if (!authLoading) {
      fetchRBAC()
    }
  }, [authLoading, fetchRBAC])

  const hasPermission = useCallback(
    (code: PermissionCode | string): boolean => {
      return permissions.includes(code)
    },
    [permissions]
  )

  const isAdmin = roleName === "Admin"

  return (
    <RBACContext.Provider
      value={{
        orgId,
        orgName,
        roleName,
        roleId,
        permissions,
        isAdmin,
        loading: loading || authLoading,
        hasPermission,
        refetch: fetchRBAC,
      }}
    >
      {children}
    </RBACContext.Provider>
  )
}

export function useRBAC() {
  return useContext(RBACContext)
}
