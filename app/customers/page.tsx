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
import { validateCustomer } from "@/lib/validation"
import { formatCurrency } from "@/lib/utils"
import type { Customer, Sale } from "@/lib/types"
import { Users, UserCheck, DollarSign, Crown, Pencil, Trash2, X, Archive, RotateCcw } from "lucide-react"

const segmentColors: Record<string, string> = {
  VIP: "bg-purple-100 text-purple-700",
  Regular: "bg-blue-100 text-blue-700",
  New: "bg-green-100 text-green-700",
}

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  company: "",
  address: "",
  segment: "Regular" as "VIP" | "Regular" | "New",
  status: "active" as "active" | "inactive",
}

export default function CustomersPage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const { orgId } = useRBAC()

  const [showArchived, setShowArchived] = useState(false)
  const {
    data: customers,
    loading,
    insert: insertCustomer,
    update: updateCustomer,
    remove: removeCustomer,
    refresh: refreshCustomers,
  } = useTableData<Customer>("customers", {
    includeDeleted: showArchived,
    orderBy: { column: "name", ascending: true },
  })

  const { data: sales } = useTableData<Sale>("sales")

  const [search, setSearch] = useState("")
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)

  // ── Derived data ──────────────────────────────────────────
  const activeCustomers = customers.filter((c) => !c.deletedAt)
  const displayCustomers = showArchived ? customers : activeCustomers

  const filtered = displayCustomers.filter(
    (c) =>
      (c.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.company ?? "").toLowerCase().includes(search.toLowerCase())
  )

  const activeCount = activeCustomers.filter((c) => c.status === "active").length
  const vipCount = activeCustomers.filter((c) => c.segment === "VIP").length

  // Calculate total revenue from completed sales linked to customers
  const totalRevenue = sales
    .filter((s) => s.status === "completed")
    .reduce((sum, s) => sum + (s.total ?? 0), 0)

  // Get order count and total spent for a specific customer
  const getCustomerOrders = (customerId: string) =>
    sales.filter((s) => s.customerId === customerId).length

  const getCustomerSpent = (customerId: string) =>
    sales
      .filter((s) => s.customerId === customerId && s.status === "completed")
      .reduce((sum, s) => sum + (s.total ?? 0), 0)

  // ── Modal helpers ─────────────────────────────────────────
  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm)
    setErrors({})
    setShowDialog(true)
  }

  const openEdit = (c: Customer) => {
    setEditing(c)
    setForm({
      name: c.name,
      email: c.email,
      phone: c.phone,
      company: c.company,
      address: c.address,
      segment: c.segment,
      status: c.status,
    })
    setErrors({})
    setShowDialog(true)
  }

  // ── Save ────────────────────────────────────────────────
  const handleSave = async () => {
    const validation = validateCustomer(form)
    setErrors(validation.errors)
    if (!validation.valid) return

    if (editing) {
      await updateCustomer(editing.id, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        company: form.company.trim(),
        address: form.address.trim(),
        segment: form.segment,
        status: form.status,
      } as Partial<Customer>)

      if (user?.id && orgId) {
        logAction({
          action: "customer.updated",
          module: "customers",
          description: `Updated customer "${form.name.trim()}"`,
          userId: user.id,
          orgId,
          userName: user.email ?? undefined,
          metadata: {
            customer_id: editing.id,
            previousValue: { name: editing.name, email: editing.email, segment: editing.segment },
            newValue: { name: form.name.trim(), email: form.email.trim(), segment: form.segment },
          },
        })
      }
    } else {
      const created = await insertCustomer({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        company: form.company.trim(),
        address: form.address.trim(),
        segment: form.segment,
        status: form.status,
      } as Partial<Customer>)

      if (created && user?.id && orgId) {
        logAction({
          action: "customer.created",
          module: "customers",
          description: `Created customer "${form.name.trim()}"`,
          userId: user.id,
          orgId,
          userName: user.email ?? undefined,
          metadata: { customer_id: created.id },
        })
      }
    }

    setShowDialog(false)
    refreshCustomers()
  }

  // ── Delete (soft delete) ────────────────────────────────
  const handleDelete = async (c: Customer) => {
    await removeCustomer(c.id, true)

    if (user?.id && orgId) {
      logAction({
        action: "customer.deleted",
        module: "customers",
        description: `Archived customer "${c.name}"`,
        userId: user.id,
        orgId,
        userName: user.email ?? undefined,
        metadata: { customer_id: c.id, name: c.name },
      })
    }
    setDeleteTarget(null)
  }

  // ── Restore ─────────────────────────────────────────────
  const handleRestore = async (id: string) => {
    await updateCustomer(id, { deletedAt: null } as Partial<Customer>)
    refreshCustomers()
  }

  return (
    <PageGuard permission={PERMISSIONS.CUSTOMERS_VIEW}>
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Customer Management"
        subtitle="Manage your customer relationships"
        action={{ label: "Add Customer", onClick: openAdd }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Customers" value={String(activeCustomers.length)} subtitle="All customers" icon={Users} />
        <KpiCard title="Active Customers" value={String(activeCount)} subtitle="Currently active" icon={UserCheck} />
        <KpiCard title="Total Revenue" value={formatCurrency(totalRevenue)} subtitle="From all customers" icon={DollarSign} />
        <KpiCard title="VIP Customers" value={String(vipCount)} subtitle="High-value clients" icon={Crown} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Customer Directory</h2>
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
            <p className="text-gray-400">Loading customers...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">{t("common.noData")}</p>
            <p className="text-sm text-gray-400 mt-1">
              {activeCustomers.length === 0 ? "Add your first customer to get started" : "Try adjusting your search"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("common.name")}</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("common.email")}</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("common.phone")}</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Company</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Orders</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total Spent</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Segment</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("common.status")}</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((c) => {
                  const isArchived = !!c.deletedAt
                  return (
                    <tr key={c.id} className={`hover:bg-gray-50 ${isArchived ? "opacity-60" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold">
                            {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-900">{c.name}</span>
                            {isArchived && (
                              <span className="ml-2 text-xs text-amber-600 bg-amber-50 rounded px-1.5 py-0.5">Archived</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{c.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{c.phone}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{c.company}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{getCustomerOrders(c.id)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(getCustomerSpent(c.id))}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${segmentColors[c.segment] ?? "bg-gray-100 text-gray-700"}`}>
                          {c.segment}
                        </span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {isArchived ? (
                            <button
                              onClick={() => handleRestore(c.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:bg-green-50 hover:text-green-600 transition-colors"
                              title="Restore customer"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          ) : (
                            <>
                              <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"><Pencil className="h-4 w-4" /></button>
                              <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
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

      {/* Add/Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowDialog(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">{editing ? "Edit Customer" : "Add Customer"}</h2>
              <button onClick={() => setShowDialog(false)} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.name")} *</label>
                  <input
                    value={form.name}
                    onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors((prev) => ({ ...prev, name: "" })) }}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.name ? "border-red-300" : "border-gray-200"}`}
                  />
                  <FormError error={errors.name} />
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Segment</label>
                  <select value={form.segment} onChange={(e) => setForm({ ...form, segment: e.target.value as "VIP" | "Regular" | "New" })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="VIP">VIP</option>
                    <option value="Regular">Regular</option>
                    <option value="New">New</option>
                  </select>
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
                <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">{editing ? t("common.save") : "Add Customer"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Archive Customer</h3>
            <p className="text-sm text-gray-500 mb-6">
              <span className="font-semibold text-gray-900">{deleteTarget.name}</span> will be archived and hidden from active lists. Historical records (sales, invoices) will be preserved. You can restore them later.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">{t("common.cancel")}</button>
              <button onClick={() => handleDelete(deleteTarget)} className="flex-1 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700">Archive</button>
            </div>
          </div>
        </div>
      )}
    </div>
  </PageGuard>
  )
}
