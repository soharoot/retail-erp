"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"
import { useRBAC } from "@/lib/rbac/rbac-context"
import { NAV_PERMISSIONS } from "@/lib/rbac/permissions"
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ShoppingCart,
  ClipboardList,
  Truck,
  Landmark,
  Users,
  FileText,
  DollarSign,
  UserCog,
  FolderKanban,
  Target,
  BarChart3,
  Settings,
  Shield,
  Activity,
  X,
  ChevronLeft,
} from "lucide-react"

interface SidebarProps {
  open: boolean
  onClose: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}

export function Sidebar({ open, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname()
  const { t } = useI18n()
  const { hasPermission, loading: rbacLoading } = useRBAC()

  const navigation = [
    { nameKey: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard },
    { nameKey: "nav.products", href: "/products", icon: Package },
    { nameKey: "nav.inventory", href: "/inventory", icon: Warehouse },
    { nameKey: "nav.sales", href: "/sales", icon: ShoppingCart },
    { nameKey: "nav.purchases", href: "/purchases", icon: ClipboardList },
    { nameKey: "nav.suppliers", href: "/suppliers", icon: Truck },
    { nameKey: "nav.supplierDebts", href: "/supplier-debts", icon: Landmark },
    { nameKey: "nav.customers", href: "/customers", icon: Users },
    { nameKey: "nav.invoicing", href: "/invoicing", icon: FileText },
    { nameKey: "nav.financial", href: "/financial", icon: DollarSign },
    { nameKey: "nav.hr", href: "/hr", icon: UserCog },
    { nameKey: "nav.projects", href: "/projects", icon: FolderKanban },
    { nameKey: "nav.crm", href: "/crm", icon: Target },
    { nameKey: "nav.reports", href: "/reports", icon: BarChart3 },
    { nameKey: "nav.settings", href: "/settings", icon: Settings },
    { nameKey: "nav.userManagement", href: "/users", icon: Shield },
    { nameKey: "nav.activityLog", href: "/activity", icon: Activity },
  ]

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200 transition-all duration-300",
          collapsed ? "w-[70px]" : "w-64",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex items-center h-16 px-4 border-b border-gray-200",
          collapsed ? "justify-center" : "justify-between"
        )}>
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <LayoutDashboard className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900">Retail ERP</h1>
                <p className="text-[10px] text-gray-500">Business Management</p>
              </div>
            </Link>
          )}
          {collapsed && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <LayoutDashboard className="h-4 w-4" />
            </div>
          )}
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {navigation.filter((item) => {
              // While RBAC is loading, show all items to avoid flicker
              if (rbacLoading) return true
              const perm = NAV_PERMISSIONS[item.href]
              return !perm || hasPermission(perm)
            }).map((item) => {
              const label = t(item.nameKey)
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    title={collapsed ? label : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-indigo-600 text-white"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                      collapsed && "justify-center px-2"
                    )}
                  >
                    <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive ? "text-white" : "text-gray-400")} />
                    {!collapsed && <span>{label}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Collapse toggle - desktop only */}
        <div className="hidden lg:flex items-center justify-center p-3 border-t border-gray-200">
          <button
            onClick={onToggleCollapse}
            className="flex items-center justify-center w-full rounded-lg py-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <ChevronLeft className={cn("h-5 w-5 transition-transform", collapsed && "rotate-180")} />
          </button>
        </div>

        {/* Version */}
        {!collapsed && (
          <div className="px-4 py-3 border-t border-gray-200">
            <p className="text-xs text-gray-400">System Version</p>
            <p className="text-xs font-medium text-gray-600">v2.0.0</p>
          </div>
        )}
      </aside>
    </>
  )
}
