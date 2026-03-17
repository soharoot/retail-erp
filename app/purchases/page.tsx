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
import { FormError } from "@/components/shared/form-error"
import { validatePurchase, validatePayment } from "@/lib/validation"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { PurchaseOrder, PurchaseItem, Supplier, Product, InventoryItem, SupplierDebt, ProductVariation } from "@/lib/types"
import {
  ClipboardList, Clock, DollarSign, PackageCheck, X, Eye, Trash2,
  Plus, Minus, CreditCard, AlertTriangle,
} from "lucide-react"

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    pending: "En attente",
    approved: "Approuvé",
    received: "Reçu",
    cancelled: "Annulé",
  }
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-blue-100 text-blue-700",
    received: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  }
  const safe = status ?? "pending"
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${colors[safe] ?? "bg-gray-100 text-gray-600"}`}>
      {labels[safe] ?? safe}
    </span>
  )
}

interface FormItem {
  productId: string
  productName: string
  variationId: string
  quantity: string
  unitCost: string
}

export default function PurchasesPage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const { orgId } = useRBAC()
  const [settings] = useSettings()

  const {
    data: orders,
    loading: ordersLoading,
    insert: insertOrder,
    update: updateOrder,
    remove: removeOrder,
    refresh: refreshOrders,
  } = useTableData<PurchaseOrder>("purchase_orders", {
    select: "*, purchase_items(*)",
  })

  const { data: suppliers } = useTableData<Supplier>("suppliers")
  const { data: products, update: updateProduct } = useTableData<Product>("products")
  const { data: inventory, update: updateInventory, insert: insertInventory } = useTableData<InventoryItem>("inventory")
  const { data: variations, update: updateVariation, refresh: refreshVariations } = useTableData<ProductVariation>("product_variations")
  const { insert: insertDebt } = useTableData<SupplierDebt>("supplier_debts", { manual: true })

  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<PurchaseOrder | null>(null)
  const [showPayment, setShowPayment] = useState<PurchaseOrder | null>(null)

  // Form state
  const [formSupplierId, setFormSupplierId] = useState("")
  const [formItems, setFormItems] = useState<FormItem[]>([
    { productId: "", productName: "", variationId: "", quantity: "1", unitCost: "" },
  ])
  const [formAmountPaid, setFormAmountPaid] = useState("0")
  const [formExpectedDate, setFormExpectedDate] = useState("")
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentNote, setPaymentNote] = useState("")
  const [paymentError, setPaymentError] = useState("")

  const activeSuppliers = suppliers.filter((s) => s.status === "active")
  const activeProducts = products.filter((p) => p.status === "active" && !p.deletedAt)

  // Build inventory lookup
  const inventoryByProduct = new Map(inventory.map((i) => [i.productId, i]))

  // Build variations lookup by productId
  const variationsByProduct = new Map<string, ProductVariation[]>()
  for (const v of variations) {
    const list = variationsByProduct.get(v.productId) ?? []
    list.push(v)
    variationsByProduct.set(v.productId, list)
  }

  // ── Form item helpers ────────────────────────────────────
  const updateItem = (idx: number, field: keyof FormItem, value: string) => {
    setFormItems((prev) => prev.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [field]: value }
      if (field === "productId") {
        const prod = products.find((p) => p.id === value)
        if (prod) {
          updated.productName = prod.name
          // Do NOT auto-fill unitCost — cost is entered per purchase
          updated.unitCost = ""
        }
        // Reset variation when product changes
        updated.variationId = ""
      }
      return updated
    }))
    setFormErrors({})
  }

  const addItem = () => {
    setFormItems((prev) => [...prev, { productId: "", productName: "", variationId: "", quantity: "1", unitCost: "" }])
  }

  const removeItem = (idx: number) => {
    if (formItems.length <= 1) return
    setFormItems((prev) => prev.filter((_, i) => i !== idx))
  }

  const formSubtotal = formItems.reduce(
    (sum, item) => sum + (parseInt(item.quantity) || 0) * (parseFloat(item.unitCost) || 0),
    0
  )
  const formPaid = parseFloat(formAmountPaid) || 0
  const formRemainingDebt = Math.max(0, formSubtotal - formPaid)

  const resetForm = () => {
    setFormSupplierId("")
    setFormItems([{ productId: "", productName: "", variationId: "", quantity: "1", unitCost: "" }])
    setFormAmountPaid("0")
    setFormExpectedDate("")
    setFormErrors({})
  }

  // ── Tabs & filtering ─────────────────────────────────────
  const tabs = [
    { id: "all", label: t("purchases.allOrders") },
    { id: "pending", label: t("common.pending") },
    { id: "received", label: t("purchases.received") },
  ]

  const tabFiltered =
    activeTab === "all" ? orders : orders.filter((o) => o.status === activeTab)
  const filtered = tabFiltered.filter(
    (o) =>
      (o.poNumber ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (o.supplierName ?? "").toLowerCase().includes(search.toLowerCase())
  )

  // ── KPIs ─────────────────────────────────────────────────
  const totalOrders = orders.length
  const pendingCount = orders.filter((o) => o.status === "pending").length
  const totalValue = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + (o.total ?? 0), 0)
  const receivedUnits = orders
    .filter((o) => o.status === "received")
    .reduce((s, o) => s + (o.items ?? []).reduce((si, i) => si + (i?.quantity ?? 0), 0), 0)

  // ── Create order ─────────────────────────────────────────
  const handleCreateOrder = async () => {
    const validItems = formItems.filter((i) => i.productId && parseInt(i.quantity) > 0)
    const validation = validatePurchase({
      supplierId: formSupplierId,
      items: validItems.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitCost: i.unitCost,
      })),
    })
    if (!validation.valid) {
      setFormErrors(validation.errors)
      return
    }

    // Check variation required
    for (const item of validItems) {
      const prodVariations = variationsByProduct.get(item.productId)
      if (prodVariations && prodVariations.length > 0 && !item.variationId) {
        setFormErrors({ items: "Veuillez sélectionner une variation pour chaque produit qui en possède" })
        return
      }
    }

    const supplier = suppliers.find((s) => s.id === formSupplierId)
    if (!supplier) return

    const subtotal = validItems.reduce(
      (sum, i) => sum + (parseInt(i.quantity) || 0) * (parseFloat(i.unitCost) || 0),
      0
    )
    const paid = parseFloat(formAmountPaid) || 0
    const remaining = Math.max(0, subtotal - paid)
    const today = new Date().toISOString().split("T")[0]

    // Generate PO number
    const poPrefix = settings.poPrefix || "PO"
    const nextNum = orders.length + 1
    const poNumber = `${poPrefix}-${String(nextNum).padStart(4, "0")}`

    const newOrder = await insertOrder({
      poNumber,
      date: today,
      supplierId: supplier.id,
      supplierName: supplier.name,
      subtotal,
      tax: 0,
      total: subtotal,
      status: "pending",
      expectedDate: formExpectedDate || today,
      amountPaid: paid,
      remainingDebt: remaining,
    } as Partial<PurchaseOrder>)

    if (!newOrder) return

    // Insert purchase items (with variationId)
    const itemRows = validItems.map((i) => ({
      purchaseOrderId: newOrder.id,
      productId: i.productId,
      productName: i.productName || products.find((p) => p.id === i.productId)?.name || "Inconnu",
      quantity: parseInt(i.quantity),
      unitCost: parseFloat(i.unitCost),
      lineTotal: (parseInt(i.quantity) || 0) * (parseFloat(i.unitCost) || 0),
      variationId: i.variationId || null,
    }))
    await insertChildRows("purchase_items", itemRows)

    // Update stock: per-variation or per-inventory
    for (const item of validItems) {
      const qty = parseInt(item.quantity) || 0
      if (item.variationId) {
        // Update product_variations.stock
        const variation = variations.find((v) => v.id === item.variationId)
        if (variation) {
          await updateVariation(variation.id, { stock: variation.stock + qty } as Partial<ProductVariation>)
        }
      } else {
        // Update inventory.stock (existing behavior)
        const existing = inventoryByProduct.get(item.productId)
        if (existing) {
          await updateInventory(existing.id, { stock: existing.stock + qty, lastUpdated: today } as Partial<InventoryItem>)
        } else {
          await insertInventory({
            productId: item.productId,
            stock: qty,
            minStock: 10,
            lastUpdated: today,
          } as Partial<InventoryItem>)
        }
      }

      // Auto-update product.cost with latest purchase cost
      const prod = products.find((p) => p.id === item.productId)
      if (prod) {
        const cost = parseFloat(item.unitCost) || 0
        if (cost > 0) {
          await updateProduct(prod.id, { cost } as Partial<Product>)
        }
      }
    }

    // Auto-create supplier debt if remaining balance
    if (remaining > 0) {
      await insertDebt({
        supplierId: supplier.id,
        supplierName: supplier.name,
        purchaseOrderId: newOrder.id,
        totalAmount: subtotal,
        amountPaid: paid,
        remainingDebt: remaining,
        status: paid > 0 ? "partial" : "outstanding",
      } as Partial<SupplierDebt>)
    }

    // Audit log
    if (user?.id && orgId) {
      logAction({
        action: "purchase.created",
        module: "purchases",
        description: `Créé BC ${poNumber} de ${supplier.name} — ${formatCurrency(subtotal)}`,
        userId: user.id,
        orgId,
        userName: user.email ?? undefined,
        metadata: { poNumber, supplier: supplier.name, total: subtotal, items: validItems.length },
      })
    }

    refreshOrders()
    refreshVariations()
    setShowNewOrder(false)
    resetForm()
  }

  // ── Delete order ─────────────────────────────────────────
  const handleDeleteOrder = async (order: PurchaseOrder) => {
    const items = order.items ?? []
    const today = new Date().toISOString().split("T")[0]

    // Reverse stock changes
    for (const item of items) {
      if (item.variationId) {
        // Reverse variation stock
        const variation = variations.find((v) => v.id === item.variationId)
        if (variation) {
          const newStock = Math.max(0, variation.stock - (item.quantity ?? 0))
          await updateVariation(variation.id, { stock: newStock } as Partial<ProductVariation>)
        }
      } else {
        // Reverse inventory stock
        const inv = inventoryByProduct.get(item.productId ?? "")
        if (inv) {
          const newStock = Math.max(0, inv.stock - (item.quantity ?? 0))
          await updateInventory(inv.id, { stock: newStock, lastUpdated: today } as Partial<InventoryItem>)
        }
      }
    }

    // Delete purchase items
    await deleteChildRows("purchase_items", "purchaseOrderId", order.id)
    // Hard delete the order
    await removeOrder(order.id, false)

    // Audit log
    if (user?.id && orgId) {
      logAction({
        action: "purchase.deleted",
        module: "purchases",
        description: `Supprimé BC ${order.poNumber} de ${order.supplierName} — ${formatCurrency(order.total)}`,
        userId: user.id,
        orgId,
        userName: user.email ?? undefined,
        metadata: { poNumber: order.poNumber, supplier: order.supplierName, total: order.total },
      })
    }

    refreshOrders()
    refreshVariations()
    setDeleteConfirm(null)
  }

  // ── Mark as Received ─────────────────────────────────────
  const handleMarkReceived = async (order: PurchaseOrder) => {
    const today = new Date().toISOString().split("T")[0]
    await updateOrder(order.id, { status: "received", receivedDate: today } as Partial<PurchaseOrder>)

    if (user?.id && orgId) {
      logAction({
        action: "purchase.received",
        module: "purchases",
        description: `BC ${order.poNumber} marqué comme reçu`,
        userId: user.id,
        orgId,
        userName: user.email ?? undefined,
        metadata: { poNumber: order.poNumber, supplier: order.supplierName },
      })
    }

    refreshOrders()
    setSelectedOrder(null)
  }

  // ── Record Payment ───────────────────────────────────────
  const handleRecordPayment = async () => {
    if (!showPayment) return
    const amount = parseFloat(paymentAmount) || 0
    const maxPayable = showPayment.remainingDebt ?? 0

    const validation = validatePayment({ amount, maxAmount: maxPayable })
    if (!validation.valid) {
      setPaymentError(validation.errors.amount ?? "Paiement invalide")
      return
    }

    const newPaid = (showPayment.amountPaid ?? 0) + amount
    const newRemaining = Math.max(0, (showPayment.total ?? 0) - newPaid)

    // Update PO
    await updateOrder(showPayment.id, {
      amountPaid: newPaid,
      remainingDebt: newRemaining,
    } as Partial<PurchaseOrder>)

    // Audit log
    if (user?.id && orgId) {
      logAction({
        action: "purchase.payment",
        module: "purchases",
        description: `Paiement de ${formatCurrency(amount)} enregistré sur BC ${showPayment.poNumber}`,
        userId: user.id,
        orgId,
        userName: user.email ?? undefined,
        metadata: { poNumber: showPayment.poNumber, amount, newPaid, newRemaining },
      })
    }

    refreshOrders()
    setShowPayment(null)
    setPaymentAmount("")
    setPaymentNote("")
    setPaymentError("")
  }

  const loading = ordersLoading

  return (
    <PageGuard permission={PERMISSIONS.PURCHASES_VIEW}>
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t("purchases.title")}
        subtitle={t("purchases.subtitle")}
        action={{ label: t("purchases.newPurchase"), onClick: () => { resetForm(); setShowNewOrder(true) } }}
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: t("purchases.totalOrders"), value: String(totalOrders), icon: ClipboardList, color: "text-indigo-600 bg-indigo-50" },
          { title: t("common.pending"), value: String(pendingCount), icon: Clock, color: "text-yellow-600 bg-yellow-50" },
          { title: t("purchases.totalValue"), value: formatCurrency(totalValue), icon: DollarSign, color: "text-blue-600 bg-blue-50" },
          { title: t("purchases.received"), value: String(receivedUnits), icon: PackageCheck, color: "text-green-600 bg-green-50" },
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
          placeholder={t("common.search")}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <ClipboardList className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <p className="text-gray-400">{t("common.loading")}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">{t("common.noData")}</p>
            <p className="text-sm text-gray-400 mt-1">
              {orders.length === 0
                ? t("purchases.createFirstPurchase")
                : t("common.noResults")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">BC #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t("common.date")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t("purchases.supplier")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t("common.quantity")}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">{t("purchases.totalAmount")}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">{t("purchases.amountPaid")}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">{t("purchases.remainingDebt")}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">{t("common.status")}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-gray-900">{o.poNumber}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(o.date)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{o.supplierName}</td>
                    <td className="px-4 py-3 text-gray-500">{(o.items ?? []).reduce((s, i) => s + (i?.quantity ?? 0), 0)} unités</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(o.total)}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">{formatCurrency(o.amountPaid ?? 0)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={(o.remainingDebt ?? 0) > 0 ? "text-red-600 font-medium" : "text-green-600"}>
                        {formatCurrency(o.remainingDebt ?? 0)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                          title="Voir les détails"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {(o.remainingDebt ?? 0) > 0 && o.status !== "cancelled" && (
                          <button
                            onClick={() => { setShowPayment(o); setPaymentAmount(""); setPaymentNote(""); setPaymentError("") }}
                            className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600"
                            title={t("purchases.recordPayment")}
                          >
                            <CreditCard className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteConfirm(o)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"
                          title={t("purchases.deletePurchase")}
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
              <h2 className="text-lg font-bold text-gray-900">BC {selectedOrder.poNumber}</h2>
              <button onClick={() => setSelectedOrder(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">{t("purchases.supplier")} :</span><p className="font-medium text-gray-900">{selectedOrder.supplierName}</p></div>
                <div><span className="text-gray-500">{t("common.status")} :</span><div className="mt-1"><StatusBadge status={selectedOrder.status} /></div></div>
                <div><span className="text-gray-500">Date de commande :</span><p className="font-medium">{formatDate(selectedOrder.date)}</p></div>
                <div><span className="text-gray-500">Date prévue :</span><p className="font-medium">{selectedOrder.expectedDate ? formatDate(selectedOrder.expectedDate) : "—"}</p></div>
                <div><span className="text-gray-500">{t("purchases.amountPaid")} :</span><p className="font-medium text-green-600">{formatCurrency(selectedOrder.amountPaid ?? 0)}</p></div>
                <div><span className="text-gray-500">{t("purchases.remainingDebt")} :</span><p className={`font-medium ${(selectedOrder.remainingDebt ?? 0) > 0 ? "text-red-600" : "text-green-600"}`}>{formatCurrency(selectedOrder.remainingDebt ?? 0)}</p></div>
              </div>
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">{t("purchases.orderItems")}</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 text-gray-500">Article</th>
                      <th className="text-right py-2 text-gray-500">Qté</th>
                      <th className="text-right py-2 text-gray-500">Coût</th>
                      <th className="text-right py-2 text-gray-500">{t("common.total")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedOrder.items ?? []).map((item, i) => {
                      const variation = item.variationId ? variations.find((v) => v.id === item.variationId) : null
                      return (
                        <tr key={item.id ?? i} className="border-b border-gray-100">
                          <td className="py-2">
                            {item.productName}
                            {variation && (
                              <span className="ml-1 text-xs text-indigo-600">({variation.variationType}: {variation.variationValue})</span>
                            )}
                          </td>
                          <td className="text-right py-2">{item.quantity}</td>
                          <td className="text-right py-2">{formatCurrency(item.unitCost)}</td>
                          <td className="text-right py-2 font-medium">{formatCurrency(item.lineTotal)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="pt-3 text-right font-semibold">{t("common.total")} :</td>
                      <td className="pt-3 text-right font-bold text-indigo-600">{formatCurrency(selectedOrder.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Quick actions */}
              <div className="flex gap-3 border-t pt-4">
                {selectedOrder.status === "pending" && (
                  <button
                    onClick={() => handleMarkReceived(selectedOrder)}
                    className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    {t("purchases.markReceived")}
                  </button>
                )}
                {(selectedOrder.remainingDebt ?? 0) > 0 && selectedOrder.status !== "cancelled" && (
                  <button
                    onClick={() => {
                      setSelectedOrder(null)
                      setShowPayment(selectedOrder)
                      setPaymentAmount("")
                      setPaymentNote("")
                      setPaymentError("")
                    }}
                    className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    {t("purchases.recordPayment")}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t("purchases.deletePurchase")}</h3>
            <p className="text-sm text-gray-500 mb-1">
              BC <span className="font-mono font-medium">{deleteConfirm.poNumber}</span> de{" "}
              <span className="font-medium">{deleteConfirm.supplierName}</span>
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {t("purchases.deleteConfirm")}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => handleDeleteOrder(deleteConfirm)}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                {t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Record Payment Modal ── */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">{t("purchases.recordPayment")}</h2>
              <button
                onClick={() => { setShowPayment(null); setPaymentError("") }}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="font-medium text-gray-900">BC {showPayment.poNumber}</p>
                <p className="text-sm text-gray-500 mt-0.5">{showPayment.supplierName}</p>
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-gray-500">Reste à payer :</span>
                  <span className="font-semibold text-red-600">{formatCurrency(showPayment.remainingDebt ?? 0)}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("purchases.paymentAmount")}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={showPayment.remainingDebt ?? 0}
                  value={paymentAmount}
                  onChange={(e) => { setPaymentAmount(e.target.value); setPaymentError("") }}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0.00"
                />
                <FormError error={paymentError} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("purchases.paymentNote")}</label>
                <input
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="ex: Virement bancaire #1234"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => { setShowPayment(null); setPaymentError("") }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {t("purchases.recordPayment")}
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">{t("purchases.newPurchase")}</h2>
              <button onClick={() => setShowNewOrder(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {activeSuppliers.length === 0 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
                  {t("purchases.noSuppliers")}
                </div>
              )}

              {/* Supplier selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("purchases.supplier")} *</label>
                <select
                  value={formSupplierId}
                  onChange={(e) => { setFormSupplierId(e.target.value); setFormErrors({}) }}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">{t("purchases.selectSupplier")}</option>
                  {activeSuppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <FormError error={formErrors.supplier} />
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">{t("purchases.orderItems")} *</label>
                  <button
                    onClick={addItem}
                    className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    <Plus className="h-3.5 w-3.5" /> {t("purchases.addItem")}
                  </button>
                </div>
                <div className="space-y-3">
                  {formItems.map((item, idx) => {
                    const prodVariations = variationsByProduct.get(item.productId) ?? []
                    return (
                      <div key={idx} className="space-y-2 p-3 rounded-lg bg-gray-50 border border-gray-100">
                        <div className="flex gap-2 items-start">
                          <div className="flex-1">
                            <select
                              value={item.productId}
                              onChange={(e) => updateItem(idx, "productId", e.target.value)}
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="">{t("purchases.selectProduct")}</option>
                              {activeProducts.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </div>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                            className="w-20 rounded-lg border border-gray-200 px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Qté"
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={item.unitCost}
                            onChange={(e) => updateItem(idx, "unitCost", e.target.value)}
                            className="w-28 rounded-lg border border-gray-200 px-2 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder={t("purchases.unitCost")}
                          />
                          <span className="w-24 py-2 text-sm text-right font-medium text-gray-700">
                            {formatCurrency((parseInt(item.quantity) || 0) * (parseFloat(item.unitCost) || 0))}
                          </span>
                          {formItems.length > 1 && (
                            <button
                              onClick={() => removeItem(idx)}
                              className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        {/* Variation dropdown if product has variations */}
                        {prodVariations.length > 0 && (
                          <div className="ml-0">
                            <label className="block text-xs text-gray-500 mb-1">{t("purchases.selectVariation")}</label>
                            <select
                              value={item.variationId}
                              onChange={(e) => updateItem(idx, "variationId", e.target.value)}
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="">{t("purchases.selectVariation")}</option>
                              {prodVariations.map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.variationType}: {v.variationValue} (stock: {v.stock})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                <FormError error={formErrors.items} />
              </div>

              {/* Totals */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t("purchases.orderTotal")} :</span>
                  <span className="font-bold text-gray-900">{formatCurrency(formSubtotal)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("purchases.amountPaid")}</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("purchases.remainingDebt")}</label>
                  <div className={`w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-gray-50 font-semibold ${formRemainingDebt > 0 ? "text-red-600" : "text-green-600"}`}>
                    {formatCurrency(formRemainingDebt)}
                  </div>
                </div>
              </div>

              {formRemainingDebt > 0 && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    {t("purchases.debtWarning")} ({formatCurrency(formRemainingDebt)})
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("purchases.expectedDate")}</label>
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
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleCreateOrder}
                  disabled={!formSupplierId || formSubtotal <= 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("purchases.newPurchase")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </PageGuard>
  )
}
