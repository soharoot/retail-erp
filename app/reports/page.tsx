"use client"

import { PageGuard } from "@/components/shared/permission-guard"
import { PERMISSIONS } from "@/lib/rbac/permissions"

import { useState } from "react"
import { useI18n } from "@/lib/i18n/context"
import { useTableData } from "@/hooks/use-table-data"
import { PageHeader } from "@/components/layout/page-header"
import { formatCurrency } from "@/lib/utils"
import type { Sale, InventoryItem, Product } from "@/lib/types"
import { BarChart3, TrendingUp, ShoppingCart, Package, Users } from "lucide-react"

function lastNMonths(n: number) {
  const result: { label: string; key: string }[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({
      label: d.toLocaleString("default", { month: "short", year: "2-digit" }),
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    })
  }
  return result
}

export default function ReportsPage() {
  const { t } = useI18n()

  // ── Data from normalized DB tables ────────────────────────
  const { data: sales } = useTableData<Sale>("sales", { select: "*, sale_items(*)" })
  const { data: inventory } = useTableData<InventoryItem>("inventory")
  const { data: products } = useTableData<Product>("products")

  const [activeTab, setActiveTab] = useState("sales")

  const completedSales = sales.filter((s) => s.status === "completed")

  // Build product lookup for category resolution
  const productById = new Map(products.map((p) => [p.id, p]))

  // ── KPI values ───────────────────────────────────────────────
  const totalRevenue = completedSales.reduce((sum, s) => sum + s.total, 0)
  const totalOrders = completedSales.length
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  // Top customer by spend
  const customerMap: Record<string, number> = {}
  completedSales.forEach((s) => {
    const cust = s.customerName ?? "Unknown"
    customerMap[cust] = (customerMap[cust] || 0) + (s.total ?? 0)
  })
  const topCustomer = Object.entries(customerMap).sort((a, b) => b[1] - a[1])[0]

  // ── Sales by month (last 7 months) ──────────────────────────
  const months = lastNMonths(7)
  const salesByMonth = months.map(({ label, key }) => {
    const monthSales = completedSales.filter((s) => s.date?.startsWith(key))
    return {
      label,
      revenue: monthSales.reduce((s, sale) => s + sale.total, 0),
      orders: monthSales.length,
    }
  })
  const maxRevenue = Math.max(...salesByMonth.map((m) => m.revenue), 1)

  // ── Top products by revenue ──────────────────────────────────
  const productRevMap: Record<string, { revenue: number; qty: number }> = {}
  completedSales.flatMap((s) => s.items ?? []).forEach((item) => {
    if (!item?.productName) return
    if (!productRevMap[item.productName]) productRevMap[item.productName] = { revenue: 0, qty: 0 }
    productRevMap[item.productName].revenue += (item.quantity ?? 0) * (item.unitPrice ?? 0)
    productRevMap[item.productName].qty += (item.quantity ?? 0)
  })
  const topProducts = Object.entries(productRevMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // ── Inventory by category (join with products for category) ──
  const catMap: Record<string, { count: number; units: number }> = {}
  inventory.forEach((item) => {
    const product = productById.get(item.productId)
    const cat = product?.category ?? "Uncategorized"
    if (!catMap[cat]) catMap[cat] = { count: 0, units: 0 }
    catMap[cat].count += 1
    catMap[cat].units += (item.stock ?? 0)
  })
  const inventoryByCategory = Object.entries(catMap)
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.units - a.units)

  // ── Top customers ────────────────────────────────────────────
  const customerList = Object.entries(customerMap)
    .map(([name, total]) => ({
      name,
      total,
      orders: completedSales.filter((s) => s.customerName === name).length,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  const tabs = [
    { id: "sales", label: t("reports.salesByMonth"), icon: TrendingUp },
    { id: "products", label: t("reports.topProducts"), icon: Package },
    { id: "inventory", label: t("reports.inventoryByCategory"), icon: BarChart3 },
    { id: "customers", label: t("reports.customerReport"), icon: Users },
  ]

  return (
    <PageGuard permission={PERMISSIONS.REPORTS_VIEW}>
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t("reports.title")}
        subtitle={t("reports.subtitle")}
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: t("reports.totalRevenue"), value: formatCurrency(totalRevenue), icon: TrendingUp, color: "text-[#00483c] bg-[#e6f0ed]" },
          { label: t("reports.totalOrders"), value: String(totalOrders), icon: ShoppingCart, color: "text-blue-600 bg-blue-50" },
          { label: t("reports.avgOrderValue"), value: formatCurrency(avgOrderValue), icon: BarChart3, color: "text-purple-600 bg-purple-50" },
          { label: t("reports.topCustomer"), value: topCustomer ? topCustomer[0] : "—", icon: Users, color: "text-green-600 bg-green-50" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500">{kpi.label}</p>
              <span className={`rounded-lg p-1.5 ${kpi.color}`}>
                <kpi.icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 text-lg font-bold text-gray-900 truncate">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "border-[#00483c] text-[#00483c]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Sales by Month ── */}
      {activeTab === "sales" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Sales by Month (Last 7 months)</h3>
          {salesByMonth.every((m) => m.revenue === 0) ? (
            <div className="py-12 text-center text-sm text-gray-400">
              No sales data yet
            </div>
          ) : (
            <div className="space-y-3">
              {salesByMonth.map((m) => (
                <div key={m.label} className="flex items-center gap-3 text-sm">
                  <span className="w-16 text-gray-500 text-right text-xs">{m.label}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <div
                      className="h-6 rounded bg-[#00483c] min-w-[4px] transition-all"
                      style={{ width: `${(m.revenue / maxRevenue) * 100}%` }}
                    />
                    <span className="text-gray-700 font-medium">{formatCurrency(m.revenue)}</span>
                    <span className="text-gray-400 text-xs ml-auto">{m.orders} order{m.orders !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Top Products ── */}
      {activeTab === "products" && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Top Products by Revenue</h3>
          </div>
          {topProducts.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">No sales data yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Rank</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Product</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Units Sold</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {topProducts.map((p, i) => (
                    <tr key={p.name} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0 ? "bg-yellow-100 text-yellow-700" :
                          i === 1 ? "bg-gray-100 text-gray-600" :
                          i === 2 ? "bg-orange-100 text-orange-700" :
                          "bg-gray-50 text-gray-500"
                        }`}>{i + 1}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{p.qty.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Inventory by Category ── */}
      {activeTab === "inventory" && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Inventory by Category</h3>
          </div>
          {inventoryByCategory.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">No inventory data yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Category</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Products</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Total Units</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Distribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {inventoryByCategory.map((cat) => {
                    const totalUnits = inventoryByCategory.reduce((s, c) => s + c.units, 0)
                    const pct = totalUnits > 0 ? Math.round((cat.units / totalUnits) * 100) : 0
                    return (
                      <tr key={cat.category} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{cat.category}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{cat.count}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{cat.units.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-[#00483c] rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-gray-400 w-8">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Top Customers ── */}
      {activeTab === "customers" && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Top Customers by Revenue</h3>
          </div>
          {customerList.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">No customer data yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Customer</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Orders</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Total Spent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customerList.map((c) => (
                    <tr key={c.name} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{c.orders}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(c.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  </PageGuard>
  )
}
