"use client"

import { useState } from "react"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { PageHeader } from "@/components/layout/page-header"
import { ClipboardList, Clock, DollarSign, PackageCheck, X, Eye, Trash2 } from "lucide-react"
import { formatCurrency, formatDate, generateId } from "@/lib/utils"
import type { PurchaseOrder, Supplier, Product, InventoryItem, SupplierDebt } from "@/lib/types"

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    received: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  }
  const safe = status ?? "pending"
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${map[safe] ?? "bg-gray-100 text-gray-600"}`}>
      {safe.charAt(0).toUpperCase() + safe.slice(1)}
    </span>
  )
}

export default function PurchasesPage() {
  const [orders, setOrders] = useSupabaseData<PurchaseOrder[]>("erp-purchases", [])
  const [suppliers] = useSupabaseData<Supplier[]>("erp-suppliers", [])
  const [products] = useSupabaseData<Product[]>("erp-products", [])
  const [debts, setDebts] = useSupabaseData<SupplierDebt[]>("erp-supplier-debts", [])
  const [inventory, setInventory] = useSupabaseData<InventoryItem[]>("erp-inventory", [])

  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<PurchaseOrder | null>(null)

  // Form state
  const [formSupplierId, setFormSupplierId] = useState("")
  const [formProductId, setFormProductId] = useState("")
  const [formQty, setFormQty] = useState("10")
  const [formUnitPrice, setFormUnitPrice] = useState("")
  const [formAmountPaid, setFormAmountPaid] = useState("0")
  const [formExpectedDate, setFormExpectedDate] = useState("")

  const activeSuppliers = suppliers.filter((s) => s.status === "active")
  const activeProducts = products.filter((p) => p.status === "active")

  const handleProductChange = (productId: string) => {
    setFormProductId(productId)
    const product = products.find((p) => p.id === productId)
    if (product) setFormUnitPrice(String(product.cost))
  }

  const formTotal = (parseFloat(formQty) || 0) * (parseFloat(formUnitPrice) || 0)
  const formRemainingDebt = Math.max(0, formTotal - (parseFloat(formAmountPaid) || 0))

  const resetForm = () => {
    setFormSupplierId("")
    setFormProductId("")
    setFormQty("10")
    setFormUnitPrice("")
    setFormAmountPaid("0")
    setFormExpectedDate("")
  }

  const tabs = [
    { id: "all", label: "All Orders" },
    { id: "pending", label: "Pending" },
    { id: "received", label: "Received" },
  ]

  const tabFiltered =
    activeTab === "all" ? orders : orders.filter((o) => o.status === activeTab)
  const filtered = tabFiltered.filter(
    (o) =>
      (o.id ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (o.supplier ?? "").toLowerCase().includes(search.toLowerCase())
  )

  const totalOrders = orders.length
  const pendingCount = orders.filter((o) => o.status === "pending").length
  const totalValue = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0)
  const receivedUnits = orders
    .filter((o) => o.status === "received")
    .reduce((s, o) => s + (o.items ?? []).reduce((si, i) => si + (i?.qty ?? 0), 0), 0)

  const handleDeleteOrder = (order: PurchaseOrder) => {
    // Remove the order
    setOrders(orders.filter((o) => o.id !== order.id))

    // Reverse inventory: reduce stock by the quantities in this order
    const today = new Date().toISOString().split("T")[0]
    const items = order.items ?? []
    if (items.length > 0) {
      setInventory(
        inventory.map((inv) => {
          const orderedItem = items.find((item) => item.name === inv.productName)
          if (orderedItem) {
            return { ...inv, stock: Math.max(0, inv.stock - (orderedItem.qty ?? 0)), lastUpdated: today }
          }
          return inv
        })
      )
    }

    // Remove the associated supplier debt entry
    setDebts(debts.filter((d) => d.purchaseId !== order.id))

    setDeleteConfirm(null)
  }

  const handleCreateOrder = () => {
    if (!formSupplierId || !formProductId || !formQty || !formUnitPrice) return
    const supplier = suppliers.find((s) => s.id === formSupplierId)
    const product = products.find((p) => p.id === formProductId)
    if (!supplier || !product) return

    const qty = parseInt(formQty)
    const unitPrice = parseFloat(formUnitPrice)
    const total = qty * unitPrice
    const paid = parseFloat(formAmountPaid) || 0
    const remaining = Math.max(0, total - paid)
    const today = new Date().toISOString().split("T")[0]
    const poId = generateId("PO")

    const newOrder: PurchaseOrder = {
      id: poId,
      date: today,
      supplier: supplier.name,
      supplierId: supplier.id,
      items: [{ name: product.name, qty, cost: unitPrice }],
      total,
      status: "pending",
      expectedDate: formExpectedDate || today,
      amountPaid: paid,
      remainingDebt: remaining,
    }

    setOrders([newOrder, ...orders])

    // ── Update inventory stock ──────────────────────────────
    const existingInv = inventory.find((i) => i.productId === product.id)
    if (existingInv) {
      setInventory(
        inventory.map((i) =>
          i.productId === product.id
            ? { ...i, stock: i.stock + qty, lastUpdated: today }
            : i
        )
      )
    } else {
      const newInvItem: InventoryItem = {
        id: product.id,
        productId: product.id,
        productName: product.name,
        category: product.category,
        stock: qty,
        minStock: 10,
        lastUpdated: today,
      }
      setInventory([...inventory, newInvItem])
    }

    // ── Auto-create debt if remaining balance ───────────────
    if (remaining > 0) {
      const newDebt: SupplierDebt = {
        id: generateId("DEBT"),
        supplierId: supplier.id,
        supplierName: supplier.name,
        purchaseId: poId,
        totalAmount: total,
        amountPaid: paid,
        remainingDebt: remaining,
        status: paid > 0 ? "partial" : "outstanding",
        payments: paid > 0 ? [{ date: today, amount: paid }] : [],
        createdAt: today,
      }
      setDebts([newDebt, ...debts])
    }

    setShowNewOrder(false)
    resetForm()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Purchase Orders"
        subtitle="Manage purchase orders and supplier deliveries"
        action={{ label: "New Purchase Order", onClick: () => { resetForm(); setShowNewOrder(true) } }}
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Total Orders", value: String(totalOrders), icon: ClipboardList, color: "text-indigo-600 bg-indigo-50" },
          { title: "Pending", value: String(pendingCount), icon: Clock, color: "text-yellow-600 bg-yellow-50" },
          { title: "Total Value", value: formatCurrency(totalValue), icon: DollarSign, color: "text-blue-600 bg-blue-50" },
          { title: "Units Received", value: String(receivedUnits), icon: PackageCheck, color: "text-green-600 bg-green-50" },
        ].map((kpi) => (
          <div key={kpi.title} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500">{kpi.title}</p>
              <span className={`rounded-lg p-1.5 ${kpi.color}`}>
                <kpi.icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 text-xl font-bold text-gray-900">{kpi.value}</p>
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
            {tab.id !== "all" && (
              <span className="ml-1 text-xs">({orders.filter((o) => o.status === tab.id).length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by PO number or supplier..."
          className="w-full rounded-lg border border-gray-200 px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <ClipboardList className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No purchase orders found</p>
            <p className="text-sm text-gray-400 mt-1">
              {orders.length === 0
                ? "Create your first purchase order to get started"
                : "Try adjusting your search or filter"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">PO #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Supplier</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Items</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Paid</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Debt</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-gray-900">{o.id}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(o.date)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{o.supplier}</td>
                    <td className="px-4 py-3 text-gray-500">{(o.items ?? []).reduce((s, i) => s + (i?.qty ?? 0), 0)} units</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(o.total)}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">{formatCurrency(o.amountPaid || 0)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={(o.remainingDebt || 0) > 0 ? "text-red-600 font-medium" : "text-green-600"}>
                        {formatCurrency(o.remainingDebt || 0)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(o)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"
                          title="Delete order"
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

      {/* ── Order Detail Dialog ── */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setSelectedOrder(null)}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">PO {selectedOrder.id}</h2>
              <button onClick={() => setSelectedOrder(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Supplier:</span><p className="font-medium text-gray-900">{selectedOrder.supplier}</p></div>
                <div><span className="text-gray-500">Status:</span><div className="mt-1"><StatusBadge status={selectedOrder.status} /></div></div>
                <div><span className="text-gray-500">Order Date:</span><p className="font-medium">{formatDate(selectedOrder.date)}</p></div>
                <div><span className="text-gray-500">Expected:</span><p className="font-medium">{formatDate(selectedOrder.expectedDate)}</p></div>
                <div><span className="text-gray-500">Amount Paid:</span><p className="font-medium text-green-600">{formatCurrency(selectedOrder.amountPaid || 0)}</p></div>
                <div><span className="text-gray-500">Remaining Debt:</span><p className={`font-medium ${(selectedOrder.remainingDebt || 0) > 0 ? "text-red-600" : "text-green-600"}`}>{formatCurrency(selectedOrder.remainingDebt || 0)}</p></div>
              </div>
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Order Items</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 text-gray-500">Item</th>
                      <th className="text-right py-2 text-gray-500">Qty</th>
                      <th className="text-right py-2 text-gray-500">Cost</th>
                      <th className="text-right py-2 text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-2">{item.name}</td>
                        <td className="text-right py-2">{item.qty}</td>
                        <td className="text-right py-2">{formatCurrency(item.cost)}</td>
                        <td className="text-right py-2 font-medium">{formatCurrency(item.qty * item.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="pt-3 text-right font-semibold">Total:</td>
                      <td className="pt-3 text-right font-bold text-indigo-600">{formatCurrency(selectedOrder.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Purchase Order?</h3>
            <p className="text-sm text-gray-500 mb-1">
              PO <span className="font-mono font-medium">{deleteConfirm.id}</span> from{" "}
              <span className="font-medium">{deleteConfirm.supplier}</span>
            </p>
            <p className="text-sm text-gray-500 mb-6">
              This will reverse the inventory stock and remove the associated supplier debt. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteOrder(deleteConfirm)}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Purchase Order Dialog ── */}
      {showNewOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowNewOrder(false)}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">New Purchase Order</h2>
              <button onClick={() => setShowNewOrder(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {activeSuppliers.length === 0 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
                  No active suppliers found. Add suppliers first.
                </div>
              )}
              {activeProducts.length === 0 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
                  No active products found. Add products first.
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <select
                  value={formSupplierId}
                  onChange={(e) => setFormSupplierId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a supplier...</option>
                  {activeSuppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                <select
                  value={formProductId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a product...</option>
                  {activeProducts.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} (Cost: {formatCurrency(p.cost)})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={formQty}
                    onChange={(e) => setFormQty(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formUnitPrice}
                    onChange={(e) => setFormUnitPrice(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Order Total:</span>
                  <span className="font-bold text-gray-900">{formatCurrency(formTotal)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formAmountPaid}
                    onChange={(e) => setFormAmountPaid(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remaining Debt</label>
                  <div className={`w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-gray-50 font-semibold ${formRemainingDebt > 0 ? "text-red-600" : "text-green-600"}`}>
                    {formatCurrency(formRemainingDebt)}
                  </div>
                </div>
              </div>

              {formRemainingDebt > 0 && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <Clock className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    A supplier debt of {formatCurrency(formRemainingDebt)} will be automatically created for tracking.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery Date</label>
                <input
                  type="date"
                  value={formExpectedDate}
                  onChange={(e) => setFormExpectedDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowNewOrder(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateOrder}
                  disabled={!formSupplierId || !formProductId || !formQty || !formUnitPrice || formTotal <= 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
