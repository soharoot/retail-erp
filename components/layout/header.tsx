"use client"

import { Bell, Search, Menu, User, LogOut } from "lucide-react"
import { useAuth } from "@/lib/supabase/auth-context"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { OfflineIndicator } from "@/components/shared/offline-indicator"
import type { Settings } from "@/lib/types"
import { defaultSettings } from "@/lib/types"

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, signOut } = useAuth()
  const [settings] = useSupabaseData<Settings>("erp-settings", defaultSettings)

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

      {/* Company name — shown on small screens where sidebar is hidden */}
      <div className="lg:hidden flex-shrink-0">
        <p className="text-sm font-bold text-gray-900 truncate max-w-[120px]">
          {settings.companyName}
        </p>
      </div>

      <div className="flex-1 max-w-md hidden sm:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search anything..."
            className="w-full h-9 pl-10 pr-4 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <OfflineIndicator />

        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell className="h-5 w-5 text-gray-500" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>

        <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-gray-900">{displayName}</p>
            <p className="text-xs text-gray-500">{displayEmail}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
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
