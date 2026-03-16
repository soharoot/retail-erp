"use client"

import { PageGuard } from "@/components/shared/permission-guard"
import { PERMISSIONS } from "@/lib/rbac/permissions"

import { useState } from "react"
import { useI18n } from "@/lib/i18n/context"
import { useAuth } from "@/lib/supabase/auth-context"
import { useRBAC } from "@/lib/rbac/rbac-context"
import { logAction } from "@/lib/activity/log-action"
import { useTableData, insertChildRows, deleteChildRows } from "@/hooks/use-table-data"
import { useSettings } from "@/hooks/use-settings"
import { PageHeader } from "@/components/layout/page-header"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { Sale, SaleItem, Product, InventoryItem, Customer } from "@/lib/types"
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
  const { t } = useI18n()
  const { user } = useAuth()
  const { orgId } = useRBAC()

  const {
    data: sales,
    loading: salesLoading,
    insert: insertSale,
    update: updateSale,
    remove: removeSale,
    refresh: refreshSales,
  } = useTableData<Sale>("sales", {
    select: "*, sale_items(*)",
    orderBy: { column: "date", ascending: false },
  })

  const { data: products } = useTableData<Product>("products", {
    orderBy: { column: "name", ascending: true },
  })
  const { data: inventory, update: updateInventory, refresh: refreshInventory } = useTableData<InventoryItem>("inventory")
  const { data: customers } = useTableData<Customer>("customers", {
    orderBy: { column: "name", ascending: true },
  })
  const [settings] = useSettings()

  // Tax rate from settings (stored as number, e.g. 10 for 10%)
  const taxRate = (settings?.taxRate ?? 0) / 100
  const taxRateLabel = `${settings?.taxRate ?? 0}%`

  const [showModal, setShowModal] = useState(false)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [printSale, setPrintSale] = useState<Sale | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("")

  // ── form state ──────────────────────────────────────────────
  const [formCustomerId, setFormCustomerId] = useState<string | null>(null)
  const [formCustomerName, setFormCustomerName] = useState("")
  const [formPayment, setFormPayment] = useState<PaymentMethod>("cash")
  const [formStatus, setFormStatus] = useState<SaleStatus>("completed")
  const [formItems, setFormItems] = useState<Array<{ productId: string; qty: string; price: string }>>([
    { productId: "", qty: "1", price: "" },
  ])
  const [stockError, setStockError] = useState<string | null>(null)

  // ── derived ────────────────────────────────────────────────
  const activeProducts = products.filter((p) => p.status === "active" && !p.deletedAt)
  const activeCustomers = customers.filter((c) => c.status === "active" && !c.deletedAt)

  // Build inventory lookup by productId
  const inventoryByProduct = new Map(inventory.map((i) => [i.productId, i]))

  const filtered = sales.filter((s) => {
    const matchSearch =
      (s.saleNumber ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.customerName ?? "").toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || filterStatus === t("common.all") || s.status === filterStatus
    return matchSearch && matchStatus
  })

  const completedSales = sales.filter((s) => s.status === "completed")
  const totalRevenue = completedSales.reduce((sum, s) => sum + (s.total ?? 0), 0)
  const avgOrder = completedSales.length > 0 ? totalRevenue / completedSales.length : 0

  // ── modal helpers ───────────────────────────────────────────
  const openAdd = () => {
    setEditingSale(null)
    setFormCustomerId(null)
    setFormCustomerName("")
    setFormPayment("cash")
    setFormStatus("completed")
    setFormItems([{ productId: "", qty: "1", price: "" }])
    setStockError(null)
    setShowModal(true)
  }

  const openEdit = (sale: Sale) => {
    setEditingSale(sale)
    setFormCustomerId(sale.customerId ?? null)
    setFormCustomerName(sale.customerName)
    setFormPayment(sale.paymentMethod)
    setFormStatus(sale.status)
    setFormItems(
      (sale.items ?? []).map((item) => ({
        productId: item.productId ?? "",
        qty: String(item.quantity),
        price: String(item.unitPrice),
      }))
    )
    setStockError(null)
    setShowModal(true)
  }

  const handleCustomerChange = (customerId: string) => {
    if (customerId === "__walkin__") {
      setFormCustomerId(null)
      setFormCustomerName("Walk-in Customer")
    } else {
      const cust = customers.find((c) => c.id === customerId)
      setFormCustomerId(customerId)
      setFormCustomerName(cust?.name ?? "")
    }
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
        productId: fi.productId,
        productName: prod?.name ?? "",
        quantity: parseInt(fi.qty) || 1,
        unitPrice: parseFloat(fi.price) || 0,
        costAtSale: prod?.cost ?? 0,
        lineTotal: (parseInt(fi.qty) || 1) * (parseFloat(fi.price) || 0),
      }
    })

  const subtotal = computedItems.reduce((s, i) => s + i.lineTotal, 0)
  const tax = subtotal * taxRate
  const grandTotal = subtotal + tax

  // ── Generate sale number ──────────────────────────────────
  const generateSaleNumber = () => {
    const prefix = settings?.invoicePrefix ?? "SALE"
    const maxNum = sales.reduce((max, s) => {
      const match = (s.saleNumber ?? "").match(/(\d+)$/)
      return match ? Math.max(max, parseInt(match[1])) : max
    }, 0)
    return `${prefix}-${String(maxNum + 1).padStart(4, "0")}`
  }

  // ── save ────────────────────────────────────────────────────
  const handleSave = async () => {
    setStockError(null)
    if (!formCustomerName.trim() || computedItems.length === 0) return

    // Stock validation
    for (const item of computedItems) {
      const invItem = inventoryByProduct.get(item.productId)
      if (invItem) {
        // When editing, add back the old quantities first
        let available = invItem.stock
        if (editingSale) {
          const oldItem = (editingSale.items ?? []).find((oi) => oi.productId === item.productId)
          if (oldItem) available += oldItem.quantity
        }
        if (available < item.quantity) {
          setStockError(`Not enough stock for "${item.productName}" (available: ${available}, requested: ${item.quantity})`)
          return
        }
      }
    }

    if (editingSale) {
      // ── EDIT ──
      // 1. Restore old inventory
      for (const oldItem of editingSale.items ?? []) {
        const inv = inventoryByProduct.get(oldItem.productId ?? "")
        if (inv) {
          await updateInventory(inv.id, { stock: inv.stock + oldItem.quantity } as Partial<InventoryItem>)
        }
      }

      // 2. Update sale header
      await updateSale(editingSale.id, {
        customerId: formCustomerId,
        customerName: formCustomerName.trim(),
        subtotal,
        tax,
        total: grandTotal,
        paymentMethod: formPayment,
        status: formStatus,
      } as Partial<Sale>)

      // 3. Replace sale items (delete old, insert new)
      await deleteChildRows("sale_items", "saleId", editingSale.id)
      await insertChildRows("sale_items", computedItems.map((item) => ({
        saleId: editingSale.id,
        productId: item.productId || null,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        costAtSale: item.costAtSale,
        lineTotal: item.lineTotal,
      })))

      // 4. Deduct new inventory
      for (const item of computedItems) {
        const inv = inventoryByProduct.get(item.productId)
        if (inv) {
          // Note: we already restored above, so current stock in DB is restored
          const oldQty = editingSale.items?.find((oi) => oi.productId === item.productId)?.quantity ?? 0
          await updateInventory(inv.id, { stock: Math.max(0, inv.stock - item.quantity + oldQty) } as Partial<InventoryItem>)
        }
      }

      if (user?.id && orgId) {
        logAction({
          action: "sale.updated",
          module: "sales",
          description: `Updated sale ${editingSale.saleNumber} for "${formCustomerName.trim()}" — total ${grandTotal.toFixed(2)}`,
          userId: user.id,
          orgId,
          userName: user.email ?? undefined,
          metadata: { sale_id: editingSale.id, total: grandTotal, payment: formPayment, status: formStatus },
        })
      }
    } else {
      // ── CREATE ──
      const saleNumber = generateSaleNumber()

      const created = await insertSale({
        saleNumber,
        date: new Date().toISOString().slice(0, 10),
        customerId: formCustomerId,
        customerName: formCustomerName.trim(),
        subtotal,
        tax,
        total: grandTotal,
        paymentMethod: formPayment,
        status: formStatus,
        createdBy: user?.id,
      } as Partial<Sale>)

      if (created) {
        // Insert sale items
        await insertChildRows("sale_items", computedItems.map((item) => ({
          saleId: created.id,
          productId: item.productId || null,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          costAtSale: item.costAtSale,
          lineTotal: item.lineTotal,
        })))

        // Deduct inventory
        for (const item of computedItems) {
          const inv = inventoryByProduct.get(item.productId)
          if (inv) {
            await updateInventory(inv.id, { stock: Math.max(0, inv.stock - item.quantity) } as Partial<InventoryItem>)
          }
        }

        if (user?.id && orgId) {
          logAction({
            action: "sale.created",
            module: "sales",
            description: `Created sale ${saleNumber} for "${formCustomerName.trim()}" — ${computedItems.length} item(s), total ${grandTotal.toFixed(2)}`,
            userId: user.id,
            orgId,
            userName: user.email ?? undefined,
            metadata: { sale_id: created.id, sale_number: saleNumber, total: grandTotal, payment: formPayment, status: formStatus, item_count: computedItems.length },
          })
        }
      }
    }

    setShowModal(false)
    refreshSales()
    refreshInventory()
  }

  // ── delete ──────────────────────────────────────────────────
  const handleDelete = async (saleId: string) => {
    const sale = sales.find((s) => s.id === saleId)
    if (sale) {
      // Restore inventory
      for (const item of sale.items ?? []) {
        const inv = inventoryByProduct.get(item.productId ?? "")
        if (inv) {
          await updateInventory(inv.id, { stock: inv.stock + item.quantity } as Partial<InventoryItem>)
        }
      }

      // Delete sale items then sale
      await deleteChildRows("sale_items", "saleId", saleId)
      await removeSale(saleId, false) // hard delete

      if (user?.id && orgId) {
        logAction({
          action: "sale.deleted",
          module: "sales",
          description: `Deleted sale ${sale.saleNumber} (customer: "${sale.customerName}", total: ${(sale.total ?? 0).toFixed(2)})`,
          userId: user.id,
          orgId,
          userName: user.email ?? undefined,
          metadata: { sale_id: saleId, customer: sale.customerName, total: sale.total },
        })
      }
    }

    refreshSales()
    refreshInventory()
    setDeleteConfirm(null)
  }

  // ── print invoice ───────────────────────────────────────────
  const handlePrint = () => window.print()

  const companyName = settings?.companyName || "Retail ERP Store"

  return (
    <PageGuard permission={PERMISSIONS.SALES_VIEW}>
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t("sales.title")}
        subtitle={t("sales.subtitle")}
        action={{ label: t("sales.newSale"), onClick: openAdd }}
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: t("sales.totalSales"), value: String(sales.length), icon: ShoppingBag, color: "text-indigo-600 bg-indigo-50" },
          { label: t("sales.totalRevenue"), value: formatCurrency(totalRevenue), icon: DollarSign, color: "text-green-600 bg-green-50" },
          { label: t("sales.avgOrderValue"), value: formatCurrency(avgOrder), icon: TrendingUp, color: "text-blue-600 bg-blue-50" },
          { label: t("common.completed"), value: String(completedSales.length), icon: ShoppingCart, color: "text-purple-600 bg-purple-50" },
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
              placeholder={t("common.search")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <ShoppingCart className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value={t("common.all")}>{t("common.all")}</option>
            <option value="completed">{t("common.completed")}</option>
            <option value="pending">{t("common.pending")}</option>
            <option value="cancelled">{t("common.cancelled")}</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {/* Sales table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {salesLoading ? (
          <div className="py-16 text-center">
            <p className="text-gray-400">Loading sales...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingCart className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">{t("common.noData")}</p>
            <p className="text-sm text-gray-400 mt-1">
              {sales.length === 0 ? "Create your first sale to get started" : "Try adjusting your search or filter"}
            </p>
            {sales.length === 0 && (
              <button
                onClick={openAdd}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" /> {t("sales.newSale")}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Sale #</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">{t("sales.customer")}</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">{t("sales.items")}</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">{t("common.total")}</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">{t("sales.payment")}</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">{t("common.status")}</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">{sale.saleNumber}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(sale.date)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{sale.customerName}</td>
                    <td className="px-4 py-3 text-gray-500">{(sale.items ?? []).length} item{(sale.items ?? []).length !== 1 ? "s" : ""}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(sale.total)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 capitalize">
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={sale.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setPrintSale(sale)} title={t("sales.invoice")} className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"><Printer className="h-4 w-4" /></button>
                        <button onClick={() => openEdit(sale)} title={t("common.edit")} className="p-1.5 rounded-lg text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={() => setDeleteConfirm(sale.id)} title={t("common.delete")} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"><Trash2 className="h-4 w-4" /></button>
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
                {editingSale ? t("sales.editSale") : t("sales.newSale")}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer *</label>
                  <select
                    value={formCustomerId ?? "__walkin__"}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="__walkin__">Walk-in Customer</option>
                    {activeCustomers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ""}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Method</label>
                  <select
                    value={formPayment}
                    onChange={(e) => setFormPayment(e.target.value as PaymentMethod)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="cash">{t("sales.cash")}</option>
                    <option value="card">{t("sales.card")}</option>
                    <option value="transfer">{t("sales.transfer")}</option>
                    <option value="check">{t("sales.check")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as SaleStatus)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="completed">{t("common.completed")}</option>
                    <option value="pending">{t("common.pending")}</option>
                    <option value="cancelled">{t("common.cancelled")}</option>
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
                    <Plus className="h-3.5 w-3.5" /> {t("sales.addItem")}
                  </button>
                </div>
                <div className="space-y-2">
                  {formItems.map((fi, idx) => {
                    const invItem = inventoryByProduct.get(fi.productId)
                    return (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-5">
                          {idx === 0 && <p className="text-xs text-gray-500 mb-1">{t("sales.productName")}</p>}
                          <select
                            value={fi.productId}
                            onChange={(e) => handleProductChange(idx, e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">Select product</option>
                            {activeProducts.map((p) => {
                              const inv = inventoryByProduct.get(p.id)
                              return (
                                <option key={p.id} value={p.id}>
                                  {p.name} {inv ? `(${inv.stock} in stock)` : ""}
                                </option>
                              )
                            })}
                          </select>
                          {invItem && (
                            <p className="text-xs text-gray-400 mt-0.5">Stock: {invItem.stock}</p>
                          )}
                        </div>
                        <div className="col-span-2">
                          {idx === 0 && <p className="text-xs text-gray-500 mb-1">{t("common.quantity")}</p>}
                          <input
                            type="number"
                            min="1"
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
                          {idx === 0 && <p className="text-xs text-gray-500 mb-1">{t("sales.unitPrice")}</p>}
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
                  <div className="flex justify-between"><span className="text-gray-500">{t("sales.subtotal")}</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">{t("sales.tax")} ({taxRateLabel})</span><span className="font-medium">{formatCurrency(tax)}</span></div>
                  <div className="flex justify-between border-t pt-2 font-semibold">
                    <span>{t("sales.grandTotal")}</span><span className="text-indigo-600">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4 flex-shrink-0">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleSave}
                disabled={!formCustomerName.trim() || computedItems.length === 0}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {editingSale ? t("common.save") : t("sales.newSale")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t("sales.deleteSale")}</h3>
            <p className="text-sm text-gray-500 mb-6">{t("sales.deleteConfirm")}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">{t("common.cancel")}</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">{t("common.delete")}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Invoice / Print Modal ── */}
      {printSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">{t("sales.invoice")}</h2>
              <div className="flex gap-2">
                <button onClick={handlePrint} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"><Printer className="h-4 w-4" /> Print</button>
                <button onClick={() => setPrintSale(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="h-5 w-5 text-gray-500" /></button>
              </div>
            </div>
            <div id="invoice-content" className="p-6 space-y-4">
              <div className="text-center border-b pb-4">
                <h1 className="text-2xl font-bold text-gray-900">{companyName}</h1>
                <p className="text-sm text-gray-500">{settings?.address}</p>
                <p className="text-sm text-gray-500">{settings?.phone} | {settings?.email}</p>
              </div>
              <div className="flex justify-between text-sm">
                <div>
                  <p className="text-gray-500">Invoice #</p>
                  <p className="font-semibold text-gray-900">{printSale.saleNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500">Date</p>
                  <p className="font-semibold text-gray-900">{formatDate(printSale.date)}</p>
                </div>
              </div>
              <div className="text-sm border-t pt-3">
                <p className="text-gray-500">Bill To</p>
                <p className="font-semibold text-gray-900 mt-0.5">{printSale.customerName}</p>
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
                  {(printSale.items ?? []).map((item, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2">{item.productName}</td>
                      <td className="text-right py-2">{item.quantity}</td>
                      <td className="text-right py-2">{formatCurrency(item.unitPrice)}</td>
                      <td className="text-right py-2 font-medium">{formatCurrency(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan={3} className="pt-2 text-right text-gray-500">{t("sales.subtotal")}</td><td className="pt-2 text-right">{formatCurrency(printSale.subtotal)}</td></tr>
                  <tr><td colSpan={3} className="text-right text-gray-500">{t("sales.tax")} ({taxRateLabel})</td><td className="text-right">{formatCurrency(printSale.tax)}</td></tr>
                  <tr className="border-t">
                    <td colSpan={3} className="pt-2 text-right font-bold text-gray-900">{t("common.total")}</td>
                    <td className="pt-2 text-right font-bold text-indigo-600">{formatCurrency(printSale.total)}</td>
                  </tr>
                </tfoot>
              </table>
              <div className="text-center text-xs text-gray-400 border-t pt-4">
                Payment: <span className="capitalize font-medium">{printSale.paymentMethod}</span> &nbsp;|&nbsp;
                Status: <span className="capitalize font-medium">{printSale.status}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </PageGuard>
  )
}
