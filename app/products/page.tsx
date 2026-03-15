"use client"

import { PageGuard } from "@/components/shared/permission-guard"
import { PERMISSIONS } from "@/lib/rbac/permissions"

import { useState } from "react"
import { useI18n } from "@/lib/i18n/context"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { PageHeader } from "@/components/layout/page-header"
import { generateId, formatCurrency } from "@/lib/utils"
import type { Product, InventoryItem } from "@/lib/types"
import { Package, Tag, Edit2, Trash2, Plus, X } from "lucide-react"

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
  const [products, setProducts] = useSupabaseData<Product[]>("erp-products", [])
  const [inventory, setInventory] = useSupabaseData<InventoryItem[]>("erp-inventory", [])
  const [categories, setCategories] = useSupabaseData<string[]>(
    "erp-categories",
    DEFAULT_CATEGORIES
  )

  const [showModal, setShowModal] = useState(false)
  const [showCatModal, setShowCatModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [newCategory, setNewCategory] = useState("")
  const [search, setSearch] = useState("")
  const [filterCat, setFilterCat] = useState("All")
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Guard: Supabase data may not be a proper array (null, object, corrupted, etc.)
  const safeProducts = (Array.isArray(products) ? products : []).filter(Boolean) as typeof products
  const safeInventory = (Array.isArray(inventory) ? inventory : []).filter(Boolean) as typeof inventory
  // Categories from Supabase may be old-format objects {id, name, color} — normalize to string[]
  const rawCategories = Array.isArray(categories) ? categories : DEFAULT_CATEGORIES
  const safeCategories = (rawCategories as unknown[])
    .map((c) => {
      if (typeof c === "string") return c
      if (c && typeof c === "object" && "name" in (c as object)) return (c as { name: string }).name
      return ""
    })
    .filter(Boolean) as string[]

  // ── derived ────────────────────────────────────────────────
  const filtered = safeProducts.filter((p) => {
    const matchesSearch =
      (p.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.category ?? "").toLowerCase().includes(search.toLowerCase())
    const matchesCat = filterCat === "All" || p.category === filterCat
    return matchesSearch && matchesCat
  })

  // ── open modal ──────────────────────────────────────────────
  const openAdd = () => {
    setEditingProduct(null)
    setForm(emptyForm)
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
    setShowModal(true)
  }

  // ── save ────────────────────────────────────────────────────
  const handleSave = () => {
    if (!form.name.trim() || !form.category) return

    const price = parseFloat(form.price) || 0
    const cost = parseFloat(form.cost) || 0
    const today = new Date().toISOString().slice(0, 10)

    if (editingProduct) {
      const updated: Product = {
        ...editingProduct,
        name: form.name.trim(),
        category: form.category,
        description: (form.description ?? "").trim(),
        price,
        cost,
        status: form.status,
      }
      setProducts(safeProducts.map((p) => (p.id === editingProduct.id ? updated : p)))
      // Sync name/category in inventory
      setInventory(
        safeInventory.map((i) =>
          i.productId === editingProduct.id
            ? { ...i, productName: updated.name, category: updated.category }
            : i
        )
      )
    } else {
      const newProduct: Product = {
        id: generateId(),
        name: form.name.trim(),
        category: form.category,
        description: (form.description ?? "").trim(),
        price,
        cost,
        status: form.status,
        createdAt: today,
      }
      setProducts([...safeProducts, newProduct])

      // Auto-create inventory entry with stock = 0
      const invEntry: InventoryItem = {
        id: newProduct.id,
        productId: newProduct.id,
        productName: newProduct.name,
        category: newProduct.category,
        stock: 0,
        minStock: 10,
        lastUpdated: today,
      }
      setInventory([...safeInventory, invEntry])
    }

    setShowModal(false)
  }

  // ── delete ──────────────────────────────────────────────────
  const handleDelete = (id: string) => {
    setProducts(safeProducts.filter((p) => p.id !== id))
    setInventory(safeInventory.filter((i) => i.productId !== id))
    setDeleteConfirm(null)
  }

  // ── categories ──────────────────────────────────────────────
  const handleAddCategory = () => {
    const trimmed = newCategory.trim()
    if (trimmed && !safeCategories.includes(trimmed)) {
      setCategories([...safeCategories, trimmed])
    }
    setNewCategory("")
  }

  const handleDeleteCategory = (cat: string) => {
    const inUse = safeProducts.some((p) => p.category === cat)
    if (!inUse) setCategories(safeCategories.filter((c) => c !== cat))
  }

  const totalProducts = safeProducts.length
  const activeProducts = safeProducts.filter((p) => p.status === "active").length
  const totalCategories = safeCategories.length

  const statusColor = (s: string) =>
    s === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"

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
          { label: t("products.activeProducts"), value: activeProducts, icon: Package, color: "text-green-600 bg-green-50" },
          { label: t("products.categories"), value: totalCategories, icon: Tag, color: "text-purple-600 bg-purple-50" },
          { label: t("products.lowStock"), value: totalProducts - activeProducts, icon: Package, color: "text-gray-600 bg-gray-50" },
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
            {safeCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            onClick={() => setShowCatModal(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Tag className="h-4 w-4" />
            {t("products.manageCategories")}
          </button>
        </div>
      </div>

      {/* Products table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">{t("common.noData")}</p>
            <p className="text-sm text-gray-400 mt-1">
              {safeProducts.length === 0 ? "Add your first product to get started" : "Try adjusting your search or filter"}
            </p>
            {safeProducts.length === 0 && (
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
                {filtered.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
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
                      </div>
                    </td>
                  </tr>
                ))}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("products.productName")} *</label>
                <input
                  value={form.name ?? ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Wireless Headphones"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("common.category")} *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select category</option>
                  {safeCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("products.sellingPrice")}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("products.costPrice")}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.00"
                  />
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
                disabled={!form.name.trim() || !form.category}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t("products.deleteProduct")}</h3>
            <p className="text-sm text-gray-500 mb-6">
              {t("products.deleteConfirm")}
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
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                {t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Categories Modal ── */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">{t("products.categoriesTitle")}</h2>
              <button onClick={() => setShowCatModal(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-2">
                <input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                  placeholder={t("products.categoryName")}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleAddCategory}
                  className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {safeCategories.map((cat) => {
                  const inUse = safeProducts.some((p) => p.category === cat)
                  return (
                    <div key={cat} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                      <span className="text-sm text-gray-700">{cat}</span>
                      <button
                        onClick={() => handleDeleteCategory(cat)}
                        disabled={inUse}
                        className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                        title={inUse ? "Category is in use" : "Delete category"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </PageGuard>
  )
}
