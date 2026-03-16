"use client"

import { PageGuard } from "@/components/shared/permission-guard"
import { PERMISSIONS } from "@/lib/rbac/permissions"

import { useState } from "react"
import { useI18n } from "@/lib/i18n/context"
import { useAuth } from "@/lib/supabase/auth-context"
import { useRBAC } from "@/lib/rbac/rbac-context"
import { logAction } from "@/lib/activity/log-action"
import { useTableData } from "@/hooks/use-table-data"
import { PageHeader } from "@/components/layout/page-header"
import { KpiCard } from "@/components/shared/kpi-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { SearchInput } from "@/components/shared/search-input"
import { FormError } from "@/components/shared/form-error"
import { validateSupplier } from "@/lib/validation"
import { formatCurrency } from "@/lib/utils"
import type { Supplier, PurchaseOrder, SupplierDebt } from "@/lib/types"
import { Truck, ShoppingBag, DollarSign, Landmark, Pencil, Trash2, X, Mail, Phone, Archive, RotateCcw } from "lucide-react"

const emptyForm = {
  name: "",
  contactPerson: "",
  email: "",
  phone: "",
  address: "",
  status: "active" as "active" | "inactive",
}

export default function SuppliersPage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const { orgId } = useRBAC()

  const [showArchived, setShowArchived] = useState(false)
  const {
    data: suppliers,
    loading,
    insert: insertSupplier,
    update: updateSupplier,
    remove: removeSupplier,
    refresh: refreshSuppliers,
  } = useTableData<Supplier>("suppliers", {
    includeDeleted: showArchived,
    orderBy: { column: "name", ascending: true },
  })

  const { data: purchases } = useTableData<PurchaseOrder>("purchase_orders", {
    select: "*, purchase_items(*)",
  })

  const { data: debts } = useTableData<SupplierDebt>("supplier_debts")

  const [search, setSearch] = useState("")
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null)

  // ── Derived data ──────────────────────────────────────────
  const activeSuppliers = suppliers.filter((s) => !s.deletedAt)
  const displaySuppliers = showArchived ? suppliers : activeSuppliers

  const filtered = displaySuppliers.filter(
    (s) =>
      (s.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.contactPerson ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.email ?? "").toLowerCase().includes(search.toLowerCase())
  )

  const active = activeSuppliers.filter((s) => s.status === "active").length

  // Calculate totals from purchase_orders
  const totalOrders = purchases.length
  const totalSpent = purchases
    .filter((p) => p.status !== "cancelled")
    .reduce((sum, p) => sum + (p.total ?? 0), 0)
  const totalOutstandingDebt = debts
    .filter((d) => d.status !== "paid")
    .reduce((sum, d) => sum + (d.remainingDebt ?? 0), 0)

  // Get outstanding debt for a specific supplier
  const getSupplierDebt = (supplierId: string) =>
    debts
      .filter((d) => d.supplierId === supplierId && d.status !== "paid")
      .reduce((sum, d) => sum + (d.remainingDebt ?? 0), 0)

  // Get purchase count for a supplier
  const getSupplierPurchaseCount = (supplierId: string) =>
    purchases.filter((p) => p.supplierId === supplierId).length

  // Get total spent for a supplier
  const getSupplierTotalSpent = (supplierId: string) =>
    purchases
      .filter((p) => p.supplierId === supplierId && p.status !== "cancelled")
      .reduce((sum, p) => sum + (p.total ?? 0), 0)

  // Get active debt count for a supplier
  const getSupplierActiveDebts = (supplierId: string) =>
    debts.filter((d) => d.supplierId === supplierId && d.status !== "paid").length

  // ── Modal helpers ─────────────────────────────────────────
  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm)
    setErrors({})
    setShowDialog(true)
  }

  const openEdit = (s: Supplier) => {
    setEditing(s)
    setForm({
      name: s.name,
      contactPerson: s.contactPerson,
      email: s.email,
      phone: s.phone,
      address: s.address,
      status: s.status,
    })
    setErrors({})
    setShowDialog(true)
  }

  // ── Save (create or update) ─────────────────────────────
  const handleSave = async () => {
    const existingNames = activeSuppliers
      .filter((s) => s.id !== editing?.id)
      .map((s) => s.name)

    const validation = validateSupplier(form, existingNames)
    setErrors(validation.errors)
    if (!validation.valid) return

    if (editing) {
      await updateSupplier(editing.id, {
        name: form.name.trim(),
        contactPerson: form.contactPerson.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        status: form.status,
      } as Partial<Supplier>)

      if (user?.id && orgId) {
        logAction({
          action: "supplier.updated",
          module: "suppliers",
          description: `Updated supplier "${form.name.trim()}"`,
          userId: user.id,
          orgId,
          userName: user.email ?? undefined,
          metadata: {
            supplier_id: editing.id,
            previousValue: { name: editing.name, email: editing.email, phone: editing.phone },
            newValue: { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() },
          },
        })
      }
    } else {
      const created = await insertSupplier({
        name: form.name.trim(),
        contactPerson: form.contactPerson.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        status: form.status,
      } as Partial<Supplier>)

      if (created && user?.id && orgId) {
        logAction({
          action: "supplier.created",
          module: "suppliers",
          description: `Created supplier "${form.name.trim()}"`,
          userId: user.id,
          orgId,
          userName: user.email ?? undefined,
          metadata: { supplier_id: created.id },
        })
      }
    }

    setShowDialog(false)
    refreshSuppliers()
  }

  // ── Delete (soft delete) ────────────────────────────────
  const handleDelete = async (s: Supplier) => {
    await removeSupplier(s.id, true) // soft delete

    if (user?.id && orgId) {
      logAction({
        action: "supplier.deleted",
        module: "suppliers",
        description: `Archived supplier "${s.name}"`,
        userId: user.id,
        orgId,
        userName: user.email ?? undefined,
        metadata: { supplier_id: s.id, name: s.name },
      })
    }
    setDeleteTarget(null)
  }

  // ── Restore ─────────────────────────────────────────────
  const handleRestore = async (id: string) => {
    await updateSupplier(id, { deletedAt: null } as Partial<Supplier>)
    refreshSuppliers()
  }

  return (
    <PageGuard permission={PERMISSIONS.SUPPLIERS_VIEW}>
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t("suppliers.title")}
        subtitle={t("suppliers.subtitle")}
        action={{ label: t("suppliers.addSupplier"), onClick: openAdd }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title={t("suppliers.activeSuppliers")} value={String(active)} subtitle="Currently active" icon={Truck} />
        <KpiCard title={t("suppliers.totalOrders")} value={String(totalOrders)} subtitle="All time orders" icon={ShoppingBag} />
        <KpiCard title={t("suppliers.totalSpent")} value={formatCurrency(totalSpent)} subtitle="All time spending" icon={DollarSign} />
        <KpiCard title="Outstanding Debt" value={formatCurrency(totalOutstandingDebt)} subtitle="Unpaid balances" icon={Landmark} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">All Suppliers</h2>
              <p className="text-sm text-gray-500">View and manage supplier information</p>
            </div>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                showArchived
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Archive className="h-4 w-4" />
              {showArchived ? "Hide Archived" : "Show Archived"}
            </button>
          </div>
          <div className="mt-4"><SearchInput placeholder={t("common.search")} value={search} onChange={setSearch} /></div>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <p className="text-gray-400">Loading suppliers...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Truck className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">{t("common.noData")}</p>
            <p className="text-sm text-gray-400 mt-1">
              {activeSuppliers.length === 0 ? "Add your first supplier to get started" : "Try adjusting your search"}
            </p>
          </div>
        ) : (
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
                {filtered.map((s) => {
                  const debt = getSupplierDebt(s.id)
                  const isArchived = !!s.deletedAt
                  return (
                    <tr key={s.id} className={`hover:bg-gray-50 ${isArchived ? "opacity-60" : ""}`}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {s.name}
                        {isArchived && (
                          <span className="ml-2 text-xs text-amber-600 bg-amber-50 rounded px-1.5 py-0.5">Archived</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{s.contactPerson}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm space-y-1">
                          {s.email && <div className="flex items-center gap-1 text-gray-600"><Mail className="h-3.5 w-3.5 text-gray-400" />{s.email}</div>}
                          {s.phone && <div className="flex items-center gap-1 text-gray-600"><Phone className="h-3.5 w-3.5 text-gray-400" />{s.phone}</div>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{getSupplierPurchaseCount(s.id)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(getSupplierTotalSpent(s.id))}</td>
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
                          {isArchived ? (
                            <button
                              onClick={() => handleRestore(s.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:bg-green-50 hover:text-green-600 transition-colors"
                              title="Restore supplier"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          ) : (
                            <>
                              <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"><Pencil className="h-4 w-4" /></button>
                              <button onClick={() => setDeleteTarget(s)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Supplier Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowDialog(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">{editing ? t("suppliers.editSupplier") : t("suppliers.addSupplier")}</h2>
              <button onClick={() => setShowDialog(false)} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors((prev) => ({ ...prev, name: "" })) }}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.name ? "border-red-300" : "border-gray-200"}`}
                />
                <FormError error={errors.name} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("suppliers.contactPerson")}</label>
                  <input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.email")}</label>
                  <input
                    value={form.email}
                    onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors((prev) => ({ ...prev, email: "" })) }}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.email ? "border-red-300" : "border-gray-200"}`}
                  />
                  <FormError error={errors.email} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.phone")}</label>
                  <input
                    value={form.phone}
                    onChange={(e) => { setForm({ ...form, phone: e.target.value }); setErrors((prev) => ({ ...prev, phone: "" })) }}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.phone ? "border-red-300" : "border-gray-200"}`}
                  />
                  <FormError error={errors.phone} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.status")}</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "inactive" })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="active">{t("common.active")}</option>
                    <option value="inactive">{t("common.inactive")}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.address")}</label>
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">Archive Supplier</h2>
              <button onClick={() => setDeleteTarget(null)} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to archive <span className="font-semibold text-gray-900">{deleteTarget.name}</span>?
              </p>
              {(getSupplierPurchaseCount(deleteTarget.id) > 0 || getSupplierActiveDebts(deleteTarget.id) > 0) && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                  This supplier has {getSupplierPurchaseCount(deleteTarget.id)} purchase order(s)
                  {getSupplierActiveDebts(deleteTarget.id) > 0 && ` and ${getSupplierActiveDebts(deleteTarget.id)} outstanding debt(s)`}.
                  The supplier will be archived but all linked records will be preserved.
                </div>
              )}
              <p className="text-sm text-gray-500">
                This supplier will be hidden from active lists but can be restored later. Historical records will be preserved.
              </p>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">{t("common.cancel")}</button>
                <button onClick={() => handleDelete(deleteTarget)} className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700">Archive</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </PageGuard>
  )
}
