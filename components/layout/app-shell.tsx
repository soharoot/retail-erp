"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "./sidebar"
import { Header } from "./header"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/supabase/auth-context"
import { Loader2 } from "lucide-react"

const AUTH_PAGES = ["/login", "/register"]

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const { user, loading } = useAuth()
  const pathname = usePathname()

  const isAuthPage = AUTH_PAGES.includes(pathname)

  // Show minimal loading screen while session is resolving (only for protected pages)
  if (loading && !isAuthPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm text-gray-500">Loading your workspace...</p>
        </div>
      </div>
    )
  }

  // Auth pages and unauthenticated users see children without the shell
  if (!user || isAuthPage) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />
      <div className={cn(
        "transition-all duration-300",
        collapsed ? "lg:pl-[70px]" : "lg:pl-64"
      )}>
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="erp-main">
          {children}
        </main>
      </div>
    </div>
  )
}
