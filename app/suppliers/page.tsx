"use client"

import { PageGuard } from "@/components/shared/permission-guard"
import { PERMISSIONS } from "@/lib/rbac/permissions"

import { useState } from "react"
import { useI18n } from "@/lib/i18n/context"
import { useSupabaseData as useLocalStorage } from "@/hooks/use-supabase-data"
import { PageHeader } from "@/components/layout/page-header"
import { KpiCard } from "@/components/shared/kpi-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { SearchInput } from "@/components/shared/search-input"
import { Truck, ShoppingBag, DollarSign, Landmark, Pencil, Trash2, X, Mail, Phone, AlertTriangle } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface Supplier {
  id: string; name: string; contactPerson: string; email: string; phone: string; address: string; orders: number; totalSpent: number; status: string
}

interface PurchaseOrder {
  id: string; date: string; supplier: string; supplierId?: string; items: { name: string; qty: number; cost: number }[]; total: number; status: string; expectedDate: string; amountPaid: number; remainingDebt: number
}

interface SupplierDebt {
  id: string; supplierId: string; supplierName: string; purchaseId: string; totalAmount: number; amountPaid: number; remainingDebt: number; status: string; payments: { date: string; amount: number; note: string }[]; createdAt: string
}

const initialSuppliers: Supplier[] = [
  { id: "1", name: "TechGear Wholesale", contactPerson: "John Smith", email: "john@techgear.com", phone: "+1 (555) 123-4567", address: "123 Tech Blvd, San Jose, CA", orders: 45, totalSpent: 125000, status: "active" },
  { id: "2", name: "SportsPro Suppliers", contactPerson: "Sarah Johnson", email: "sarah@sportspro.com", phone: "+1 (555) 234-5678", address: "456 Sports Ave, Portland, OR", orders: 32, totalSpent: 87500, status: "active" },
  { id: "3", name: "HomeComfort Ltd", contactPerson: "Michael Brown", email: "michael@homecomfort.com", phone: "+1 (555) 345-6789", address: "789 Home St, Chicago, IL", orders: 28, totalSpent: 65000, status: "active" },
  { id: "4", name: "Fashion Forward Inc", contactPerson: "Emma Wilson", email: "emma@fashionforward.com", phone: "+1 (555) 456-7890", address: "321 Fashion Rd, New York, NY", orders: 15, totalSpent: 42000, status: "inactive" },
  { id: "5", name: "Global Electronics Co", contactPerson: "David Park", email: "david@globalelec.com", phone: "+1 (555) 567-8901", address: "654 Circuit Way, Austin, TX", orders: 52, totalSpent: 198000, status: "active" },
  { id: "6", name: "FreshGoods Trading", contactPerson: "Lisa Chen", email: "lisa@freshgoods.com", phone: "+1 (555) 678-9012", address: "987 Trade Ln, Seattle, WA", orders: 19, totalSpent: 34000, status: "active" },
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

export default function SuppliersPage() {
  const { t } = useI18n()
  const [suppliers, setSuppliers] = useLocalStorage<Supplier[]>("erp-suppliers", initialSuppliers)
  const [purchases] = useLocalStorage<PurchaseOrder[]>("erp-purchases", initialPurchases)
  const [debts] = useLocalStorage<SupplierDebt[]>("erp-supplier-debts", [])
  const [search, setSearch] = useState("")
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState({ name: "", contactPerson: "", email: "", phone: "", address: "", status: "active" })
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null)

  const filtered = suppliers.filter(s => (s.name ?? "").toLowerCase().includes(search.toLowerCase()) || (s.contactPerson ?? "").toLowerCase().includes(search.toLowerCase()) || (s.email ?? "").toLowerCase().includes(search.toLowerCase()))
  const active = suppliers.filter(s => s.status === "active").length
  const totalOrders = suppliers.reduce((sum, s) => sum + (s.orders ?? 0), 0)
  const totalSpent = suppliers.reduce((sum, s) => sum + (s.totalSpent ?? 0), 0)
  const totalOutstandingDebt = debts.filter(d => d.status !== "paid").reduce((sum, d) => sum + d.remainingDebt, 0)

  // Get outstanding debt for a specific supplier
  const getSupplierDebt = (supplierId: string) => {
    return debts
      .filter(d => d.supplierId === supplierId && d.status !== "paid")
      .reduce((sum, d) => sum + d.remainingDebt, 0)
  }

  // Get purchase count for a supplier
  const getSupplierPurchaseCount = (supplierId: string, supplierName: string) => {
    return purchases.filter(p => p.supplierId === supplierId || p.supplier === supplierName).length
  }

  // Get active debt count for a supplier
  const getSupplierActiveDebts = (supplierId: string) => {
    return debts.filter(d => d.supplierId === supplierId && d.status !== "paid").length
  }

  const handleSave = () => {
    if (!form.name) return
    if (editing) {
      setSuppliers(suppliers.map(s => s.id === editing.id ? { ...s, ...form } : s))
    } else {
      const maxId = suppliers.reduce((max, s) => Math.max(max, parseInt(s.id) || 0), 0)
      setSuppliers([...suppliers, { id: String(maxId + 1), ...form, orders: 0, totalSpent: 0 }])
    }
    setShowDialog(false); setEditing(null); setForm({ name: "", contactPerson: "", email: "", phone: "", address: "", status: "active" })
  }

  const handleEdit = (s: Supplier) => { setEditing(s); setForm({ name: s.name, contactPerson: s.contactPerson, email: s.email, phone: s.phone, address: s.address, status: s.status }); setShowDialog(true) }

  const handleDelete = (s: Supplier) => {
    setDeleteTarget(s)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    setSuppliers(suppliers.filter(s => s.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  const canDelete = (s: Supplier) => {
    const purchaseCount = getSupplierPurchaseCount(s.id, s.name)
    const activeDebtCount = getSupplierActiveDebts(s.id)
    return purchaseCount === 0 && activeDebtCount === 0
  }

  return (
    <PageGuard permission={PERMISSIONS.SUPPLIERS_VIEW}>
    <div className="space-y-6 animate-fade-in">
      <PageHeader title={t("suppliers.title")} subtitle={t("suppliers.subtitle")} action={{ label: t("suppliers.addSupplier"), onClick: () => { setEditing(null); setForm({ name: "", contactPerson: "", email: "", phone: "", address: "", status: "active" }); setShowDialog(true) } }} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title={t("suppliers.activeSuppliers")} value={String(active)} subtitle="Currently active" icon={Truck} />
        <KpiCard title={t("suppliers.totalOrders")} value={String(totalOrders)} subtitle="All time orders" icon={ShoppingBag} />
        <KpiCard title={t("suppliers.totalSpent")} value={formatCurrency(totalSpent)} subtitle="All time spending" icon={DollarSign} />
        <KpiCard title="Outstanding Debt" value={formatCurrency(totalOutstandingDebt)} subtitle="Unpaid balances" icon={Landmark} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All Suppliers</h2>
          <p className="text-sm text-gray-500">View and manage supplier information</p>
          <div className="mt-4"><SearchInput placeholder={t("common.search")} value={search} onChange={setSearch} /></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("common.name")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("suppliers.contactPerson")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Contact Info</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("suppliers.totalOrders")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("suppliers.totalSpent")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Outstanding Debt</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("common.status")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(s => {
                const debt = getSupplierDebt(s.id)
                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{s.contactPerson}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm space-y-1">
                        <div className="flex items-center gap-1 text-gray-600"><Mail className="h-3.5 w-3.5 text-gray-400" />{s.email}</div>
                        <div className="flex items-center gap-1 text-gray-600"><Phone className="h-3.5 w-3.5 text-gray-400" />{s.phone}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{s.orders}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(s.totalSpent)}</td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {debt > 0 ? (
                        <span className="text-red-600">{formatCurrency(debt)}</span>
                      ) : (
                        <span className="text-green-600">No debt</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEdit(s)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(s)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Supplier Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowDialog(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">{editing ? t("suppliers.editSupplier") : t("suppliers.addSupplier")}</h2>
              <button onClick={() => setShowDialog(false)} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("suppliers.contactPerson")}</label><input value={form.contactPerson} onChange={e => setForm({...form, contactPerson: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("common.email")}</label><input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("common.phone")}</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("common.status")}</label><select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"><option value="active">{t("common.active")}</option><option value="inactive">{t("common.inactive")}</option></select></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("common.address")}</label><input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button onClick={() => setShowDialog(false)} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">{t("common.cancel")}</button>
                <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">{editing ? t("common.save") : t("suppliers.addSupplier")}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">{t("suppliers.deleteSupplier")}</h2>
              <button onClick={() => setDeleteTarget(null)} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {canDelete(deleteTarget) ? (
                <>
                  <p className="text-sm text-gray-600">
                    Are you sure you want to delete <span className="font-semibold text-gray-900">{deleteTarget.name}</span>? This action cannot be undone.
                  </p>
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">{t("common.cancel")}</button>
                    <button onClick={confirmDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">{t("common.delete")}</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Cannot delete {deleteTarget.name}</p>
                      <p className="text-sm text-red-700 mt-1">
                        This supplier has{" "}
                        {getSupplierPurchaseCount(deleteTarget.id, deleteTarget.name) > 0 && (
                          <span className="font-medium">{getSupplierPurchaseCount(deleteTarget.id, deleteTarget.name)} purchase order(s)</span>
                        )}
                        {getSupplierPurchaseCount(deleteTarget.id, deleteTarget.name) > 0 && getSupplierActiveDebts(deleteTarget.id) > 0 && " and "}
                        {getSupplierActiveDebts(deleteTarget.id) > 0 && (
                          <span className="font-medium">{getSupplierActiveDebts(deleteTarget.id)} outstanding debt(s)</span>
                        )}
                        . Remove all linked records before deleting this supplier.
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end pt-4 border-t">
                    <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">Close</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  </PageGuard>
  )
}
