import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Module-level currency — updated by i18n context when settings load
let _currency = "USD"
export function setCurrency(currency: string) {
  _currency = currency || "USD"
}

// Locale mapping for proper number/symbol formatting per currency
const _localeMap: Record<string, string> = {
  USD: "en-US",
  EUR: "fr-FR",
  GBP: "en-GB",
  CAD: "en-CA",
  AUD: "en-AU",
  DZD: "fr-DZ",
}

export function formatCurrency(amount: number, currency?: string): string {
  const curr = currency ?? _currency
  const locale = _localeMap[curr] ?? "en-US"
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: curr,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
  return num.toString()
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date))
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date))
}

export function generateId(prefix: string = "ID"): string {
  const num = Math.floor(Math.random() * 9000) + 1000
  return `${prefix}-${num}`
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    completed: "bg-green-100 text-green-700",
    paid: "bg-green-100 text-green-700",
    approved: "bg-green-100 text-green-700",
    inactive: "bg-gray-100 text-gray-700",
    pending: "bg-yellow-100 text-yellow-700",
    draft: "bg-gray-100 text-gray-600",
    sent: "bg-blue-100 text-blue-700",
    overdue: "bg-red-100 text-red-700",
    cancelled: "bg-red-100 text-red-700",
    "on-hold": "bg-orange-100 text-orange-700",
    "in-progress": "bg-blue-100 text-blue-700",
    received: "bg-green-100 text-green-700",
    outstanding: "bg-red-100 text-red-700",
    partial: "bg-amber-100 text-amber-700",
    refunded: "bg-gray-100 text-gray-600",
    new: "bg-purple-100 text-purple-700",
    qualified: "bg-indigo-100 text-indigo-700",
    proposal: "bg-cyan-100 text-cyan-700",
    negotiation: "bg-amber-100 text-amber-700",
    won: "bg-green-100 text-green-700",
    lost: "bg-red-100 text-red-700",
  }
  return colors[status.toLowerCase()] || "bg-gray-100 text-gray-700"
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    electronics: "bg-blue-100 text-blue-700",
    footwear: "bg-pink-100 text-pink-700",
    appliances: "bg-orange-100 text-orange-700",
    sports: "bg-green-100 text-green-700",
    clothing: "bg-purple-100 text-purple-700",
    furniture: "bg-amber-100 text-amber-700",
    food: "bg-red-100 text-red-700",
    beauty: "bg-rose-100 text-rose-700",
    toys: "bg-cyan-100 text-cyan-700",
    books: "bg-indigo-100 text-indigo-700",
    automotive: "bg-slate-100 text-slate-700",
    health: "bg-emerald-100 text-emerald-700",
  }
  return colors[category.toLowerCase()] || "bg-gray-100 text-gray-700"
}
