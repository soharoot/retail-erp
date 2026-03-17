"use client"

import { PageGuard } from "@/components/shared/permission-guard"
import { PERMISSIONS } from "@/lib/rbac/permissions"

import Link from "next/link"
import { useTableData } from "@/hooks/use-table-data"
import { formatCurrency, formatDate, lastNMonths } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"
import type { Sale, PurchaseOrder, SupplierDebt, InventoryItem, Product } from "@/lib/types"
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle,
  ShoppingCart, ClipboardList, Package, BarChart3,
  Landmark, Warehouse,
} from "lucide-react"
import { useTheme } from "@/lib/theme/theme-provider"

export default function DashboardPage() {
  const { t } = useI18n()
  const { preferences } = useTheme()

  const { data: sales, loading: salesLoading } = useTableData<Sale>("sales", {
    select: "*, sale_items(*)",
  })
  const { data: purchases } = useTableData<PurchaseOrder>("purchase_orders")
  const { data: debts } = useTableData<SupplierDebt>("supplier_debts")
  const { data: inventory } = useTableData<InventoryItem>("inventory")
  const { data: products } = useTableData<Product>("products")

  // ── KPI calculations ────────────────────────────────────────
  const completedSales = sales.filter((s) => s.status === "completed")
  const totalRevenue = completedSales.reduce((sum, s) => sum + (s.total ?? 0), 0)

  const cogs = completedSales
    .flatMap((s) => s.items ?? [])
    .reduce((sum, item) => sum + ((item?.quantity ?? 0) * (item?.costAtSale ?? 0)), 0)

  const netProfit = totalRevenue - cogs

  const totalExpenses = purchases
    .filter((p) => p.status !== "cancelled")
    .reduce((sum, p) => sum + (p.total ?? 0), 0)

  const outstandingDebt = debts
    .filter((d) => d.status !== "paid")
    .reduce((sum, d) => sum + (d.remainingDebt ?? 0), 0)

  // Build product cost map once
  const productCostMap = new Map(products.map((p) => [p.id, p.cost ?? 0]))
  const inventoryValue = inventory.reduce(
    (sum, item) => sum + (item.stock ?? 0) * (productCostMap.get(item.productId) ?? 0),
    0
  )

  // ── Monthly chart (last 6 months) — single pass per dataset ─
  const months = lastNMonths(6)
  const salesByMonth = new Map<string, number>()
  for (const s of completedSales) {
    const k = (s.date ?? "").slice(0, 7)
    if (k) salesByMonth.set(k, (salesByMonth.get(k) ?? 0) + (s.total ?? 0))
  }
  const expByMonth = new Map<string, number>()
  for (const p of purchases) {
    if (p.status === "cancelled") continue
    const k = (p.date ?? "").slice(0, 7)
    if (k) expByMonth.set(k, (expByMonth.get(k) ?? 0) + (p.total ?? 0))
  }
  const chartData = months.map(({ label, key }) => ({
    label,
    revenue: salesByMonth.get(key) ?? 0,
    expenses: expByMonth.get(key) ?? 0,
  }))

  const maxChartVal = Math.max(...chartData.map((d) => Math.max(d.revenue, d.expenses)), 1)

  // ── Recent transactions (last 5 sales) ─────────────────────
  const recentSales = [...sales]
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, 5)

  // ── Low stock items ─────────────────────────────────────────
  const productNameMap = new Map(products.map((p) => [p.id, { name: p.name, category: p.category }]))
  const lowStockItems = inventory
    .filter((i) => (i.stock ?? 0) <= (i.minStock ?? 10))
    .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0))
    .slice(0, 5)
    .map((i) => ({
      ...i,
      productName: productNameMap.get(i.productId)?.name ?? "Unknown",
      category: productNameMap.get(i.productId)?.category ?? "",
    }))

  const kpis = [
    {
      title: t("dashboard.totalRevenue"),
      value: formatCurrency(totalRevenue),
      icon: DollarSign,
      color: "text-indigo-600 bg-indigo-50",
      sub: `${completedSales.length} ventes complétées`,
      trend: "up",
    },
    {
      title: t("dashboard.netProfit"),
      value: formatCurrency(netProfit),
      icon: TrendingUp,
      color: netProfit >= 0 ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50",
      sub: `Marge: ${totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0}%`,
      trend: netProfit >= 0 ? "up" : "down",
    },
    {
      title: t("dashboard.totalExpenses"),
      value: formatCurrency(totalExpenses),
      icon: TrendingDown,
      color: "text-orange-600 bg-orange-50",
      sub: `${purchases.filter((p) => p.status !== "cancelled").length} bons de commande`,
      trend: "neutral",
    },
    {
      title: t("dashboard.outstandingDebt"),
      value: formatCurrency(outstandingDebt),
      icon: Landmark,
      color: outstandingDebt > 0 ? "text-red-600 bg-red-50" : "text-green-600 bg-green-50",
      sub: `${debts.filter((d) => d.status !== "paid").length} dettes impayées`,
      trend: outstandingDebt > 0 ? "down" : "up",
    },
  ]

  return (
    <PageGuard permission={PERMISSIONS.DASHBOARD_VIEW}>
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("dashboard.title")}</h1>
        <p className="text-sm text-gray-500 mt-1">{t("dashboard.subtitle")}</p>
      </div>

      {/* KPI Cards */}
      <div className={`grid gap-4 ${preferences.dashboardLayout === "list" ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-4"}`}>
        {kpis.map((kpi) => (
          preferences.dashboardLayout === "list" ? (
            <div key={kpi.title} className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm flex items-center gap-4">
              <span className={`rounded-lg p-2.5 flex-shrink-0 ${kpi.color}`}>
                <kpi.icon className="h-5 w-5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500">{kpi.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>
              </div>
              <p className="text-xl font-bold text-gray-900 flex-shrink-0">{kpi.value}</p>
            </div>
          ) : (
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
          )
        ))}
      </div>

      {/* Inventory Value extra card */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{t("dashboard.inventoryValue")}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(inventoryValue)}</p>
            <p className="text-xs text-gray-400 mt-1">{inventory.length} produits en stock</p>
          </div>
          <span className="rounded-lg p-3 text-blue-600 bg-blue-50">
            <Warehouse className="h-6 w-6" />
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">{t("dashboard.salesChart")}</h2>
          {chartData.every((d) => d.revenue === 0 && d.expenses === 0) ? (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400">
              Pas encore de données — créez des ventes et achats pour voir le graphique
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-4 mb-3 text-xs">
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-indigo-500" /> Revenus</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-orange-400" /> Dépenses</span>
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
          <h2 className="text-sm font-semibold text-gray-900 mb-4">{t("dashboard.quickActions")}</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: t("dashboard.newSale"), href: "/sales", icon: ShoppingCart, color: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100" },
              { label: t("dashboard.newPurchase"), href: "/purchases", icon: ClipboardList, color: "bg-blue-50 text-blue-600 hover:bg-blue-100" },
              { label: t("dashboard.addProduct"), href: "/products", icon: Package, color: "bg-green-50 text-green-600 hover:bg-green-100" },
              { label: t("dashboard.viewReports"), href: "/reports", icon: BarChart3, color: "bg-purple-50 text-purple-600 hover:bg-purple-100" },
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
            <h2 className="text-sm font-semibold text-gray-900">{t("dashboard.recentTransactions")}</h2>
            <Link href="/sales" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Voir tout</Link>
          </div>
          {salesLoading ? (
            <div className="py-12 text-center text-sm text-gray-400">Loading...</div>
          ) : recentSales.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              {t("dashboard.noTransactions")}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{sale.customerName}</p>
                    <p className="text-xs text-gray-400">{formatDate(sale.date)} · {(sale.items ?? []).length} article(s)</p>
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
            <h2 className="text-sm font-semibold text-gray-900">{t("dashboard.lowStockAlerts")}</h2>
            <Link href="/inventory" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Voir tout</Link>
          </div>
          {lowStockItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              {t("dashboard.noLowStock")}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`h-4 w-4 flex-shrink-0 ${(item.stock ?? 0) === 0 ? "text-red-500" : "text-yellow-500"}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.productName}</p>
                      <p className="text-xs text-gray-400">{item.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${(item.stock ?? 0) === 0 ? "text-red-600" : "text-yellow-600"}`}>
                      {item.stock ?? 0} restant(s)
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
  </PageGuard>
  )
}
