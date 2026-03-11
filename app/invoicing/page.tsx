"use client"

import { useState } from "react"
import { useSupabaseData as useLocalStorage } from "@/hooks/use-supabase-data"
import {
  FileText,
  DollarSign,
  Clock,
  AlertCircle,
  Eye,
  Send,
  Pencil,
  X,
  Plus,
  Trash2,
} from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { SearchInput } from "@/components/shared/search-input"
import { KpiCard } from "@/components/shared/kpi-card"
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils"

interface InvoiceItem {
  description: string
  quantity: number
  price: number
  total: number
}

interface Invoice {
  id: string
  number: string
  date: string
  dueDate: string
  customer: string
  customerId: string
  items: InvoiceItem[]
  subtotal: number
  tax: number
  total: number
  amountPaid: number
  status: string
  notes: string
}

const initialInvoices: Invoice[] = [
  { id: "1", number: "INV-2025-001", date: "2025-01-15", dueDate: "2025-02-15", customer: "Alice Johnson", customerId: "c1", items: [{ description: "Wireless Headphones", quantity: 2, price: 129.99, total: 259.98 }], subtotal: 259.98, tax: 26.00, total: 285.98, amountPaid: 285.98, status: "paid", notes: "" },
  { id: "2", number: "INV-2025-002", date: "2025-01-20", dueDate: "2025-02-20", customer: "Bob Martinez", customerId: "c2", items: [{ description: "Standing Desk", quantity: 1, price: 449.99, total: 449.99 }, { description: "Ergonomic Chair", quantity: 1, price: 299.99, total: 299.99 }], subtotal: 749.98, tax: 75.00, total: 824.98, amountPaid: 824.98, status: "paid", notes: "Express delivery requested" },
  { id: "3", number: "INV-2025-003", date: "2025-02-01", dueDate: "2025-03-01", customer: "Carol White", customerId: "c3", items: [{ description: "Bluetooth Speaker", quantity: 3, price: 79.99, total: 239.97 }], subtotal: 239.97, tax: 24.00, total: 263.97, amountPaid: 0, status: "sent", notes: "" },
  { id: "4", number: "INV-2025-004", date: "2025-02-10", dueDate: "2025-03-10", customer: "David Lee", customerId: "c4", items: [{ description: "Running Shoes", quantity: 2, price: 89.99, total: 179.98 }, { description: "Yoga Mat Premium", quantity: 1, price: 49.99, total: 49.99 }], subtotal: 229.97, tax: 23.00, total: 252.97, amountPaid: 0, status: "overdue", notes: "Follow up sent" },
  { id: "5", number: "INV-2025-005", date: "2025-02-15", dueDate: "2025-03-15", customer: "Emma Davis", customerId: "c5", items: [{ description: "Winter Jacket", quantity: 1, price: 159.99, total: 159.99 }], subtotal: 159.99, tax: 16.00, total: 175.99, amountPaid: 0, status: "draft", notes: "Awaiting confirmation" },
  { id: "6", number: "INV-2025-006", date: "2025-02-20", dueDate: "2025-03-20", customer: "Frank Wilson", customerId: "c6", items: [{ description: "Blender Pro 3000", quantity: 2, price: 199.99, total: 399.98 }], subtotal: 399.98, tax: 40.00, total: 439.98, amountPaid: 439.98, status: "paid", notes: "" },
  { id: "7", number: "INV-2025-007", date: "2025-03-01", dueDate: "2025-04-01", customer: "Grace Kim", customerId: "c7", items: [{ description: "Hiking Boots", quantity: 1, price: 139.99, total: 139.99 }, { description: "Backpack", quantity: 1, price: 89.99, total: 89.99 }], subtotal: 229.98, tax: 23.00, total: 252.98, amountPaid: 0, status: "sent", notes: "" },
  { id: "8", number: "INV-2025-008", date: "2025-03-05", dueDate: "2025-04-05", customer: "Henry Chen", customerId: "c8", items: [{ description: "Laptop Stand", quantity: 3, price: 59.99, total: 179.97 }], subtotal: 179.97, tax: 18.00, total: 197.97, amountPaid: 0, status: "draft", notes: "" },
  { id: "9", number: "INV-2025-009", date: "2025-03-08", dueDate: "2025-02-08", customer: "Isabella Brown", customerId: "c9", items: [{ description: "Monitor 27 inch", quantity: 1, price: 349.99, total: 349.99 }], subtotal: 349.99, tax: 35.00, total: 384.99, amountPaid: 0, status: "overdue", notes: "Second reminder sent" },
  { id: "10", number: "INV-2025-010", date: "2025-03-09", dueDate: "2025-04-09", customer: "Jack Thompson", customerId: "c10", items: [{ description: "Keyboard Mechanical", quantity: 2, price: 129.99, total: 259.98 }, { description: "Mouse Wireless", quantity: 2, price: 49.99, total: 99.98 }], subtotal: 359.96, tax: 36.00, total: 395.96, amountPaid: 395.96, status: "paid", notes: "Repeat customer" },
]

const statusTabs = ["all", "draft", "sent", "paid", "overdue"] as const

interface LineItemForm {
  description: string
  quantity: string
  price: string
}

const emptyLineItem: LineItemForm = { description: "", quantity: "1", price: "" }

const emptyInvoiceForm = {
  customer: "",
  date: new Date().toISOString().split("T")[0],
  dueDate: "",
  notes: "",
}

export default function InvoicingPage() {
  const [invoices, setInvoices] = useLocalStorage<Invoice[]>("erp-invoices", initialInvoices)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState<string>("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showPreview, setShowPreview] = useState<Invoice | null>(null)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [form, setForm] = useState(emptyInvoiceForm)
  const [lineItems, setLineItems] = useState<LineItemForm[]>([{ ...emptyLineItem }])

  // KPI calculations
  const totalInvoices = invoices.length
  const paidAmount = invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + i.total, 0)
  const pendingAmount = invoices.filter((i) => i.status === "sent" || i.status === "draft").reduce((sum, i) => sum + i.total, 0)
  const overdueCount = invoices.filter((i) => i.status === "overdue").length

  // Filter invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesTab = activeTab === "all" || inv.status === activeTab
    const q = search.toLowerCase()
    const matchesSearch =
      inv.number.toLowerCase().includes(q) ||
      inv.customer.toLowerCase().includes(q) ||
      inv.total.toString().includes(q)
    return matchesTab && matchesSearch
  })

  const openCreateDialog = () => {
    setEditingInvoice(null)
    setForm(emptyInvoiceForm)
    setLineItems([{ ...emptyLineItem }])
    setShowCreateDialog(true)
  }

  const openEditDialog = (invoice: Invoice) => {
    setEditingInvoice(invoice)
    setForm({
      customer: invoice.customer,
      date: invoice.date,
      dueDate: invoice.dueDate,
      notes: invoice.notes,
    })
    setLineItems(
      invoice.items.map((item) => ({
        description: item.description,
        quantity: item.quantity.toString(),
        price: item.price.toString(),
      }))
    )
    setShowCreateDialog(true)
  }

  const addLineItem = () => {
    setLineItems([...lineItems, { ...emptyLineItem }])
  }

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const updateLineItem = (index: number, field: keyof LineItemForm, value: string) => {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }
    setLineItems(updated)
  }

  const calcLineTotal = (item: LineItemForm) => {
    return (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)
  }

  const calcSubtotal = () => lineItems.reduce((sum, item) => sum + calcLineTotal(item), 0)
  const calcTax = () => Math.round(calcSubtotal() * 0.1 * 100) / 100
  const calcTotal = () => calcSubtotal() + calcTax()

  const handleSaveInvoice = () => {
    if (!form.customer || !form.date || !form.dueDate) return
    if (lineItems.some((li) => !li.description || !li.price)) return

    const items: InvoiceItem[] = lineItems.map((li) => ({
      description: li.description,
      quantity: parseFloat(li.quantity) || 1,
      price: parseFloat(li.price) || 0,
      total: calcLineTotal(li),
    }))

    if (editingInvoice) {
      setInvoices(
        invoices.map((inv) =>
          inv.id === editingInvoice.id
            ? {
                ...inv,
                customer: form.customer,
                date: form.date,
                dueDate: form.dueDate,
                notes: form.notes,
                items,
                subtotal: calcSubtotal(),
                tax: calcTax(),
                total: calcTotal(),
              }
            : inv
        )
      )
    } else {
      const newInvoice: Invoice = {
        id: Date.now().toString(),
        number: `INV-2025-${String(invoices.length + 1).padStart(3, "0")}`,
        date: form.date,
        dueDate: form.dueDate,
        customer: form.customer,
        customerId: `c${invoices.length + 1}`,
        items,
        subtotal: calcSubtotal(),
        tax: calcTax(),
        total: calcTotal(),
        amountPaid: 0,
        status: "draft",
        notes: form.notes,
      }
      setInvoices([...invoices, newInvoice])
    }
    setShowCreateDialog(false)
    setEditingInvoice(null)
  }

  const markAsSent = (id: string) => {
    setInvoices(invoices.map((inv) => (inv.id === id && inv.status === "draft" ? { ...inv, status: "sent" } : inv)))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoicing"
        subtitle="Create and manage invoices"
        action={{ label: "Create Invoice", onClick: openCreateDialog }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total Invoices" value={totalInvoices.toString()} icon={FileText} subtitle="All invoices" />
        <KpiCard title="Paid Amount" value={formatCurrency(paidAmount)} icon={DollarSign} subtitle="Revenue collected" />
        <KpiCard title="Pending Amount" value={formatCurrency(pendingAmount)} icon={Clock} subtitle="Awaiting payment" />
        <KpiCard title="Overdue" value={overdueCount.toString()} icon={AlertCircle} subtitle="Require follow-up" />
      </div>

      {/* Filter Tabs & Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
              {statusTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                    activeTab === tab
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="sm:w-80">
              <SearchInput placeholder="Search by invoice #, customer..." value={search} onChange={setSearch} />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{invoice.number}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(invoice.date)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{invoice.customer}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">{formatCurrency(invoice.total)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(invoice.dueDate)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setShowPreview(invoice)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-colors"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {invoice.status === "draft" && (
                        <button
                          onClick={() => markAsSent(invoice.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Send"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => openEditDialog(invoice)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="text-sm text-gray-500">No invoices found matching your criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            Showing {filteredInvoices.length} of {invoices.length} invoices
          </p>
        </div>
      </div>

      {/* Create / Edit Invoice Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingInvoice ? "Edit Invoice" : "Create New Invoice"}
              </h3>
              <button
                onClick={() => {
                  setShowCreateDialog(false)
                  setEditingInvoice(null)
                }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                  <input
                    type="text"
                    value={form.customer}
                    onChange={(e) => setForm({ ...form, customer: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Customer name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Line Items</label>
                  <button
                    onClick={addLineItem}
                    className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase px-1">
                    <div className="col-span-5">Description</div>
                    <div className="col-span-2">Qty</div>
                    <div className="col-span-2">Price</div>
                    <div className="col-span-2 text-right">Total</div>
                    <div className="col-span-1"></div>
                  </div>
                  {lineItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateLineItem(index, "description", e.target.value)}
                          className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="Item description"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, "quantity", e.target.value)}
                          className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          min="1"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => updateLineItem(index, "price", e.target.value)}
                          className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="0.00"
                          step="0.01"
                        />
                      </div>
                      <div className="col-span-2 text-right text-sm font-medium text-gray-900">
                        {formatCurrency(calcLineTotal(item))}
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <button
                          onClick={() => removeLineItem(index)}
                          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"
                          disabled={lineItems.length <= 1}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="font-medium text-gray-900">{formatCurrency(calcSubtotal())}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Tax (10%)</span>
                      <span className="font-medium text-gray-900">{formatCurrency(calcTax())}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold border-t border-gray-200 pt-2">
                      <span className="text-gray-900">Total</span>
                      <span className="text-gray-900">{formatCurrency(calcTotal())}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  rows={2}
                  placeholder="Add any notes for this invoice..."
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowCreateDialog(false)
                  setEditingInvoice(null)
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveInvoice}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
              >
                <Plus className="h-4 w-4" />
                {editingInvoice ? "Update Invoice" : "Create Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Preview Dialog */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Invoice Preview</h3>
              <button
                onClick={() => setShowPreview(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-8">
              {/* Invoice Header */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">INVOICE</h2>
                  <p className="text-sm text-gray-500 mt-1">{showPreview.number}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">Your Company Name</p>
                  <p className="text-sm text-gray-500">123 Business Street</p>
                  <p className="text-sm text-gray-500">City, State 10001</p>
                </div>
              </div>

              {/* Bill To & Dates */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Bill To</p>
                  <p className="text-sm font-medium text-gray-900">{showPreview.customer}</p>
                </div>
                <div className="text-right space-y-1">
                  <div className="flex justify-between">
                    <span className="text-xs font-medium text-gray-500 uppercase">Invoice Date</span>
                    <span className="text-sm text-gray-900">{formatDate(showPreview.date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs font-medium text-gray-500 uppercase">Due Date</span>
                    <span className="text-sm text-gray-900">{formatDate(showPreview.dueDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs font-medium text-gray-500 uppercase">Status</span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${getStatusColor(showPreview.status)}`}>
                      {showPreview.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full mb-6">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="pb-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="pb-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="pb-2 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="pb-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {showPreview.items.map((item, index) => (
                    <tr key={index}>
                      <td className="py-3 text-sm text-gray-900">{item.description}</td>
                      <td className="py-3 text-sm text-gray-600 text-right">{item.quantity}</td>
                      <td className="py-3 text-sm text-gray-600 text-right">{formatCurrency(item.price)}</td>
                      <td className="py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="text-gray-900">{formatCurrency(showPreview.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tax</span>
                    <span className="text-gray-900">{formatCurrency(showPreview.tax)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t-2 border-gray-200 pt-2">
                    <span className="text-gray-900">Total</span>
                    <span className="text-gray-900">{formatCurrency(showPreview.total)}</span>
                  </div>
                  {showPreview.amountPaid > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">Amount Paid</span>
                      <span className="text-green-600 font-medium">{formatCurrency(showPreview.amountPaid)}</span>
                    </div>
                  )}
                  {showPreview.total - showPreview.amountPaid > 0 && (
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-red-600">Balance Due</span>
                      <span className="text-red-600">{formatCurrency(showPreview.total - showPreview.amountPaid)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {showPreview.notes && (
                <div className="mt-8 pt-4 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Notes</p>
                  <p className="text-sm text-gray-600">{showPreview.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
