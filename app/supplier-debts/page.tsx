"use client"

import { useState } from "react"
import { useSupabaseData as useLocalStorage } from "@/hooks/use-supabase-data"
import { PageHeader } from "@/components/layout/page-header"
import { KpiCard } from "@/components/shared/kpi-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { SearchInput } from "@/components/shared/search-input"
import { Landmark, AlertCircle, CheckCircle2, Clock, X, DollarSign } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"

interface DebtPayment {
  date: string
  amount: number
  note: string
}

interface SupplierDebt {
  id: string
  supplierId: string
  supplierName: string
  purchaseId: string
  totalAmount: number
  amountPaid: number
  remainingDebt: number
  status: string
  payments: DebtPayment[]
  createdAt: string
}

interface PurchaseOrder {
  id: string
  date: string
  supplier: string
  supplierId?: string
  items: { name: string; qty: number; cost: number }[]
  total: number
  status: string
  expectedDate: string
  amountPaid: number
  remainingDebt: number
}

const initialDebts: SupplierDebt[] = [
  {
    id: "DEBT-001",
    supplierId: "1",
    supplierName: "TechGear Wholesale",
    purchaseId: "PO-001",
    totalAmount: 6250,
    amountPaid: 2000,
    remainingDebt: 4250,
    status: "partial",
    payments: [{ date: "2025-03-05", amount: 2000, note: "Initial payment on delivery" }],
    createdAt: "2025-03-01",
  },
  {
    id: "DEBT-002",
    supplierId: "2",
    supplierName: "SportsPro Suppliers",
    purchaseId: "PO-002",
    totalAmount: 1600,
    amountPaid: 0,
    remainingDebt: 1600,
    status: "outstanding",
    payments: [],
    createdAt: "2025-02-25",
  },
  {
    id: "DEBT-003",
    supplierId: "5",
    supplierName: "Global Electronics Co",
    purchaseId: "PO-005",
    totalAmount: 1600,
    amountPaid: 1600,
    remainingDebt: 0,
    status: "paid",
    payments: [
      { date: "2025-02-15", amount: 800, note: "First installment" },
      { date: "2025-03-01", amount: 800, note: "Final payment" },
    ],
    createdAt: "2025-02-10",
  },
  {
    id: "DEBT-004",
    supplierId: "1",
    supplierName: "TechGear Wholesale",
    purchaseId: "PO-007",
    totalAmount: 1950,
    amountPaid: 500,
    remainingDebt: 1450,
    status: "partial",
    payments: [{ date: "2025-02-01", amount: 500, note: "Partial advance" }],
    createdAt: "2025-01-28",
  },
]

const initialPurchases: PurchaseOrder[] = [
  { id: "PO-001", date: "2025-03-01", supplier: "TechGear Wholesale", supplierId: "1", items: [{ name: "Wireless Headphones", qty: 50, cost: 65 }, { name: "Smart Watch", qty: 30, cost: 100 }], total: 6250, status: "pending", expectedDate: "2025-03-15", amountPaid: 2000, remainingDebt: 4250 },
  { id: "PO-002", date: "2025-02-25", supplier: "SportsPro Suppliers", supplierId: "2", items: [{ name: "Running Shoes", qty: 40, cost: 40 }], total: 1600, status: "approved", expectedDate: "2025-03-10", amountPaid: 0, remainingDebt: 1600 },
  { id: "PO-003", date: "2025-02-20", supplier: "HomeComfort Ltd", supplierId: "3", items: [{ name: "Coffee Maker", qty: 25, cost: 35 }, { name: "Blender Pro", qty: 20, cost: 30 }], total: 1475, status: "received", expectedDate: "2025-03-05", amountPaid: 1475, remainingDebt: 0 },
  { id: "PO-004", date: "2025-02-15", supplier: "Fashion Forward Inc", supplierId: "4", items: [{ name: "Winter Jacket", qty: 60, cost: 55 }], total: 3300, status: "received", expectedDate: "2025-03-01", amountPaid: 3300, remainingDebt: 0 },
  { id: "PO-005", date: "2025-02-10", supplier: "Global Electronics Co", supplierId: "5", items: [{ name: "Laptop Stand", qty: 80, cost: 20 }], total: 1600, status: "approved", expectedDate: "2025-03-08", amountPaid: 1600, remainingDebt: 0 },
  { id: "PO-006", date: "2025-02-05", supplier: "FreshGoods Trading", supplierId: "6", items: [{ name: "Desk Lamp", qty: 35, cost: 18 }], total: 630, status: "cancelled", expectedDate: "2025-02-28", amountPaid: 0, remainingDebt: 0 },
  { id: "PO-007", date: "2025-01-28", supplier: "TechGear Wholesale", supplierId: "1", items: [{ name: "Wireless Headphones", qty: 30, cost: 65 }], total: 1950, status: "received", expectedDate: "2025-02-15", amountPaid: 500, remainingDebt: 1450 },
  { id: "PO-008", date: "2025-01-20", supplier: "SportsPro Suppliers", supplierId: "2", items: [{ name: "Tennis Racket", qty: 20, cost: 70 }, { name: "Yoga Mat", qty: 50, cost: 12 }], total: 2000, status: "received", expectedDate: "2025-02-10", amountPaid: 2000, remainingDebt: 0 },
]

export default function SupplierDebtsPage() {
  const [debts, setDebts] = useLocalStorage<SupplierDebt[]>("erp-supplier-debts", initialDebts)
  const [purchases, setPurchases] = useLocalStorage<PurchaseOrder[]>("erp-purchases", initialPurchases)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [paymentDialog, setPaymentDialog] = useState<SupplierDebt | null>(null)
  const [detailDialog, setDetailDialog] = useState<SupplierDebt | null>(null)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentNote, setPaymentNote] = useState("")

  // KPI calculations
  const totalOutstanding = debts.filter(d => d.status !== "paid").reduce((sum, d) => sum + d.remainingDebt, 0)
  const activeDebts = debts.filter(d => d.status !== "paid").length
  const fullyPaid = debts.filter(d => d.status === "paid").length
  const partiallyPaid = debts.filter(d => d.status === "partial").length

  // Filter by tab
  const tabs = [
    { id: "all", label: "All Debts" },
    { id: "outstanding", label: "Outstanding" },
    { id: "partial", label: "Partial" },
    { id: "paid", label: "Paid" },
  ]
  const tabFiltered = activeTab === "all" ? debts : debts.filter(d => d.status === activeTab)
  const filtered = tabFiltered.filter(d =>
    (d.supplierName ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (d.purchaseId ?? "").toLowerCase().includes(search.toLowerCase())
  )

  const handleRecordPayment = () => {
    if (!paymentDialog) return
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0 || amount > paymentDialog.remainingDebt) return

    const today = new Date().toISOString().split("T")[0]
    const newPayment: DebtPayment = { date: today, amount, note: paymentNote || "Payment recorded" }

    // Update the debt record
    setDebts(debts.map(d => {
      if (d.id !== paymentDialog.id) return d
      const newAmountPaid = d.amountPaid + amount
      const newRemaining = d.totalAmount - newAmountPaid
      return {
        ...d,
        amountPaid: newAmountPaid,
        remainingDebt: newRemaining,
        status: newRemaining <= 0 ? "paid" : "partial",
        payments: [...d.payments, newPayment],
      }
    }))

    // Sync payment back to the corresponding purchase order
    setPurchases(purchases.map(p => {
      if (p.id !== paymentDialog.purchaseId) return p
      const newPaid = p.amountPaid + amount
      return {
        ...p,
        amountPaid: newPaid,
        remainingDebt: p.total - newPaid,
      }
    }))

    setPaymentDialog(null)
    setPaymentAmount("")
    setPaymentNote("")
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Supplier Debts"
        subtitle="Track and manage supplier payment obligations"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Outstanding" value={formatCurrency(totalOutstanding)} subtitle="Unpaid balance" icon={DollarSign} />
        <KpiCard title="Active Debts" value={String(activeDebts)} subtitle="Pending payments" icon={AlertCircle} />
        <KpiCard title="Fully Paid" value={String(fullyPaid)} subtitle="Completed debts" icon={CheckCircle2} />
        <KpiCard title="Partially Paid" value={String(partiallyPaid)} subtitle="In-progress payments" icon={Clock} />
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        {tabs.map(tab => (
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
              <span className="ml-1 text-xs">({debts.filter(d => d.status === tab.id).length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <SearchInput placeholder="Search by supplier name or purchase reference..." value={search} onChange={setSearch} />

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Supplier</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Purchase Ref</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total Amount</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Paid</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Remaining</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500">
                  <Landmark className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  No debts found
                </td>
              </tr>
            ) : (
              filtered.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{d.supplierName}</td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-600">{d.purchaseId}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(d.totalAmount)}</td>
                  <td className="px-4 py-3 text-sm text-green-600 font-medium">{formatCurrency(d.amountPaid)}</td>
                  <td className="px-4 py-3 text-sm font-medium">
                    <span className={d.remainingDebt > 0 ? "text-red-600" : "text-green-600"}>
                      {formatCurrency(d.remainingDebt)}
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {d.status !== "paid" && (
                        <button
                          onClick={() => {
                            setPaymentDialog(d)
                            setPaymentAmount("")
                            setPaymentNote("")
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                          <DollarSign className="h-3.5 w-3.5" />
                          Pay
                        </button>
                      )}
                      <button
                        onClick={() => setDetailDialog(d)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Record Payment Dialog */}
      {paymentDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setPaymentDialog(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Record Payment</h2>
                <p className="text-sm text-gray-500 mt-0.5">{paymentDialog.supplierName} - {paymentDialog.purchaseId}</p>
              </div>
              <button onClick={() => setPaymentDialog(null)} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg text-sm">
                <div>
                  <span className="text-gray-500">Total Debt</span>
                  <p className="font-semibold text-gray-900">{formatCurrency(paymentDialog.totalAmount)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Already Paid</span>
                  <p className="font-semibold text-green-600">{formatCurrency(paymentDialog.amountPaid)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Remaining</span>
                  <p className="font-semibold text-red-600">{formatCurrency(paymentDialog.remainingDebt)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Payments Made</span>
                  <p className="font-semibold text-gray-900">{paymentDialog.payments.length}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={paymentDialog.remainingDebt}
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    placeholder={`Max: ${paymentDialog.remainingDebt.toFixed(2)}`}
                    className="w-full rounded-lg border border-gray-200 pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {parseFloat(paymentAmount) > paymentDialog.remainingDebt && (
                  <p className="text-xs text-red-500 mt-1">Amount cannot exceed remaining debt of {formatCurrency(paymentDialog.remainingDebt)}</p>
                )}
                {paymentAmount && parseFloat(paymentAmount) === paymentDialog.remainingDebt && (
                  <p className="text-xs text-green-600 mt-1">This will fully settle the debt</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                <input
                  value={paymentNote}
                  onChange={e => setPaymentNote(e.target.value)}
                  placeholder="e.g., Bank transfer, Cash payment..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setPaymentDialog(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRecordPayment}
                  disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || parseFloat(paymentAmount) > paymentDialog.remainingDebt}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Record Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debt Detail Dialog */}
      {detailDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setDetailDialog(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Debt Details</h2>
                <p className="text-sm text-gray-500 mt-0.5">{detailDialog.id}</p>
              </div>
              <button onClick={() => setDetailDialog(null)} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Supplier</span>
                  <p className="font-medium text-gray-900">{detailDialog.supplierName}</p>
                </div>
                <div>
                  <span className="text-gray-500">Purchase Ref</span>
                  <p className="font-medium font-mono text-gray-900">{detailDialog.purchaseId}</p>
                </div>
                <div>
                  <span className="text-gray-500">Total Amount</span>
                  <p className="font-medium text-gray-900">{formatCurrency(detailDialog.totalAmount)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Status</span>
                  <div className="mt-1"><StatusBadge status={detailDialog.status} /></div>
                </div>
                <div>
                  <span className="text-gray-500">Amount Paid</span>
                  <p className="font-medium text-green-600">{formatCurrency(detailDialog.amountPaid)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Remaining</span>
                  <p className={`font-medium ${detailDialog.remainingDebt > 0 ? "text-red-600" : "text-green-600"}`}>
                    {formatCurrency(detailDialog.remainingDebt)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Created</span>
                  <p className="font-medium text-gray-900">{formatDate(detailDialog.createdAt)}</p>
                </div>
              </div>

              {/* Payment progress bar */}
              <div className="pt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Payment Progress</span>
                  <span>{detailDialog.totalAmount > 0 ? Math.round((detailDialog.amountPaid / detailDialog.totalAmount) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${detailDialog.status === "paid" ? "bg-green-500" : "bg-indigo-500"}`}
                    style={{ width: `${detailDialog.totalAmount > 0 ? Math.min((detailDialog.amountPaid / detailDialog.totalAmount) * 100, 100) : 0}%` }}
                  />
                </div>
              </div>

              {/* Payment history */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Payment History</h4>
                {detailDialog.payments.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No payments recorded yet</p>
                ) : (
                  <div className="space-y-2">
                    {detailDialog.payments.map((p, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{formatCurrency(p.amount)}</p>
                          <p className="text-xs text-gray-500">{p.note}</p>
                        </div>
                        <span className="text-xs text-gray-400">{formatDate(p.date)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={() => setDetailDialog(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
