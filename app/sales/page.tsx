"use client"

import { useState } from "react"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { PageHeader } from "@/components/layout/page-header"
import { formatCurrency, formatDate, generateId } from "@/lib/utils"
import type { Sale, SaleItem, Product, InventoryItem, Settings } from "@/lib/types"
import { defaultSettings } from "@/lib/types"
import {
  ShoppingCart, Plus, Trash2, Edit2, X, Printer, DollarSign,
  TrendingUp, ShoppingBag, AlertTriangle,
} from "lucide-react"

type PaymentMethod = "cash" | "card" | "transfer" | "check"
type SaleStatus = "completed" | "pending" | "cancelled" | "refunded"

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    cancelled: "bg-gray-100 text-gray-600",
    refunded: "bg-red-100 text-red-700",
  }
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export default function SalesPage() {
  const [sales, setSales] = useSupabaseData<Sale[]>("erp-sales", [])
  const [products] = useSupabaseData<Product[]>("erp-products", [])
  const [inventory, setInventory] = useSupabaseData<InventoryItem[]>("erp-inventory", [])
  const [settings] = useSupabaseData<Settings>("erp-settings", defaultSettings)

  // Read tax rate from settings (stored as string e.g. "10", "15")
  const taxRate = parseFloat(settings?.taxRate ?? "10") / 100
  const taxRateLabel = `${parseFloat(settings?.taxRate ?? "10")}%`

  const [showModal, setShowModal] = useState(false)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [printSale, setPrintSale] = useState<Sale | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("All")

  // ── form state ──────────────────────────────────────────────
  const [formCustomer, setFormCustomer] = useState("")
  const [formPayment, setFormPayment] = useState<PaymentMethod>("cash")
  const [formStatus, setFormStatus] = useState<SaleStatus>("completed")
  const [formItems, setFormItems] = useState<Array<{ productId: string; qty: string; price: string }>>([
    { productId: "", qty: "1", price: "" },
  ])
  const [stockError, setStockError] = useState<string | null>(null)

  // ── derived ────────────────────────────────────────────────
  const filtered = sales.filter((s) => {
    const matchSearch =
      (s.id ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.customer ?? "").toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === "All" || s.status === filterStatus
    return matchSearch && matchStatus
  })

  const completedSales = sales.filter((s) => s.status === "completed")
  const totalRevenue = completedSales.reduce((sum, s) => sum + s.total, 0)
  const avgOrder = completedSales.length > 0 ? totalRevenue / completedSales.length : 0

  // ── modal helpers ───────────────────────────────────────────
  const openAdd = () => {
    setEditingSale(null)
    setFormCustomer("")
    setFormPayment("cash")
    setFormStatus("completed")
    setFormItems([{ productId: "", qty: "1", price: "" }])
    setStockError(null)
    setShowModal(true)
  }

  const openEdit = (sale: Sale) => {
    setEditingSale(sale)
    setFormCustomer(sale.customer)
    setFormPayment(sale.payment)
    setFormStatus(sale.status)
    setFormItems(
      sale.items.map((item) => {
        const prod = products.find((p) => p.name === item.name)
        return { productId: prod?.id ?? "", qty: String(item.qty), price: String(item.price) }
      })
    )
    setStockError(null)
    setShowModal(true)
  }

  const handleProductChange = (idx: number, productId: string) => {
    const prod = products.find((p) => p.id === productId)
    const updated = [...formItems]
    updated[idx] = { productId, qty: updated[idx].qty, price: prod ? String(prod.price) : "" }
    setFormItems(updated)
  }

  const addItem = () =>
    setFormItems([...formItems, { productId: "", qty: "1", price: "" }])

  const removeItem = (idx: number) => {
    if (formItems.length > 1) setFormItems(formItems.filter((_, i) => i !== idx))
  }

  const computedItems = formItems
    .filter((fi) => fi.productId && fi.qty && fi.price)
    .map((fi) => {
      const prod = products.find((p) => p.id === fi.productId)
      return {
        name: prod?.name ?? "",
        qty: parseInt(fi.qty) || 1,
        price: parseFloat(fi.price) || 0,
        costAtSale: prod?.cost ?? 0,
      }
    })

  const subtotal = computedItems.reduce((s, i) => s + i.qty * i.price, 0)
  const tax = subtotal * taxRate
  const grandTotal = subtotal + tax

  // ── save ────────────────────────────────────────────────────
  const handleSave = () => {
    setStockError(null)
    if (!formCustomer.trim() || computedItems.length === 0) return
    const today = new Date().toISOString().slice(0, 10)

    if (editingSale) {
      // ── EDIT: restore old inventory first, then deduct new ──
      const updatedInv = [...inventory]
      // 1. Restore stock from the old sale
      editingSale.items.forEach((oldItem) => {
        const idx = updatedInv.findIndex((i) => i.productName === oldItem.name)
        if (idx !== -1) updatedInv[idx] = { ...updatedInv[idx], stock: updatedInv[idx].stock + oldItem.qty }
      })
      // 2. Check stock for new items
      for (const item of computedItems) {
        const invItem = updatedInv.find((i) => i.productName === item.name)
        if (invItem && invItem.stock < item.qty) {
          setStockError(`Not enough stock for "${item.name}" (available: ${invItem.stock})`)
          return
        }
      }
      // 3. Deduct new quantities
      computedItems.forEach((item) => {
        const idx = updatedInv.findIndex((i) => i.productName === item.name)
        if (idx !== -1)
          updatedInv[idx] = {
            ...updatedInv[idx],
            stock: Math.max(0, updatedInv[idx].stock - item.qty),
            lastUpdated: today,
          }
      })
      setInventory(updatedInv)

      const updated: Sale = {
        ...editingSale,
        customer: formCustomer.trim(),
        items: computedItems,
        total: grandTotal,
        payment: formPayment,
        status: formStatus,
      }
      setSales(sales.map((s) => (s.id === editingSale.id ? updated : s)))
    } else {
      // ── CREATE: check stock then deduct ────────────────────
      for (const item of computedItems) {
        const invItem = inventory.find((i) => i.productName === item.name)
        if (invItem && invItem.stock < item.qty) {
          setStockError(`Not enough stock for "${item.name}" (available: ${invItem.stock})`)
          return
        }
      }

      const newSale: Sale = {
        id: generateId("SALE"),
        date: today,
        customer: formCustomer.trim(),
        items: computedItems,
        total: grandTotal,
        payment: formPayment,
        status: formStatus,
      }
      setSales([newSale, ...sales])

      // Deduct inventory
      setInventory(
        inventory.map((i) => {
          const item = computedItems.find((ci) => ci.name === i.productName)
          if (!item) return i
          return { ...i, stock: Math.max(0, i.stock - item.qty), lastUpdated: today }
        })
      )
    }

    setShowModal(false)
  }

  // ── delete ──────────────────────────────────────────────────
  const handleDelete = (saleId: string) => {
    const sale = sales.find((s) => s.id === saleId)
    if (sale) {
      const today = new Date().toISOString().slice(0, 10)
      // Restore inventory
      setInventory(
        inventory.map((i) => {
          const item = sale.items.find((si) => si.name === i.productName)
          if (!item) return i
          return { ...i, stock: i.stock + item.qty, lastUpdated: today }
        })
      )
    }
    setSales(sales.filter((s) => s.id !== saleId))
    setDeleteConfirm(null)
  }

  // ── print invoice ───────────────────────────────────────────
  const handlePrint = () => window.print()

  const companyName = settings.companyName || "Retail ERP Store"

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Sales Management"
        subtitle="Track and manage your sales orders"
        action={{ label: "New Sale", onClick: openAdd }}
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Sales", value: String(sales.length), icon: ShoppingBag, color: "text-indigo-600 bg-indigo-50" },
          { label: "Total Revenue", value: formatCurrency(totalRevenue), icon: DollarSign, color: "text-green-600 bg-green-50" },
          { label: "Avg. Order Value", value: formatCurrency(avgOrder), icon: TrendingUp, color: "text-blue-600 bg-blue-50" },
          { label: "Completed", value: String(completedSales.length), icon: ShoppingCart, color: "text-purple-600 bg-purple-50" },
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
              placeholder="Search sales..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <ShoppingCart className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="All">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {/* Sales table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingCart className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No sales found</p>
            <p className="text-sm text-gray-400 mt-1">
              {sales.length === 0 ? "Create your first sale to get started" : "Try adjusting your search or filter"}
            </p>
            {sales.length === 0 && (
              <button
                onClick={openAdd}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" /> New Sale
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Sale ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Items</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Total</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Payment</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">{sale.id}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(sale.date)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{sale.customer}</td>
                    <td className="px-4 py-3 text-gray-500">{sale.items.length} item{sale.items.length !== 1 ? "s" : ""}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(sale.total)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 capitalize">
                        {sale.payment}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={sale.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setPrintSale(sale)}
                          title="Invoice"
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(sale)}
                          title="Edit"
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(sale.id)}
                          title="Delete"
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add/Edit Sale Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingSale ? "Edit Sale" : "New Sale"}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              {stockError && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{stockError}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer Name *</label>
                  <input
                    value={formCustomer}
                    onChange={(e) => setFormCustomer(e.target.value)}
                    placeholder="Customer name"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Method</label>
                  <select
                    value={formPayment}
                    onChange={(e) => setFormPayment(e.target.value as PaymentMethod)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="transfer">Bank Transfer</option>
                    <option value="check">Check</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as SaleStatus)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Items *</label>
                  <button
                    onClick={addItem}
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  {formItems.map((fi, idx) => {
                    const prod = products.find((p) => p.id === fi.productId)
                    const invItem = inventory.find((i) => i.productId === fi.productId)
                    return (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-5">
                          {idx === 0 && <p className="text-xs text-gray-500 mb-1">Product</p>}
                          <select
                            value={fi.productId}
                            onChange={(e) => handleProductChange(idx, e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">Select product</option>
                            {products.filter((p) => p.status === "active").map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          {invItem && (
                            <p className="text-xs text-gray-400 mt-0.5">Stock: {invItem.stock}</p>
                          )}
                        </div>
                        <div className="col-span-2">
                          {idx === 0 && <p className="text-xs text-gray-500 mb-1">Qty</p>}
                          <input
                            type="number"
                            min="1"
                            max={invItem?.stock ?? undefined}
                            value={fi.qty}
                            onChange={(e) => {
                              const updated = [...formItems]
                              updated[idx] = { ...updated[idx], qty: e.target.value }
                              setFormItems(updated)
                            }}
                            className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="col-span-3">
                          {idx === 0 && <p className="text-xs text-gray-500 mb-1">Unit Price</p>}
                          <input
                            type="number"
                            step="0.01"
                            value={fi.price}
                            onChange={(e) => {
                              const updated = [...formItems]
                              updated[idx] = { ...updated[idx], price: e.target.value }
                              setFormItems(updated)
                            }}
                            className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="col-span-1">
                          {idx === 0 && <div className="mb-1 h-4" />}
                          <div className="text-xs text-gray-600 text-right py-2">
                            {fi.productId && fi.qty && fi.price
                              ? formatCurrency((parseInt(fi.qty) || 0) * (parseFloat(fi.price) || 0))
                              : "—"}
                          </div>
                        </div>
                        <div className="col-span-1">
                          {idx === 0 && <div className="mb-1 h-4" />}
                          <button
                            onClick={() => removeItem(idx)}
                            disabled={formItems.length === 1}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Totals */}
              {computedItems.length > 0 && (
                <div className="rounded-lg bg-gray-50 p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Tax ({taxRateLabel})</span><span className="font-medium">{formatCurrency(tax)}</span></div>
                  <div className="flex justify-between border-t pt-2 font-semibold">
                    <span>Total</span><span className="text-indigo-600">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4 flex-shrink-0">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formCustomer.trim() || computedItems.length === 0}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {editingSale ? "Save Changes" : "Create Sale"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Sale?</h3>
            <p className="text-sm text-gray-500 mb-6">
              This will permanently delete the sale and restore inventory stock.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Invoice / Print Modal ── */}
      {printSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Invoice</h2>
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  <Printer className="h-4 w-4" /> Print
                </button>
                <button onClick={() => setPrintSale(null)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div id="invoice-content" className="p-6 space-y-4">
              {/* Header */}
              <div className="text-center border-b pb-4">
                <h1 className="text-2xl font-bold text-gray-900">{companyName}</h1>
                <p className="text-sm text-gray-500">{settings.address}</p>
                <p className="text-sm text-gray-500">{settings.phone} | {settings.email}</p>
              </div>
              <div className="flex justify-between text-sm">
                <div>
                  <p className="text-gray-500">Invoice #</p>
                  <p className="font-semibold text-gray-900">{printSale.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500">Date</p>
                  <p className="font-semibold text-gray-900">{formatDate(printSale.date)}</p>
                </div>
              </div>
              <div className="text-sm border-t pt-3">
                <p className="text-gray-500">Bill To</p>
                <p className="font-semibold text-gray-900 mt-0.5">{printSale.customer}</p>
              </div>
              <table className="w-full text-sm border-t pt-4">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-gray-500">Item</th>
                    <th className="text-right py-2 text-gray-500">Qty</th>
                    <th className="text-right py-2 text-gray-500">Price</th>
                    <th className="text-right py-2 text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {printSale.items.map((item, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2">{item.name}</td>
                      <td className="text-right py-2">{item.qty}</td>
                      <td className="text-right py-2">{formatCurrency(item.price)}</td>
                      <td className="text-right py-2 font-medium">{formatCurrency(item.qty * item.price)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan={3} className="pt-2 text-right text-gray-500">Subtotal</td><td className="pt-2 text-right">{formatCurrency(printSale.items.reduce((s, i) => s + i.qty * i.price, 0))}</td></tr>
                  <tr><td colSpan={3} className="text-right text-gray-500">Tax ({taxRateLabel})</td><td className="text-right">{formatCurrency(printSale.items.reduce((s, i) => s + i.qty * i.price, 0) * taxRate)}</td></tr>
                  <tr className="border-t">
                    <td colSpan={3} className="pt-2 text-right font-bold text-gray-900">Total</td>
                    <td className="pt-2 text-right font-bold text-indigo-600">{formatCurrency(printSale.total)}</td>
                  </tr>
                </tfoot>
              </table>
              <div className="text-center text-xs text-gray-400 border-t pt-4">
                Payment: <span className="capitalize font-medium">{printSale.payment}</span> &nbsp;|&nbsp;
                Status: <span className="capitalize font-medium">{printSale.status}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
