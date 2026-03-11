"use client"

import { useState } from "react"
import { useSupabaseData as useLocalStorage } from "@/hooks/use-supabase-data"
import { KpiCard } from "@/components/shared/kpi-card"
import { SearchInput } from "@/components/shared/search-input"
import { StatusBadge } from "@/components/shared/status-badge"
import { Package, Boxes, AlertTriangle, CheckCircle, Warehouse } from "lucide-react"
import { cn, formatDate } from "@/lib/utils"

interface InventoryItem {
  id: string; sku: string; name: string; category: string; stock: number; minStock: number; maxStock: number; warehouse: string; status: string; lastRestocked: string
}

const initialInventory: InventoryItem[] = [
  { id: "1", sku: "WH-001", name: "Wireless Headphones", category: "Electronics", stock: 45, minStock: 10, maxStock: 100, warehouse: "Main Warehouse", status: "in-stock", lastRestocked: "2025-02-15" },
  { id: "2", sku: "RS-002", name: "Running Shoes", category: "Footwear", stock: 30, minStock: 15, maxStock: 80, warehouse: "Store Front", status: "in-stock", lastRestocked: "2025-02-20" },
  { id: "3", sku: "CM-003", name: "Coffee Maker", category: "Appliances", stock: 8, minStock: 10, maxStock: 50, warehouse: "Main Warehouse", status: "low-stock", lastRestocked: "2025-01-28" },
  { id: "4", sku: "YM-004", name: "Yoga Mat", category: "Sports", stock: 60, minStock: 20, maxStock: 120, warehouse: "Storage Unit B", status: "in-stock", lastRestocked: "2025-03-01" },
  { id: "5", sku: "SW-005", name: "Smart Watch", category: "Electronics", stock: 12, minStock: 15, maxStock: 60, warehouse: "Main Warehouse", status: "low-stock", lastRestocked: "2025-02-10" },
  { id: "6", sku: "WJ-006", name: "Winter Jacket", category: "Clothing", stock: 35, minStock: 10, maxStock: 70, warehouse: "Store Front", status: "in-stock", lastRestocked: "2025-02-25" },
  { id: "7", sku: "BL-007", name: "Blender Pro", category: "Appliances", stock: 22, minStock: 8, maxStock: 40, warehouse: "Main Warehouse", status: "in-stock", lastRestocked: "2025-03-05" },
  { id: "8", sku: "TN-008", name: "Tennis Racket", category: "Sports", stock: 18, minStock: 10, maxStock: 50, warehouse: "Storage Unit B", status: "in-stock", lastRestocked: "2025-02-18" },
  { id: "9", sku: "DS-009", name: "Desk Lamp", category: "Furniture", stock: 5, minStock: 10, maxStock: 40, warehouse: "Main Warehouse", status: "low-stock", lastRestocked: "2025-01-15" },
  { id: "10", sku: "LP-010", name: "Laptop Stand", category: "Electronics", stock: 42, minStock: 15, maxStock: 80, warehouse: "Main Warehouse", status: "in-stock", lastRestocked: "2025-03-02" },
]

export default function InventoryPage() {
  const [items] = useLocalStorage<InventoryItem[]>("erp-inventory", initialInventory)
  const [search, setSearch] = useState("")

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase()))
  const totalStock = items.reduce((sum, i) => sum + i.stock, 0)
  const lowStockItems = items.filter(i => i.stock < i.minStock)
  const wellStocked = items.filter(i => i.stock >= i.minStock)

  const getStockPercent = (stock: number, max: number) => Math.min((stock / max) * 100, 100)
  const getStockColor = (stock: number, minStock: number, maxStock: number) => {
    const pct = getStockPercent(stock, maxStock)
    if (stock < minStock) return "bg-red-500"
    if (pct < 40) return "bg-yellow-500"
    return "bg-green-500"
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor stock levels and manage inventory in real-time</p>
      </div>

      {lowStockItems.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 font-medium">{lowStockItems.length} item(s) are running low on stock and need reordering</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Items" value={String(items.length)} subtitle="Unique products" icon={Package} />
        <KpiCard title="Total Stock" value={String(totalStock)} subtitle="Units available" icon={Boxes} />
        <KpiCard title="Low Stock Alerts" value={String(lowStockItems.length)} subtitle="Items need attention" icon={AlertTriangle} />
        <KpiCard title="Well Stocked" value={String(wellStocked.length)} subtitle="Healthy inventory" icon={CheckCircle} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Inventory Overview</h2>
          <p className="text-sm text-gray-500">Real-time stock levels and warehouse locations</p>
          <div className="mt-4"><SearchInput placeholder="Search inventory by product, SKU, or category..." value={search} onChange={setSearch} /></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Stock Level</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Min Stock</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Last Restocked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">{item.sku}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">{item.category}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-gray-100 rounded-full h-2">
                        <div className={cn("h-2 rounded-full transition-all", getStockColor(item.stock, item.minStock, item.maxStock))} style={{ width: `${getStockPercent(item.stock, item.maxStock)}%` }} />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{item.stock}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.minStock}</td>
                  <td className="px-4 py-3"><span className="flex items-center gap-1 text-sm text-gray-600"><Warehouse className="h-3.5 w-3.5 text-gray-400" />{item.warehouse}</span></td>
                  <td className="px-4 py-3">{item.stock < item.minStock ? <StatusBadge status="low-stock" /> : <StatusBadge status="active" />}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(item.lastRestocked)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
