"use client"

import { useState } from "react"
import { useSupabaseData as useLocalStorage } from "@/hooks/use-supabase-data"
import { PageHeader } from "@/components/layout/page-header"
import { KpiCard } from "@/components/shared/kpi-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { SearchInput } from "@/components/shared/search-input"
import { ShoppingCart, DollarSign, Receipt, TrendingUp, FileText, X } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"

interface Sale {
  id: string; date: string; customer: string; items: { name: string; qty: number; price: number }[]; total: number; payment: string; status: string
}

const initialSales: Sale[] = [
  { id: "TXN-001", date: "2025-03-01", customer: "Alice Johnson", items: [{ name: "Wireless Headphones", qty: 2, price: 129.99 }], total: 285.97, payment: "Card", status: "completed" },
  { id: "TXN-002", date: "2025-02-28", customer: "Bob Smith", items: [{ name: "Running Shoes", qty: 1, price: 89.99 }, { name: "Yoga Mat", qty: 2, price: 29.99 }], total: 164.97, payment: "Cash", status: "completed" },
  { id: "TXN-003", date: "2025-02-25", customer: "Carol Williams", items: [{ name: "Smart Watch", qty: 1, price: 199.99 }], total: 219.99, payment: "Card", status: "completed" },
  { id: "TXN-004", date: "2025-02-22", customer: "David Lee", items: [{ name: "Coffee Maker", qty: 1, price: 79.99 }], total: 87.99, payment: "Transfer", status: "pending" },
  { id: "TXN-005", date: "2025-02-20", customer: "Eva Martinez", items: [{ name: "Winter Jacket", qty: 1, price: 149.99 }], total: 164.99, payment: "Card", status: "completed" },
  { id: "TXN-006", date: "2025-02-18", customer: "Frank Wilson", items: [{ name: "Blender Pro", qty: 1, price: 69.99 }, { name: "Coffee Maker", qty: 1, price: 79.99 }], total: 164.98, payment: "Cash", status: "completed" },
  { id: "TXN-007", date: "2025-02-15", customer: "Grace Kim", items: [{ name: "Laptop Stand", qty: 2, price: 49.99 }], total: 109.98, payment: "Card", status: "cancelled" },
  { id: "TXN-008", date: "2025-02-12", customer: "Henry Brown", items: [{ name: "Tennis Racket", qty: 1, price: 159.99 }], total: 175.99, payment: "Transfer", status: "completed" },
  { id: "TXN-009", date: "2025-02-10", customer: "Iris Chen", items: [{ name: "Desk Lamp", qty: 3, price: 39.99 }], total: 131.97, payment: "Card", status: "completed" },
  { id: "TXN-010", date: "2025-02-08", customer: "Jack Davis", items: [{ name: "Wireless Headphones", qty: 1, price: 129.99 }, { name: "Smart Watch", qty: 1, price: 199.99 }], total: 362.98, payment: "Card", status: "refunded" },
]

export default function SalesPage() {
  const [sales, setSales] = useLocalStorage<Sale[]>("erp-sales", initialSales)
  const [search, setSearch] = useState("")
  const [showNewSale, setShowNewSale] = useState(false)

  const filtered = sales.filter(s => s.id.toLowerCase().includes(search.toLowerCase()) || s.customer.toLowerCase().includes(search.toLowerCase()))
  const todaySales = sales.filter(s => s.date === "2025-03-01" && s.status === "completed")
  const totalRevenue = sales.filter(s => s.status === "completed").reduce((sum, s) => sum + s.total, 0)
  const totalTransactions = sales.length

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Sales & Transactions" subtitle="Record sales and manage transactions" action={{ label: "New Sale", onClick: () => setShowNewSale(true) }} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Today's Sales" value={String(todaySales.length)} subtitle="Transactions today" icon={ShoppingCart} />
        <KpiCard title="Today's Revenue" value={formatCurrency(todaySales.reduce((s, t) => s + t.total, 0))} subtitle="Sales revenue" icon={DollarSign} />
        <KpiCard title="Total Transactions" value={String(totalTransactions)} subtitle="All time" icon={Receipt} />
        <KpiCard title="Total Revenue" value={formatCurrency(totalRevenue)} subtitle="All time revenue" icon={TrendingUp} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
          <p className="text-sm text-gray-500">View and manage all sales transactions</p>
          <div className="mt-4"><SearchInput placeholder="Search transactions by ID or customer name..." value={search} onChange={setSearch} /></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Transaction ID</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Payment</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(sale => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">{sale.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(sale.date)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{sale.customer}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{sale.items.reduce((s, i) => s + i.qty, 0)} item(s)</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(sale.total)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{sale.payment}</td>
                  <td className="px-4 py-3"><StatusBadge status={sale.status} /></td>
                  <td className="px-4 py-3"><button className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"><FileText className="h-4 w-4" />Invoice</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showNewSale && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowNewSale(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">New Sale</h2>
              <button onClick={() => setShowNewSale(false)} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Customer</label><input placeholder="Customer name" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Product</label><select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"><option>Wireless Headphones - $129.99</option><option>Running Shoes - $89.99</option><option>Coffee Maker - $79.99</option><option>Smart Watch - $199.99</option><option>Yoga Mat - $29.99</option></select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label><input type="number" defaultValue="1" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label><select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"><option>Card</option><option>Cash</option><option>Transfer</option><option>Check</option></select></div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button onClick={() => setShowNewSale(false)} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={() => setShowNewSale(false)} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">Complete Sale</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
