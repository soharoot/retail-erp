"use client"

import Link from "next/link"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { Sale, PurchaseOrder, SupplierDebt, InventoryItem, Product } from "@/lib/types"
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle,
  ShoppingCart, ClipboardList, Package, BarChart3,
  Landmark, Warehouse,
} from "lucide-react"

// Get last N months as labels + YYYY-MM keys
function lastNMonths(n: number) {
  const result: { label: string; key: string }[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({
      label: d.toLocaleString("default", { month: "short" }),
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    })
  }
  return result
}

export default function DashboardPage() {
  const [sales] = useSupabaseData<Sale[]>("erp-sales", [])
  const [purchases] = useSupabaseData<PurchaseOrder[]>("erp-purchases", [])
  const [debts] = useSupabaseData<SupplierDebt[]>("erp-supplier-debts", [])
  const [inventory] = useSupabaseData<InventoryItem[]>("erp-inventory", [])
  const [products] = useSupabaseData<Product[]>("erp-products", [])

  // ── KPI calculations ────────────────────────────────────────
  const completedSales = sales.filter((s) => s.status === "completed")
  const totalRevenue = completedSales.reduce((sum, s) => sum + s.total, 0)

  const cogs = completedSales
    .flatMap((s) => s.items)
    .reduce((sum, item) => sum + item.qty * item.costAtSale, 0)

  const netProfit = totalRevenue - cogs

  const totalExpenses = purchases
    .filter((p) => p.status !== "cancelled")
    .reduce((sum, p) => sum + p.total, 0)

  const outstandingDebt = debts
    .filter((d) => d.status !== "paid")
    .reduce((sum, d) => sum + d.remainingDebt, 0)

  const inventoryValue = inventory.reduce((sum, item) => {
    const prod = products.find((p) => p.id === item.productId)
    return sum + item.stock * (prod?.cost ?? 0)
  }, 0)

  // ── Monthly chart (last 6 months) ──────────────────────────
  const months = lastNMonths(6)
  const chartData = months.map(({ label, key }) => {
    const rev = completedSales
      .filter((s) => s.date.startsWith(key))
      .reduce((s, sale) => s + sale.total, 0)
    const exp = purchases
      .filter((p) => p.status !== "cancelled" && p.date.startsWith(key))
      .reduce((s, p) => s + p.total, 0)
    return { label, revenue: rev, expenses: exp }
  })

  const maxChartVal = Math.max(...chartData.map((d) => Math.max(d.revenue, d.expenses)), 1)

  // ── Recent transactions (last 5 sales) ─────────────────────
  const recentSales = [...sales]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)

  // ── Low stock items ─────────────────────────────────────────
  const lowStockItems = inventory
    .filter((i) => i.stock <= i.minStock)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 5)

  const kpis = [
    {
      title: "Total Revenue",
      value: formatCurrency(totalRevenue),
      icon: DollarSign,
      color: "text-indigo-600 bg-indigo-50",
      sub: `${completedSales.length} completed sales`,
      trend: "up",
    },
    {
      title: "Net Profit",
      value: formatCurrency(netProfit),
      icon: TrendingUp,
      color: netProfit >= 0 ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50",
      sub: `Margin: ${totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0}%`,
      trend: netProfit >= 0 ? "up" : "down",
    },
    {
      title: "Total Expenses",
      value: formatCurrency(totalExpenses),
      icon: TrendingDown,
      color: "text-orange-600 bg-orange-50",
      sub: `${purchases.filter((p) => p.status !== "cancelled").length} purchase orders`,
      trend: "neutral",
    },
    {
      title: "Outstanding Debt",
      value: formatCurrency(outstandingDebt),
      icon: Landmark,
      color: outstandingDebt > 0 ? "text-red-600 bg-red-50" : "text-green-600 bg-green-50",
      sub: `${debts.filter((d) => d.status !== "paid").length} unpaid debts`,
      trend: outstandingDebt > 0 ? "down" : "up",
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back! Here&apos;s your business overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.title} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500">{kpi.title}</p>
              <span className={`rounded-lg p-2 ${kpi.color}`}>
                <kpi.icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900">{kpi.value}</p>
            <p className="mt-1 text-xs text-gray-400">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Inventory Value extra card */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Inventory Value</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(inventoryValue)}</p>
            <p className="text-xs text-gray-400 mt-1">{inventory.length} products in stock</p>
          </div>
          <span className="rounded-lg p-3 text-blue-600 bg-blue-50">
            <Warehouse className="h-6 w-6" />
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Revenue &amp; Expenses (Last 6 months)</h2>
          {chartData.every((d) => d.revenue === 0 && d.expenses === 0) ? (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400">
              No data yet — create sales and purchases to see the chart
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-4 mb-3 text-xs">
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-indigo-500" /> Revenue</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-orange-400" /> Expenses</span>
              </div>
              {chartData.map((d) => (
                <div key={d.label} className="flex items-center gap-3 text-xs">
                  <span className="w-8 text-gray-500 text-right">{d.label}</span>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-1">
                      <div
                        className="h-3 rounded-sm bg-indigo-500 min-w-[2px] transition-all"
                        style={{ width: `${(d.revenue / maxChartVal) * 100}%` }}
                      />
                      <span className="text-gray-600">{formatCurrency(d.revenue)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div
                        className="h-3 rounded-sm bg-orange-400 min-w-[2px] transition-all"
                        style={{ width: `${(d.expenses / maxChartVal) * 100}%` }}
                      />
                      <span className="text-gray-600">{formatCurrency(d.expenses)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "New Sale", href: "/sales", icon: ShoppingCart, color: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100" },
              { label: "New Purchase", href: "/purchases", icon: ClipboardList, color: "bg-blue-50 text-blue-600 hover:bg-blue-100" },
              { label: "Add Product", href: "/products", icon: Package, color: "bg-green-50 text-green-600 hover:bg-green-100" },
              { label: "View Reports", href: "/reports", icon: BarChart3, color: "bg-purple-50 text-purple-600 hover:bg-purple-100" },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className={`flex items-center gap-3 rounded-xl p-4 transition-colors ${action.color}`}
              >
                <action.icon className="h-5 w-5" />
                <span className="text-sm font-medium">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Recent Transactions</h2>
            <Link href="/sales" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">View all</Link>
          </div>
          {recentSales.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              No transactions yet
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{sale.customer}</p>
                    <p className="text-xs text-gray-400">{formatDate(sale.date)} · {sale.items.length} items</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(sale.total)}</p>
                    <span className={`text-xs font-medium ${
                      sale.status === "completed" ? "text-green-600" :
                      sale.status === "pending" ? "text-yellow-600" :
                      sale.status === "refunded" ? "text-red-500" : "text-gray-500"
                    }`}>{sale.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Low Stock Alerts</h2>
            <Link href="/inventory" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">View all</Link>
          </div>
          {lowStockItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              No low stock alerts
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`h-4 w-4 flex-shrink-0 ${item.stock === 0 ? "text-red-500" : "text-yellow-500"}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.productName}</p>
                      <p className="text-xs text-gray-400">{item.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${item.stock === 0 ? "text-red-600" : "text-yellow-600"}`}>
                      {item.stock} left
                    </p>
                    <p className="text-xs text-gray-400">Min: {item.minStock}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
