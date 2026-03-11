"use client"

import { useState } from "react"
import { useSupabaseData as useLocalStorage } from "@/hooks/use-supabase-data"
import { PageHeader } from "@/components/layout/page-header"
import { KpiCard } from "@/components/shared/kpi-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { SearchInput } from "@/components/shared/search-input"
import { ClipboardList, Clock, DollarSign, PackageCheck, X, Eye } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"

interface PurchaseOrder {
  id: string; date: string; supplier: string; items: { name: string; qty: number; cost: number }[]; total: number; status: string; expectedDate: string
}

const initialOrders: PurchaseOrder[] = [
  { id: "PO-001", date: "2025-03-01", supplier: "TechGear Wholesale", items: [{ name: "Wireless Headphones", qty: 50, cost: 65 }, { name: "Smart Watch", qty: 30, cost: 100 }], total: 6250, status: "pending", expectedDate: "2025-03-15" },
  { id: "PO-002", date: "2025-02-25", supplier: "SportsPro Suppliers", items: [{ name: "Running Shoes", qty: 40, cost: 40 }], total: 1600, status: "approved", expectedDate: "2025-03-10" },
  { id: "PO-003", date: "2025-02-20", supplier: "HomeComfort Ltd", items: [{ name: "Coffee Maker", qty: 25, cost: 35 }, { name: "Blender Pro", qty: 20, cost: 30 }], total: 1475, status: "received", expectedDate: "2025-03-05" },
  { id: "PO-004", date: "2025-02-15", supplier: "Fashion Forward Inc", items: [{ name: "Winter Jacket", qty: 60, cost: 55 }], total: 3300, status: "received", expectedDate: "2025-03-01" },
  { id: "PO-005", date: "2025-02-10", supplier: "Global Electronics Co", items: [{ name: "Laptop Stand", qty: 80, cost: 20 }], total: 1600, status: "approved", expectedDate: "2025-03-08" },
  { id: "PO-006", date: "2025-02-05", supplier: "FreshGoods Trading", items: [{ name: "Desk Lamp", qty: 35, cost: 18 }], total: 630, status: "cancelled", expectedDate: "2025-02-28" },
  { id: "PO-007", date: "2025-01-28", supplier: "TechGear Wholesale", items: [{ name: "Wireless Headphones", qty: 30, cost: 65 }], total: 1950, status: "received", expectedDate: "2025-02-15" },
  { id: "PO-008", date: "2025-01-20", supplier: "SportsPro Suppliers", items: [{ name: "Tennis Racket", qty: 20, cost: 70 }, { name: "Yoga Mat", qty: 50, cost: 12 }], total: 2000, status: "received", expectedDate: "2025-02-10" },
]

export default function PurchasesPage() {
  const [orders] = useLocalStorage<PurchaseOrder[]>("erp-purchases", initialOrders)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)

  const tabs = [{ id: "all", label: "All Orders" }, { id: "pending", label: "Pending" }, { id: "approved", label: "Approved" }, { id: "received", label: "Received" }]
  const tabFiltered = activeTab === "all" ? orders : orders.filter(o => o.status === activeTab)
  const filtered = tabFiltered.filter(o => o.id.toLowerCase().includes(search.toLowerCase()) || o.supplier.toLowerCase().includes(search.toLowerCase()))

  const pendingCount = orders.filter(o => o.status === "pending").length
  const monthSpent = orders.filter(o => o.date >= "2025-03-01" && o.status !== "cancelled").reduce((s, o) => s + o.total, 0)
  const receivedItems = orders.filter(o => o.status === "received").reduce((s, o) => s + o.items.reduce((si, i) => si + i.qty, 0), 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Purchase Orders" subtitle="Manage purchase orders and supplier deliveries" action={{ label: "New Purchase Order", onClick: () => setShowNewOrder(true) }} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total POs" value={String(orders.length)} subtitle="All purchase orders" icon={ClipboardList} />
        <KpiCard title="Pending Orders" value={String(pendingCount)} subtitle="Awaiting approval" icon={Clock} />
        <KpiCard title="Spent This Month" value={formatCurrency(monthSpent)} subtitle="Current month" icon={DollarSign} />
        <KpiCard title="Items Received" value={String(receivedItems)} subtitle="Total units received" icon={PackageCheck} />
      </div>

      <div className="flex gap-4 border-b border-gray-200">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {tab.label} {tab.id !== "all" && <span className="ml-1 text-xs">({orders.filter(o => o.status === tab.id).length})</span>}
          </button>
        ))}
      </div>

      <SearchInput placeholder="Search by PO number or supplier..." value={search} onChange={setSearch} />

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">PO Number</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Supplier</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Items</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Expected Date</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(o => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">{o.id}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{formatDate(o.date)}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{o.supplier}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{o.items.reduce((s, i) => s + i.qty, 0)} units</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(o.total)}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{formatDate(o.expectedDate)}</td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-3"><button onClick={() => setSelectedOrder(o)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"><Eye className="h-4 w-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">Purchase Order {selectedOrder.id}</h2>
              <button onClick={() => setSelectedOrder(null)} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Supplier:</span><p className="font-medium text-gray-900">{selectedOrder.supplier}</p></div>
                <div><span className="text-gray-500">Status:</span><div className="mt-1"><StatusBadge status={selectedOrder.status} /></div></div>
                <div><span className="text-gray-500">Order Date:</span><p className="font-medium text-gray-900">{formatDate(selectedOrder.date)}</p></div>
                <div><span className="text-gray-500">Expected:</span><p className="font-medium text-gray-900">{formatDate(selectedOrder.expectedDate)}</p></div>
              </div>
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Order Items</h4>
                <table className="w-full text-sm">
                  <thead><tr className="border-b"><th className="text-left py-2 text-gray-500">Item</th><th className="text-right py-2 text-gray-500">Qty</th><th className="text-right py-2 text-gray-500">Cost</th><th className="text-right py-2 text-gray-500">Total</th></tr></thead>
                  <tbody>
                    {selectedOrder.items.map((item, i) => (
                      <tr key={i} className="border-b border-gray-100"><td className="py-2">{item.name}</td><td className="text-right py-2">{item.qty}</td><td className="text-right py-2">{formatCurrency(item.cost)}</td><td className="text-right py-2 font-medium">{formatCurrency(item.qty * item.cost)}</td></tr>
                    ))}
                  </tbody>
                  <tfoot><tr><td colSpan={3} className="pt-3 text-right font-semibold">Total:</td><td className="pt-3 text-right font-bold text-indigo-600">{formatCurrency(selectedOrder.total)}</td></tr></tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNewOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowNewOrder(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">New Purchase Order</h2>
              <button onClick={() => setShowNewOrder(false)} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label><select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"><option>TechGear Wholesale</option><option>SportsPro Suppliers</option><option>HomeComfort Ltd</option><option>Global Electronics Co</option></select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Product</label><input placeholder="Product name" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label><input type="number" defaultValue="10" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery Date</label><input type="date" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button onClick={() => setShowNewOrder(false)} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={() => setShowNewOrder(false)} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">Create Order</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
