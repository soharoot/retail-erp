"use client"

import { useState } from "react"
import { useSupabaseData as useLocalStorage } from "@/hooks/use-supabase-data"
import { PageHeader } from "@/components/layout/page-header"
import { KpiCard } from "@/components/shared/kpi-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { SearchInput } from "@/components/shared/search-input"
import { ShoppingCart, DollarSign, Receipt, TrendingUp, Printer, X } from "lucide-react"
import { formatCurrency, formatDate, generateId } from "@/lib/utils"

interface Sale {
  id: string; date: string; customer: string; items: { name: string; qty: number; price: number }[]; total: number; payment: string; status: string
}

interface Product {
  id: string; name: string; sku: string; category: string; price: number; cost: number; stock: number; minStock: number; status: string
}

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

function generateReceiptHTML(sale: Sale): string {
  const pad = (str: string, len: number) => str.length >= len ? str.substring(0, len) : str + " ".repeat(len - str.length)
  const padLeft = (str: string, len: number) => str.length >= len ? str.substring(0, len) : " ".repeat(len - str.length) + str

  let itemRows = ""
  sale.items.forEach(item => {
    const name = item.name.length > 16 ? item.name.substring(0, 15) + "." : item.name
    itemRows += `  ${pad(name, 17)} ${padLeft(String(item.qty), 3)}  ${padLeft("$" + item.price.toFixed(2), 8)}  ${padLeft("$" + (item.qty * item.price).toFixed(2), 9)}\n`
  })

  return `<!DOCTYPE html>
<html>
<head>
<title>Receipt - ${sale.id}</title>
<style>
  @media print {
    @page { margin: 0; size: 80mm auto; }
    body { margin: 0; }
    .no-print { display: none !important; }
  }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    line-height: 1.4;
    color: #000;
    background: #fff;
    display: flex;
    justify-content: center;
    padding: 20px;
  }
  .receipt {
    width: 302px;
    padding: 16px;
    border: 1px dashed #ccc;
  }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .divider { border-top: 1px dashed #000; margin: 8px 0; }
  .line { white-space: pre; font-size: 11px; }
  .total-line { font-size: 13px; font-weight: bold; }
  .btn-print {
    display: block;
    margin: 20px auto;
    padding: 10px 30px;
    font-size: 14px;
    background: #4f46e5;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
  }
  .btn-print:hover { background: #4338ca; }
</style>
</head>
<body>
<div>
<div class="receipt">
  <div class="center bold" style="font-size:14px;">================================</div>
  <div class="center bold" style="font-size:15px;">RETAIL ERP STORE</div>
  <div class="center" style="font-size:10px;">Business Management System</div>
  <div class="center bold" style="font-size:14px;">================================</div>

  <div style="margin-top:8px;">
    <div class="line">Invoice:  ${sale.id}</div>
    <div class="line">Date:     ${new Date(sale.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</div>
    <div class="line">Customer: ${sale.customer}</div>
  </div>

  <div class="divider"></div>

  <div class="line bold">${pad("  Item", 20)} ${padLeft("Qty", 3)}  ${padLeft("Price", 8)}  ${padLeft("Total", 9)}</div>
  <div class="divider"></div>
<div class="line">${itemRows}</div>
  <div class="divider"></div>

  <div class="center total-line" style="margin:8px 0;">
    GRAND TOTAL: $${sale.total.toFixed(2)}
  </div>

  <div class="divider"></div>

  <div class="line">Payment: ${sale.payment}</div>
  <div class="line">Status:  ${sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}</div>

  <div class="divider"></div>

  <div class="center" style="margin-top:8px;">
    <div class="bold">Thank you for your purchase!</div>
    <div>Please come again</div>
  </div>

  <div class="center bold" style="font-size:14px;margin-top:8px;">================================</div>
</div>
<button class="btn-print no-print" onclick="window.print()">Print Receipt</button>
</div>
</body>
</html>`
}

export default function SalesPage() {
  const [sales, setSales] = useLocalStorage<Sale[]>("erp-sales", initialSales)
  const [products] = useLocalStorage<Product[]>("erp-products", initialProducts)
  const [search, setSearch] = useState("")
  const [showNewSale, setShowNewSale] = useState(false)

  // New sale form state
  const [formCustomer, setFormCustomer] = useState("")
  const [formProductId, setFormProductId] = useState("")
  const [formQty, setFormQty] = useState("1")
  const [formPayment, setFormPayment] = useState("Card")

  const activeProducts = products.filter(p => p.status === "active")
  const selectedProduct = products.find(p => p.id === formProductId)
  const formTotal = selectedProduct ? (parseInt(formQty) || 0) * selectedProduct.price : 0

  const filtered = sales.filter(s => s.id.toLowerCase().includes(search.toLowerCase()) || s.customer.toLowerCase().includes(search.toLowerCase()))
  const todaySales = sales.filter(s => s.date === "2025-03-01" && s.status === "completed")
  const totalRevenue = sales.filter(s => s.status === "completed").reduce((sum, s) => sum + s.total, 0)
  const totalTransactions = sales.length

  const handlePrint = (sale: Sale) => {
    const html = generateReceiptHTML(sale)
    const w = window.open("", "_blank")
    if (w) {
      w.document.write(html)
      w.document.close()
    }
  }

  const resetForm = () => {
    setFormCustomer("")
    setFormProductId("")
    setFormQty("1")
    setFormPayment("Card")
  }

  const handleCreateSale = () => {
    if (!formCustomer || !formProductId || !formQty) return
    const product = products.find(p => p.id === formProductId)
    if (!product) return

    const qty = parseInt(formQty) || 1
    const total = qty * product.price
    const today = new Date().toISOString().split("T")[0]

    const newSale: Sale = {
      id: generateId("TXN"),
      date: today,
      customer: formCustomer,
      items: [{ name: product.name, qty, price: product.price }],
      total,
      payment: formPayment,
      status: "completed",
    }

    setSales([newSale, ...sales])
    setShowNewSale(false)
    resetForm()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Sales & Transactions" subtitle="Record sales and manage transactions" action={{ label: "New Sale", onClick: () => { resetForm(); setShowNewSale(true) } }} />

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
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handlePrint(sale)}
                      className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      <Printer className="h-4 w-4" />
                      Print
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Sale Dialog */}
      {showNewSale && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowNewSale(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">New Sale</h2>
              <button onClick={() => setShowNewSale(false)} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                <input
                  value={formCustomer}
                  onChange={e => setFormCustomer(e.target.value)}
                  placeholder="Customer name"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                <select
                  value={formProductId}
                  onChange={e => setFormProductId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a product...</option>
                  {activeProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.price)}</option>
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
                    onChange={e => setFormQty(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select
                    value={formPayment}
                    onChange={e => setFormPayment(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option>Card</option>
                    <option>Cash</option>
                    <option>Transfer</option>
                    <option>Check</option>
                  </select>
                </div>
              </div>

              {/* Auto-calculated total */}
              {selectedProduct && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Unit Price:</span>
                    <span className="text-gray-900">{formatCurrency(selectedProduct.price)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-500">Total:</span>
                    <span className="font-bold text-gray-900">{formatCurrency(formTotal)}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button onClick={() => setShowNewSale(false)} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button
                  onClick={handleCreateSale}
                  disabled={!formCustomer || !formProductId || !formQty || formTotal <= 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Complete Sale
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
