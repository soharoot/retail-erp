"use client"

import { useState } from "react"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { PageHeader } from "@/components/layout/page-header"
import { formatCurrency } from "@/lib/utils"
import type { InventoryItem, Product } from "@/lib/types"
import { Warehouse, AlertTriangle, X, TrendingUp, TrendingDown } from "lucide-react"

function stockStatus(stock: number, minStock: number) {
  if (stock === 0) return { label: "Out of Stock", color: "bg-red-100 text-red-700" }
  if (stock <= minStock) return { label: "Low Stock", color: "bg-yellow-100 text-yellow-700" }
  return { label: "In Stock", color: "bg-green-100 text-green-700" }
}

export default function InventoryPage() {
  const [inventory, setInventory] = useSupabaseData<InventoryItem[]>("erp-inventory", [])
  const [products] = useSupabaseData<Product[]>("erp-products", [])

  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("All")
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null)
  const [adjustAmount, setAdjustAmount] = useState("")
  const [adjustReason, setAdjustReason] = useState("")

  // ── derived ────────────────────────────────────────────────
  const filtered = inventory.filter((item) => {
    const matchesSearch =
      item.productName.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false
    if (filterStatus === "All") return true
    const { label } = stockStatus(item.stock, item.minStock)
    return label === filterStatus
  })

  const totalItems = inventory.length
  const totalUnits = inventory.reduce((s, i) => s + i.stock, 0)
  const lowStockCount = inventory.filter((i) => i.stock > 0 && i.stock <= i.minStock).length
  const outOfStockCount = inventory.filter((i) => i.stock === 0).length

  // Inventory value = Σ stock × product.cost
  const inventoryValue = inventory.reduce((sum, item) => {
    const prod = products.find((p) => p.id === item.productId)
    return sum + item.stock * (prod?.cost ?? 0)
  }, 0)

  // ── adjust stock ────────────────────────────────────────────
  const handleAdjust = () => {
    if (!adjustItem) return
    const delta = parseInt(adjustAmount) || 0
    const today = new Date().toISOString().slice(0, 10)
    setInventory(
      inventory.map((i) =>
        i.id === adjustItem.id
          ? { ...i, stock: Math.max(0, i.stock + delta), lastUpdated: today }
          : i
      )
    )
    setAdjustItem(null)
    setAdjustAmount("")
    setAdjustReason("")
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Inventory Management"
        subtitle="Track and manage your stock levels"
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Items", value: totalItems, icon: Warehouse, color: "text-indigo-600 bg-indigo-50" },
          { label: "Total Units", value: totalUnits.toLocaleString(), icon: Warehouse, color: "text-blue-600 bg-blue-50" },
          { label: "Low Stock Alerts", value: lowStockCount + outOfStockCount, icon: AlertTriangle, color: "text-yellow-600 bg-yellow-50" },
          { label: "Inventory Value", value: formatCurrency(inventoryValue), icon: Warehouse, color: "text-green-600 bg-green-50" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500">{kpi.label}</p>
              <span className={`rounded-lg p-1.5 ${kpi.color}`}>
                <kpi.icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 text-xl font-bold text-gray-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Warehouse className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="All">All Status</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Inventory table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Warehouse className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No inventory items found</p>
            <p className="text-sm text-gray-400 mt-1">
              {inventory.length === 0
                ? "Add products first — inventory entries are created automatically"
                : "Try adjusting your search or filter"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Product</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Category</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Stock</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Min Stock</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Last Updated</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Adjust</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((item) => {
                  const { label, color } = stockStatus(item.stock, item.minStock)
                  const pct = item.minStock > 0
                    ? Math.min(100, Math.round((item.stock / (item.minStock * 3)) * 100))
                    : 100
                  const barColor =
                    label === "Out of Stock" ? "bg-red-500" :
                    label === "Low Stock" ? "bg-yellow-500" : "bg-green-500"
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{item.productName}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-semibold text-gray-900">{item.stock}</span>
                          <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">{item.minStock}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${color}`}>{label}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500 text-xs">{item.lastUpdated || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setAdjustItem(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                        >
                          Adjust
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Adjust Stock Modal ── */}
      {adjustItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Adjust Stock</h2>
              <button
                onClick={() => { setAdjustItem(null); setAdjustAmount(""); setAdjustReason("") }}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="font-medium text-gray-900">{adjustItem.productName}</p>
                <p className="text-sm text-gray-500 mt-0.5">Current stock: <strong>{adjustItem.stock}</strong></p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Adjustment Amount
                </label>
                <p className="text-xs text-gray-400 mb-2">Use positive (+) to add stock, negative (−) to remove</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAdjustAmount(String((parseInt(adjustAmount) || 0) - 1))}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-gray-600 hover:bg-gray-50"
                  >
                    <TrendingDown className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0"
                  />
                  <button
                    onClick={() => setAdjustAmount(String((parseInt(adjustAmount) || 0) + 1))}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-gray-600 hover:bg-gray-50"
                  >
                    <TrendingUp className="h-4 w-4" />
                  </button>
                </div>
                {adjustAmount && (
                  <p className="text-xs text-indigo-600 mt-1.5">
                    New stock: {Math.max(0, adjustItem.stock + (parseInt(adjustAmount) || 0))}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason (optional)</label>
                <input
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Physical count correction"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => { setAdjustItem(null); setAdjustAmount(""); setAdjustReason("") }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjust}
                disabled={!adjustAmount || adjustAmount === "0"}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Apply Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
