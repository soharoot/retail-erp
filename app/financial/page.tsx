"use client"

import { useState } from "react"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { PageHeader } from "@/components/layout/page-header"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { Sale, PurchaseOrder, SupplierDebt, Product } from "@/lib/types"
import { DollarSign, TrendingUp, TrendingDown, Landmark, BarChart3 } from "lucide-react"

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

export default function FinancialPage() {
  const [sales] = useSupabaseData<Sale[]>("erp-sales", [])
  const [purchases] = useSupabaseData<PurchaseOrder[]>("erp-purchases", [])
  const [debts] = useSupabaseData<SupplierDebt[]>("erp-supplier-debts", [])
  const [products] = useSupabaseData<Product[]>("erp-products", [])

  const [activeTab, setActiveTab] = useState("pnl")

  // ── Real KPI Calculations ────────────────────────────────────
  const completedSales = sales.filter((s) => s.status === "completed")
  const revenue = completedSales.reduce((sum, s) => sum + s.total, 0)

  const cogs = completedSales
    .flatMap((s) => s.items ?? [])
    .reduce((sum, item) => sum + (item?.qty ?? 0) * (item?.costAtSale ?? 0), 0)

  const grossProfit = revenue - cogs
  const grossMargin = revenue > 0 ? Math.round((grossProfit / revenue) * 100) : 0

  const outstandingDebt = debts
    .filter((d) => d.status !== "paid")
    .reduce((sum, d) => sum + d.remainingDebt, 0)

  const totalPurchases = purchases
    .filter((p) => p.status !== "cancelled")
    .reduce((sum, p) => sum + p.total, 0)

  const totalPaid = purchases
    .filter((p) => p.status !== "cancelled")
    .reduce((sum, p) => sum + (p.amountPaid || 0), 0)

  // ── Monthly P&L chart ────────────────────────────────────────
  const months = lastNMonths(6)
  const pnlData = months.map(({ label, key }) => {
    const rev = completedSales
      .filter((s) => s.date.startsWith(key))
      .reduce((s, sale) => s + sale.total, 0)
    const cost = completedSales
      .filter((s) => s.date.startsWith(key))
      .flatMap((s) => s.items ?? [])
      .reduce((s, item) => s + (item?.qty ?? 0) * (item?.costAtSale ?? 0), 0)
    return { label, revenue: rev, cogs: cost, profit: rev - cost }
  })
  const maxPnl = Math.max(...pnlData.map((d) => Math.max(d.revenue, d.cogs)), 1)

  const tabs = [
    { id: "pnl", label: "Profit & Loss" },
    { id: "payable", label: "Accounts Payable" },
    { id: "purchases", label: "Purchase Summary" },
  ]

  // Accounts payable = unpaid supplier debts
  const unpaidDebts = debts.filter((d) => d.status !== "paid")

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Financial Overview"
        subtitle="Monitor your financial performance"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Total Revenue",
            value: formatCurrency(revenue),
            icon: DollarSign,
            color: "text-indigo-600 bg-indigo-50",
            sub: `${completedSales.length} completed sales`,
          },
          {
            title: "Gross Profit",
            value: formatCurrency(grossProfit),
            icon: TrendingUp,
            color: grossProfit >= 0 ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50",
            sub: `Margin: ${grossMargin}%`,
          },
          {
            title: "Total Purchases",
            value: formatCurrency(totalPurchases),
            icon: TrendingDown,
            color: "text-orange-600 bg-orange-50",
            sub: `${purchases.filter((p) => p.status !== "cancelled").length} orders`,
          },
          {
            title: "Outstanding Debt",
            value: formatCurrency(outstandingDebt),
            icon: Landmark,
            color: outstandingDebt > 0 ? "text-red-600 bg-red-50" : "text-green-600 bg-green-50",
            sub: `${unpaidDebts.length} unpaid debts`,
          },
        ].map((kpi) => (
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

      {/* Additional summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "COGS", value: formatCurrency(cogs), sub: "Cost of goods sold" },
          { label: "Cash Paid to Suppliers", value: formatCurrency(totalPaid), sub: "Total payments made" },
          { label: "Remaining Payable", value: formatCurrency(outstandingDebt), sub: "Still owed to suppliers" },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500">{item.label}</p>
            <p className="mt-1.5 text-xl font-bold text-gray-900">{item.value}</p>
            <p className="mt-0.5 text-xs text-gray-400">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── P&L Tab ── */}
      {activeTab === "pnl" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-600" />
            Revenue vs COGS — Last 6 Months
          </h3>
          {pnlData.every((d) => d.revenue === 0) ? (
            <div className="py-12 text-center text-sm text-gray-400">
              No sales data yet — create sales to see P&L
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-4 mb-2 text-xs">
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-indigo-500" /> Revenue</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-red-400" /> COGS</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-green-400" /> Profit</span>
              </div>
              {pnlData.map((d) => (
                <div key={d.label}>
                  <div className="flex items-center gap-3 text-xs mb-1">
                    <span className="w-8 text-gray-500 text-right">{d.label}</span>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-1">
                        <div className="h-3 rounded-sm bg-indigo-500 min-w-[2px]" style={{ width: `${(d.revenue / maxPnl) * 100}%` }} />
                        <span className="text-gray-500">{formatCurrency(d.revenue)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-3 rounded-sm bg-red-400 min-w-[2px]" style={{ width: `${(d.cogs / maxPnl) * 100}%` }} />
                        <span className="text-gray-500">{formatCurrency(d.cogs)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className={`h-3 rounded-sm min-w-[2px] ${d.profit >= 0 ? "bg-green-400" : "bg-orange-400"}`}
                          style={{ width: `${Math.abs(d.profit) / maxPnl * 100}%` }} />
                        <span className={d.profit >= 0 ? "text-green-600" : "text-orange-500"}>{formatCurrency(d.profit)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary table */}
          <div className="mt-6 border-t pt-4">
            <table className="w-full text-sm">
              <tbody className="space-y-2">
                <tr className="border-b border-gray-100">
                  <td className="py-2 text-gray-600">Revenue (Completed Sales)</td>
                  <td className="py-2 text-right font-medium text-gray-900">{formatCurrency(revenue)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 text-gray-600">Cost of Goods Sold (COGS)</td>
                  <td className="py-2 text-right font-medium text-red-600">-{formatCurrency(cogs)}</td>
                </tr>
                <tr className="border-b border-gray-100 font-semibold">
                  <td className="py-2 text-gray-900">Gross Profit</td>
                  <td className={`py-2 text-right ${grossProfit >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(grossProfit)}</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-500 text-xs">Gross Margin</td>
                  <td className="py-2 text-right text-xs text-gray-500">{grossMargin}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Accounts Payable Tab ── */}
      {activeTab === "payable" && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {unpaidDebts.length === 0 ? (
            <div className="py-16 text-center">
              <Landmark className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No outstanding debts</p>
              <p className="text-sm text-gray-400 mt-1">All supplier payments are up to date</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Supplier</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Purchase Ref</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Total</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Paid</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Remaining</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {unpaidDebts.map((debt) => (
                    <tr key={debt.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{debt.supplierName}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{debt.purchaseId}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(debt.totalAmount)}</td>
                      <td className="px-4 py-3 text-right text-green-600">{formatCurrency(debt.amountPaid)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-red-600">{formatCurrency(debt.remainingDebt)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          debt.status === "outstanding" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {debt.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td colSpan={4} className="px-4 py-3 text-right font-semibold text-gray-900">Total Outstanding:</td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">{formatCurrency(outstandingDebt)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Purchases Summary Tab ── */}
      {activeTab === "purchases" && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {purchases.length === 0 ? (
            <div className="py-16 text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No purchase orders yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">PO #</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Supplier</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Total</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Paid</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Debt</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {purchases.map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">{po.id}</td>
                      <td className="px-4 py-3 text-gray-900">{po.supplier}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(po.date)}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(po.total)}</td>
                      <td className="px-4 py-3 text-right text-green-600">{formatCurrency(po.amountPaid || 0)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={(po.remainingDebt || 0) > 0 ? "text-red-600 font-medium" : "text-green-600"}>
                          {formatCurrency(po.remainingDebt || 0)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          po.status === "received" ? "bg-green-100 text-green-700" :
                          po.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {po.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
