"use client"

import type { ReactNode } from "react"
import { useRBAC } from "@/lib/rbac/rbac-context"
import { ShieldX } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"

interface PermissionGuardProps {
  /** The permission code required (e.g. "products.manage") */
  permission: string
  /** Optional fallback when permission is denied (defaults to nothing) */
  fallback?: ReactNode
  children: ReactNode
}

/**
 * Hides children if the current user lacks the required permission.
 * Use for inline elements like buttons: <PermissionGuard permission="products.manage"><AddButton /></PermissionGuard>
 */
export function PermissionGuard({ permission, fallback = null, children }: PermissionGuardProps) {
  const { hasPermission, loading } = useRBAC()

  if (loading) return null
  if (!hasPermission(permission)) return <>{fallback}</>
  return <>{children}</>
}

interface PageGuardProps {
  /** The permission code required to view this page */
  permission: string
  children: ReactNode
}

/**
 * Full-page guard — shows an "Access Denied" screen if the user lacks permission.
 * Use at the top of each page component.
 */
export function PageGuard({ permission, children }: PageGuardProps) {
  const { hasPermission, loading } = useRBAC()
  const { t } = useI18n()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  if (!hasPermission(permission)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-4">
          <ShieldX className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {t("rbac.accessDenied")}
        </h2>
        <p className="text-gray-500 max-w-md">
          {t("rbac.accessDeniedDesc")}
        </p>
      </div>
    )
  }

  return <>{children}</>
}
