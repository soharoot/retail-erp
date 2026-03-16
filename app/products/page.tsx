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
import { FormError, FormWarning } from "@/components/shared/form-error"
import { formatCurrency } from "@/lib/utils"
import { validateProduct } from "@/lib/validation"
import type { Product, InventoryItem } from "@/lib/types"
import { Package, Tag, Edit2, Trash2, Plus, X, Archive, RotateCcw } from "lucide-react"

const DEFAULT_CATEGORIES = [
  "Electronics", "Clothing", "Food & Beverage", "Home & Garden",
  "Sports & Outdoors", "Books & Media", "Toys & Games", "Health & Beauty",
]

const emptyForm = {
  name: "",
  category: "",
  description: "",
  price: "",
  cost: "",
  status: "active" as "active" | "inactive",
}

export default function ProductsPage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const { orgId } = useRBAC()

  const [showArchived, setShowArchived] = useState(false)
  const {
    data: products,
    loading: productsLoading,
    insert: insertProduct,
    update: updateProduct,
    remove: removeProduct,
    refresh: refreshProducts,
  } = useTableData<Product>("products", {
    includeDeleted: showArchived,
    orderBy: { column: "name", ascending: true },
  })

  const {
    data: inventoryItems,
    loading: inventoryLoading,
  } = useTableData<InventoryItem>("inventory")

  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [warnings, setWarnings] = useState<string[]>([])
  const [search, setSearch] = useState("")
  const [filterCat, setFilterCat] = useState("All")
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // ── Derived data ──────────────────────────────────────────
  const activeProducts = products.filter((p) => !p.deletedAt)
  const displayProducts = showArchived ? products : activeProducts

  const categories = [...new Set(activeProducts.map((p) => p.category).filter(Boolean))]
  if (!categories.length) categories.push(...DEFAULT_CATEGORIES)

  const filtered = displayProducts.filter((p) => {
    const matchesSearch =
      (p.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.category ?? "").toLowerCase().includes(search.toLowerCase())
    const matchesCat = filterCat === "All" || p.category === filterCat
    return matchesSearch && matchesCat
  })

  const totalProducts = activeProducts.length
  const activeCount = activeProducts.filter((p) => p.status === "active").length
  const totalCategories = [...new Set(activeProducts.map((p) => p.category))].length
  const lowStockCount = inventoryItems.filter(
    (i) => (i.stock ?? 0) > 0 && (i.stock ?? 0) <= (i.minStock ?? 10)
  ).length

  // ── Modal helpers ─────────────────────────────────────────
  const openAdd = () => {
    setEditingProduct(null)
    setForm(emptyForm)
    setErrors({})
    setWarnings([])
    setShowModal(true)
  }

  const openEdit = (p: Product) => {
    setEditingProduct(p)
    setForm({
      name: p.name,
      category: p.category,
      description: p.description,
      price: String(p.price),
      cost: String(p.cost),
      status: p.status,
    })
    setErrors({})
    setWarnings([])
    setShowModal(true)
  }

  // ── Save (create or update) ───────────────────────────────
  const handleSave = async () => {
    // Validate
    const existingNames = activeProducts
      .filter((p) => p.id !== editingProduct?.id)
      .map((p) => p.name)

    const validation = validateProduct(form, existingNames)
    setErrors(validation.errors)
    setWarnings(validation.warnings)
    if (!validation.valid) return

    const price = parseFloat(form.price) || 0
    const cost = parseFloat(form.cost) || 0

    if (editingProduct) {
      // Update existing product
      await updateProduct(editingProduct.id, {
        name: form.name.trim(),
        category: form.category,
        description: (form.description ?? "").trim(),
        price,
        cost,
        status: form.status,
      } as Partial<Product>)

      if (user?.id && orgId) {
        logAction({
          action: "product.updated",
          module: "products",
          description: `Updated product "${form.name.trim()}" — price: ${price}, cost: ${cost}`,
          userId: user.id,
          orgId,
          userName: user.email ?? undefined,
          metadata: {
            product_id: editingProduct.id,
            previousValue: { name: editingProduct.name, price: editingProduct.price, cost: editingProduct.cost },
            newValue: { name: form.name.trim(), price, cost },
          },
        })
      }
    } else {
      // Create new product (inventory entry auto-created by DB trigger)
      const created = await insertProduct({
        name: form.name.trim(),
        category: form.category,
        description: (form.description ?? "").trim(),
        price,
        cost,
        status: form.status,
      } as Partial<Product>)

      if (created && user?.id && orgId) {
        logAction({
          action: "product.created",
          module: "products",
          description: `Created product "${form.name.trim()}" — price: ${price}, cost: ${cost}`,
          userId: user.id,
          orgId,
          userName: user.email ?? undefined,
          metadata: { product_id: created.id, price, cost },
        })
      }
    }

    setShowModal(false)
    refreshProducts()
  }

  // ── Delete (soft delete) ──────────────────────────────────
  const handleDelete = async (id: string) => {
    const product = products.find((p) => p.id === id)
    await removeProduct(id, true) // soft delete

    if (product && user?.id && orgId) {
      logAction({
        action: "product.deleted",
        module: "products",
        description: `Archived product "${product.name}"`,
        userId: user.id,
        orgId,
        userName: user.email ?? undefined,
        metadata: { product_id: id, name: product.name, price: product.price },
      })
    }
    setDeleteConfirm(null)
  }

  // ── Restore (undo soft delete) ────────────────────────────
  const handleRestore = async (id: string) => {
    await updateProduct(id, { deletedAt: null } as Partial<Product>)
    refreshProducts()
  }

  const statusColor = (s: string) =>
    s === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"

  const loading = productsLoading || inventoryLoading

  return (
    <PageGuard permission={PERMISSIONS.PRODUCTS_VIEW}>
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t("products.title")}
        subtitle={t("products.subtitle")}
        action={{ label: t("products.addProduct"), onClick: openAdd }}
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: t("products.totalProducts"), value: totalProducts, icon: Package, color: "text-indigo-600 bg-indigo-50" },
          { label: t("products.activeProducts"), value: activeCount, icon: Package, color: "text-green-600 bg-green-50" },
          { label: t("products.categories"), value: totalCategories, icon: Tag, color: "text-purple-600 bg-purple-50" },
          { label: t("products.lowStock"), value: lowStockCount, icon: Package, color: lowStockCount > 0 ? "text-amber-600 bg-amber-50" : "text-gray-600 bg-gray-50" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500">{kpi.label}</p>
              <span className={`rounded-lg p-1.5 ${kpi.color}`}>
                <kpi.icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{kpi.value}</p>
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
            <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="All">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
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
      </div>

      {/* Products table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <p className="text-gray-400">Loading products...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">{t("common.noData")}</p>
            <p className="text-sm text-gray-400 mt-1">
              {activeProducts.length === 0 ? "Add your first product to get started" : "Try adjusting your search or filter"}
            </p>
            {activeProducts.length === 0 && (
              <button
                onClick={openAdd}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" /> {t("products.addProduct")}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">{t("products.productName")}</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">{t("common.category")}</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">{t("products.sellingPrice")}</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">{t("products.costPrice")}</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">{t("common.status")}</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((product) => {
                  const isArchived = !!product.deletedAt
                  return (
                    <tr key={product.id} className={`hover:bg-gray-50 transition-colors ${isArchived ? "opacity-60" : ""}`}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">
                            {product.name}
                            {isArchived && (
                              <span className="ml-2 text-xs text-amber-600 bg-amber-50 rounded px-1.5 py-0.5">Archived</span>
                            )}
                          </p>
                          {product.description && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{product.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                          {product.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {formatCurrency(product.price ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {formatCurrency(product.cost ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColor(product.status ?? "active")}`}>
                          {(product.status ?? "active") === "active" ? t("common.active") : t("common.inactive")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {isArchived ? (
                            <button
                              onClick={() => handleRestore(product.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:bg-green-50 hover:text-green-600 transition-colors"
                              title="Restore product"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => openEdit(product)}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                title={t("products.editProduct")}
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(product.id)}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                title={t("products.deleteProduct")}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
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

      {/* ── Add/Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingProduct ? t("products.editProduct") : t("products.addProduct")}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {warnings.map((w, i) => (
                <FormWarning key={i} message={w} />
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("products.productName")} *</label>
                <input
                  value={form.name ?? ""}
                  onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors((prev) => ({ ...prev, name: "" })) }}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.name ? "border-red-300" : "border-gray-200"}`}
                  placeholder="e.g. Wireless Headphones"
                />
                <FormError error={errors.name} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("common.category")} *</label>
                <select
                  value={form.category}
                  onChange={(e) => { setForm({ ...form, category: e.target.value }); setErrors((prev) => ({ ...prev, category: "" })) }}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.category ? "border-red-300" : "border-gray-200"}`}
                >
                  <option value="">Select category</option>
                  {[...new Set([...DEFAULT_CATEGORIES, ...categories])].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <FormError error={errors.category} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("products.sellingPrice")} *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => { setForm({ ...form, price: e.target.value }); setErrors((prev) => ({ ...prev, price: "" })) }}
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.price ? "border-red-300" : "border-gray-200"}`}
                    placeholder="0.00"
                  />
                  <FormError error={errors.price} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("products.costPrice")} *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.cost}
                    onChange={(e) => { setForm({ ...form, cost: e.target.value }); setErrors((prev) => ({ ...prev, cost: "" })) }}
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.cost ? "border-red-300" : "border-gray-200"}`}
                    placeholder="0.00"
                  />
                  <FormError error={errors.cost} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("common.description")}</label>
                <textarea
                  value={form.description ?? ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Optional product description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("common.status")}</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "inactive" })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="active">{t("common.active")}</option>
                  <option value="inactive">{t("common.inactive")}</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleSave}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                {editingProduct ? t("common.save") : t("products.addProduct")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Archive Product</h3>
            <p className="text-sm text-gray-500 mb-6">
              This product will be archived and hidden from active lists. It can be restored later. Historical records (sales, invoices) will be preserved.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </PageGuard>
  )
}
