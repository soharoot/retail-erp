"use client"

import { useState } from "react"
import { useSupabaseData as useLocalStorage } from "@/hooks/use-supabase-data"
import { PageHeader } from "@/components/layout/page-header"
import { KpiCard } from "@/components/shared/kpi-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { SearchInput } from "@/components/shared/search-input"
import { ClipboardList, Clock, DollarSign, PackageCheck, X, Eye } from "lucide-react"
import { formatCurrency, formatDate, generateId } from "@/lib/utils"

interface PurchaseOrder {
  id: string
  date: string
  supplier: string
  supplierId: string
  items: { name: string; qty: number; cost: number }[]
  total: number
  status: string
  expectedDate: string
  amountPaid: number
  remainingDebt: number
}

interface Supplier {
  id: string; name: string; contactPerson: string; email: string; phone: string; address: string; orders: number; totalSpent: number; status: string
}

interface Product {
  id: string; name: string; sku: string; category: string; price: number; cost: number; stock: number; minStock: number; status: string
}

interface DebtPayment { date: string; amount: number; note: string }
interface SupplierDebt {
  id: string; supplierId: string; supplierName: string; purchaseId: string
  totalAmount: number; amountPaid: number; remainingDebt: number; status: string
  payments: DebtPayment[]; createdAt: string
}

const initialSuppliers: Supplier[] = [
  { id: "1", name: "TechGear Wholesale", contactPerson: "John Smith", email: "john@techgear.com", phone: "+1 (555) 123-4567", address: "123 Tech Blvd, San Jose, CA", orders: 45, totalSpent: 125000, status: "active" },
  { id: "2", name: "SportsPro Suppliers", contactPerson: "Sarah Johnson", email: "sarah@sportspro.com", phone: "+1 (555) 234-5678", address: "456 Sports Ave, Portland, OR", orders: 32, totalSpent: 87500, status: "active" },
  { id: "3", name: "HomeComfort Ltd", contactPerson: "Michael Brown", email: "michael@homecomfort.com", phone: "+1 (555) 345-6789", address: "789 Home St, Chicago, IL", orders: 28, totalSpent: 65000, status: "active" },
  { id: "4", name: "Fashion Forward Inc", contactPerson: "Emma Wilson", email: "emma@fashionforward.com", phone: "+1 (555) 456-7890", address: "321 Fashion Rd, New York, NY", orders: 15, totalSpent: 42000, status: "inactive" },
  { id: "5", name: "Global Electronics Co", contactPerson: "David Park", email: "david@globalelec.com", phone: "+1 (555) 567-8901", address: "654 Circuit Way, Austin, TX", orders: 52, totalSpent: 198000, status: "active" },
  { id: "6", name: "FreshGoods Trading", contactPerson: "Lisa Chen", email: "lisa@freshgoods.com", phone: "+1 (555) 678-9012", address: "987 Trade Ln, Seattle, WA", orders: 19, totalSpent: 34000, status: "active" },
]

const initialProducts: Product[] = [
  { id: "1", name: "Wireless Headphones", sku: "WH-001", category: "Electronics", price: 129.99, cost: 65, stock: 45, minStock: 20, status: "active" },
  { id: "2", name: "Smart Watch", sku: "SW-002", category: "Electronics", price: 199.99, cost: 100, stock: 30, minStock: 15, status: "active" },
  { id: "3", name: "Running Shoes", sku: "RS-003", category: "Footwear", price: 89.99, cost: 40, stock: 60, minStock: 25, status: "active" },
  { id: "4", name: "Coffee Maker", sku: "CM-004", category: "Appliances", price: 79.99, cost: 35, stock: 25, minStock: 10, status: "active" },
  { id: "5", name: "Yoga Mat", sku: "YM-005", category: "Sports", price: 29.99, cost: 12, stock: 100, minStock: 30, status: "active" },
  { id: "6", name: "Laptop Stand", sku: "LS-006", category: "Electronics", price: 49.99, cost: 20, stock: 40, minStock: 15, status: "active" },
  { id: "7", name: "Winter Jacket", sku: "WJ-007", category: "Clothing", price: 149.99, cost: 55, stock: 35, minStock: 15, status: "active" },
  { id: "8", name: "Blender Pro", sku: "BP-008", category: "Appliances", price: 69.99, cost: 30, stock: 20, minStock: 10, status: "active" },
  { id: "9", name: "Tennis Racket", sku: "TR-009", category: "Sports", price: 159.99, cost: 70, stock: 15, minStock: 8, status: "active" },
  { id: "10", name: "Desk Lamp", sku: "DL-010", category: "Furniture", price: 39.99, cost: 18, stock: 50, minStock: 20, status: "active" },
]

const initialOrders: PurchaseOrder[] = [
  { id: "PO-001", date: "2025-03-01", supplier: "TechGear Wholesale", supplierId: "1", items: [{ name: "Wireless Headphones", qty: 50, cost: 65 }, { name: "Smart Watch", qty: 30, cost: 100 }], total: 6250, status: "pending", expectedDate: "2025-03-15", amountPaid: 2000, remainingDebt: 4250 },
  { id: "PO-002", date: "2025-02-25", supplier: "SportsPro Suppliers", supplierId: "2", items: [{ name: "Running Shoes", qty: 40, cost: 40 }], total: 1600, status: "approved", expectedDate: "2025-03-10", amountPaid: 0, remainingDebt: 1600 },
  { id: "PO-003", date: "2025-02-20", supplier: "HomeComfort Ltd", supplierId: "3", items: [{ name: "Coffee Maker", qty: 25, cost: 35 }, { name: "Blender Pro", qty: 20, cost: 30 }], total: 1475, status: "received", expectedDate: "2025-03-05", amountPaid: 1475, remainingDebt: 0 },
  { id: "PO-004", date: "2025-02-15", supplier: "Fashion Forward Inc", supplierId: "4", items: [{ name: "Winter Jacket", qty: 60, cost: 55 }], total: 3300, status: "received", expectedDate: "2025-03-01", amountPaid: 3300, remainingDebt: 0 },
  { id: "PO-005", date: "2025-02-10", supplier: "Global Electronics Co", supplierId: "5", items: [{ name: "Laptop Stand", qty: 80, cost: 20 }], total: 1600, status: "approved", expectedDate: "2025-03-08", amountPaid: 1600, remainingDebt: 0 },
  { id: "PO-006", date: "2025-02-05", supplier: "FreshGoods Trading", supplierId: "6", items: [{ name: "Desk Lamp", qty: 35, cost: 18 }], total: 630, status: "cancelled", expectedDate: "2025-02-28", amountPaid: 0, remainingDebt: 0 },
  { id: "PO-007", date: "2025-01-28", supplier: "TechGear Wholesale", supplierId: "1", items: [{ name: "Wireless Headphones", qty: 30, cost: 65 }], total: 1950, status: "received", expectedDate: "2025-02-15", amountPaid: 500, remainingDebt: 1450 },
  { id: "PO-008", date: "2025-01-20", supplier: "SportsPro Suppliers", supplierId: "2", items: [{ name: "Tennis Racket", qty: 20, cost: 70 }, { name: "Yoga Mat", qty: 50, cost: 12 }], total: 2000, status: "received", expectedDate: "2025-02-10", amountPaid: 2000, remainingDebt: 0 },
]

export default function PurchasesPage() {
  const [orders, setOrders] = useLocalStorage<PurchaseOrder[]>("erp-purchases", initialOrders)
  const [suppliers] = useLocalStorage<Supplier[]>("erp-suppliers", initialSuppliers)
  const [products] = useLocalStorage<Product[]>("erp-products", initialProducts)
  const [debts, setDebts] = useLocalStorage<SupplierDebt[]>("erp-supplier-debts", [])
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)

  // New order form state
  const [formSupplierId, setFormSupplierId] = useState("")
  const [formProductId, setFormProductId] = useState("")
  const [formQty, setFormQty] = useState("10")
  const [formUnitPrice, setFormUnitPrice] = useState("")
  const [formAmountPaid, setFormAmountPaid] = useState("0")
  const [formExpectedDate, setFormExpectedDate] = useState("")

  const activeSuppliers = suppliers.filter(s => s.status === "active")
  const activeProducts = products.filter(p => p.status === "active")

  // Auto-fill unit price when product changes
  const handleProductChange = (productId: string) => {
    setFormProductId(productId)
    const product = products.find(p => p.id === productId)
    if (product) setFormUnitPrice(String(product.cost))
  }

  // Computed form values
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

  const tabs = [{ id: "all", label: "All Orders" }, { id: "pending", label: "Pending" }, { id: "approved", label: "Approved" }, { id: "received", label: "Received" }]
  const tabFiltered = activeTab === "all" ? orders : orders.filter(o => o.status === activeTab)
  const filtered = tabFiltered.filter(o => o.id.toLowerCase().includes(search.toLowerCase()) || o.supplier.toLowerCase().includes(search.toLowerCase()))

  const pendingCount = orders.filter(o => o.status === "pending").length
  const monthSpent = orders.filter(o => o.date >= "2025-03-01" && o.status !== "cancelled").reduce((s, o) => s + o.total, 0)
  const receivedItems = orders.filter(o => o.status === "received").reduce((s, o) => s + o.items.reduce((si, i) => si + i.qty, 0), 0)

  const handleCreateOrder = () => {
    if (!formSupplierId || !formProductId || !formQty || !formUnitPrice) return
    const supplier = suppliers.find(s => s.id === formSupplierId)
    const product = products.find(p => p.id === formProductId)
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

    // Auto-create debt if there is remaining balance
    if (remaining > 0) {
      const debtId = generateId("DEBT")
      const newDebt: SupplierDebt = {
        id: debtId,
        supplierId: supplier.id,
        supplierName: supplier.name,
        purchaseId: poId,
        totalAmount: total,
        amountPaid: paid,
        remainingDebt: remaining,
        status: paid > 0 ? "partial" : "outstanding",
        payments: paid > 0 ? [{ date: today, amount: paid, note: "Initial payment" }] : [],
        createdAt: today,
      }
      setDebts([newDebt, ...debts])
    }

    setShowNewOrder(false)
    resetForm()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Purchase Orders" subtitle="Manage purchase orders and supplier deliveries" action={{ label: "New Purchase Order", onClick: () => { resetForm(); setShowNewOrder(true) } }} />

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
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Paid</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Remaining</th>
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
                <td className="px-4 py-3 text-sm text-green-600 font-medium">{formatCurrency(o.amountPaid || 0)}</td>
                <td className="px-4 py-3 text-sm font-medium">
                  <span className={(o.remainingDebt || 0) > 0 ? "text-red-600" : "text-green-600"}>
                    {formatCurrency(o.remainingDebt || 0)}
                  </span>
                </td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-3"><button onClick={() => setSelectedOrder(o)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"><Eye className="h-4 w-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Order Detail Dialog */}
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
                <div><span className="text-gray-500">Amount Paid:</span><p className="font-medium text-green-600">{formatCurrency(selectedOrder.amountPaid || 0)}</p></div>
                <div><span className="text-gray-500">Remaining Debt:</span><p className={`font-medium ${(selectedOrder.remainingDebt || 0) > 0 ? "text-red-600" : "text-green-600"}`}>{formatCurrency(selectedOrder.remainingDebt || 0)}</p></div>
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

      {/* New Purchase Order Dialog */}
      {showNewOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowNewOrder(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">New Purchase Order</h2>
              <button onClick={() => setShowNewOrder(false)} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Supplier select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <select
                  value={formSupplierId}
                  onChange={e => setFormSupplierId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a supplier...</option>
                  {activeSuppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Product select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                <select
                  value={formProductId}
                  onChange={e => handleProductChange(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a product...</option>
                  {activeProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Cost: ${p.cost})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={formQty}
                    onChange={e => setFormQty(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {/* Unit Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formUnitPrice}
                    onChange={e => setFormUnitPrice(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Auto-calculated total */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Order Total:</span>
                  <span className="font-bold text-gray-900">{formatCurrency(formTotal)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Amount Paid */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={formTotal}
                    value={formAmountPaid}
                    onChange={e => setFormAmountPaid(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {/* Remaining Debt (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remaining Debt</label>
                  <div className={`w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-gray-50 font-medium ${formRemainingDebt > 0 ? "text-red-600" : "text-green-600"}`}>
                    {formatCurrency(formRemainingDebt)}
                  </div>
                </div>
              </div>

              {formRemainingDebt > 0 && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <Clock className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">A supplier debt record of {formatCurrency(formRemainingDebt)} will be automatically created for tracking.</p>
                </div>
              )}

              {/* Expected Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery Date</label>
                <input
                  type="date"
                  value={formExpectedDate}
                  onChange={e => setFormExpectedDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button onClick={() => setShowNewOrder(false)} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
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
