"use client"

import { cn } from "@/lib/utils"
import { type LucideIcon } from "lucide-react"

interface KpiCardProps {
  title: string
  value: string
  subtitle?: string
  change?: {
    value: string
    positive: boolean
  }
  icon?: LucideIcon
  className?: string
}

export function KpiCard({ title, value, subtitle, change, icon: Icon, className }: KpiCardProps) {
  return (
    <div className={cn("rounded-xl border border-gray-200 bg-white p-6 shadow-sm", className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        {Icon && <Icon className="h-5 w-5 text-gray-400" />}
      </div>
      <p className="mt-3 text-3xl font-bold text-gray-900">{value}</p>
      {(subtitle || change) && (
        <div className="mt-1 flex items-center gap-2">
          {change && (
            <span className={cn(
              "text-sm font-medium",
              change.positive ? "text-green-600" : "text-red-500"
            )}>
              {change.positive ? "+" : ""}{change.value}
            </span>
          )}
          {subtitle && (
            <span className="text-sm text-gray-500">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  )
}
