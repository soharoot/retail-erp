"use client"

import { useState } from "react"
import Image from "next/image"
import { Bell, Search, Menu, User, LogOut, Package } from "lucide-react"
import { useAuth } from "@/lib/supabase/auth-context"
import { useSettings } from "@/hooks/use-settings"
import { useTableData } from "@/hooks/use-table-data"
import { OfflineIndicator } from "@/components/shared/offline-indicator"
import type { InventoryItem } from "@/lib/types"

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, signOut } = useAuth()
  const [settings] = useSettings()
  const { data: inventory } = useTableData<InventoryItem>("inventory")
  const [showNotifications, setShowNotifications] = useState(false)

  // Low-stock alerts
  const lowStockItems = inventory.filter((item) => item.stock <= item.minStock)
  const alertCount = lowStockItems.length

  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "User"
  const displayEmail = user?.email || ""

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 sm:px-6">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-md hover:bg-gray-100"
      >
        <Menu className="h-5 w-5 text-gray-500" />
      </button>

      {/* Logo — shown on small screens where sidebar is hidden */}
      <div className="lg:hidden flex-shrink-0">
        <Image src="/logo.svg" alt="Tijaro" width={36} height={36} className="rounded-lg" />
      </div>

      <div className="flex-1 max-w-md hidden sm:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search anything..."
            className="w-full h-9 pl-10 pr-4 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00483c] focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <OfflineIndicator />

        {/* Notification bell with real alerts */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Bell className="h-5 w-5 text-gray-500" />
            {alertCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-lg z-50">
              <div className="p-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {lowStockItems.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    No alerts at this time
                  </div>
                ) : (
                  lowStockItems.slice(0, 10).map((item) => (
                    <div key={item.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 border-b border-gray-50 last:border-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 flex-shrink-0">
                        <Package className="h-4 w-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">Low Stock Alert</p>
                        <p className="text-xs text-gray-500">
                          Stock: {item.stock} (min: {item.minStock})
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-gray-900">{displayName}</p>
            <p className="text-xs text-gray-500">{displayEmail}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#cce0db] text-[#00483c]">
            <User className="h-4 w-4" />
          </div>
          <button
            onClick={signOut}
            title="Sign out"
            className="p-2 rounded-lg hover:bg-red-50 hover:text-red-600 text-gray-400 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
