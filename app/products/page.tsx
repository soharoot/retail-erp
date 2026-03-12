"use client"

import { useState } from "react"
import { useSupabaseData as useLocalStorage } from "@/hooks/use-supabase-data"
import { Pencil, Trash2, X, Plus, Package, Tag, Check } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { SearchInput } from "@/components/shared/search-input"
import { formatCurrency } from "@/lib/utils"

// ── Interfaces ────────────────────────────────────────────────────────────────
interface Category {
  id: string
  name: string
  color: string
}

interface Product {
  id: string
  sku: string
  name: string
  category: string
  description: string
  price: number
  cost: number
  stock: number
  minStock: number
  supplier: string
  status: string
  createdAt: string
}

// ── Color presets for categories ──────────────────────────────────────────────
const colorPresets = [
  { name: "Blue", value: "bg-blue-100 text-blue-700" },
  { name: "Pink", value: "bg-pink-100 text-pink-700" },
  { name: "Orange", value: "bg-orange-100 text-orange-700" },
  { name: "Green", value: "bg-green-100 text-green-700" },
  { name: "Purple", value: "bg-purple-100 text-purple-700" },
  { name: "Amber", value: "bg-amber-100 text-amber-700" },
  { name: "Cyan", value: "bg-cyan-100 text-cyan-700" },
  { name: "Indigo", value: "bg-indigo-100 text-indigo-700" },
  { name: "Rose", value: "bg-rose-100 text-rose-700" },
  { name: "Emerald", value: "bg-emerald-100 text-emerald-700" },
]

// ── Initial data ──────────────────────────────────────────────────────────────
const initialCategories: Category[] = [
  { id: "cat-1", name: "Electronics", color: "bg-blue-100 text-blue-700" },
  { id: "cat-2", name: "Footwear", color: "bg-pink-100 text-pink-700" },
  { id: "cat-3", name: "Appliances", color: "bg-orange-100 text-orange-700" },
  { id: "cat-4", name: "Sports", color: "bg-green-100 text-green-700" },
  { id: "cat-5", name: "Clothing", color: "bg-purple-100 text-purple-700" },
  { id: "cat-6", name: "Furniture", color: "bg-amber-100 text-amber-700" },
]

const initialProducts: Product[] = [
  { id: "1", sku: "WH-001", name: "Wireless Headphones", category: "Electronics", description: "High-quality wireless headphones with noise cancellation", price: 129.99, cost: 65, stock: 45, minStock: 10, supplier: "TechGear Wholesale", status: "active", createdAt: "2025-01-15" },
  { id: "2", sku: "RS-002", name: "Running Shoes", category: "Footwear", description: "Comfortable running shoes for daily training", price: 89.99, cost: 40, stock: 30, minStock: 15, supplier: "SportsPro Suppliers", status: "active", createdAt: "2025-01-20" },
  { id: "3", sku: "BL-003", name: "Blender Pro 3000", category: "Appliances", description: "Professional-grade kitchen blender with 10 speed settings", price: 199.99, cost: 95, stock: 12, minStock: 8, supplier: "HomeAppliance Direct", status: "active", createdAt: "2025-02-01" },
  { id: "4", sku: "YM-004", name: "Yoga Mat Premium", category: "Sports", description: "Non-slip premium yoga mat with carrying strap", price: 49.99, cost: 18, stock: 60, minStock: 20, supplier: "SportsPro Suppliers", status: "active", createdAt: "2025-02-10" },
  { id: "5", sku: "WJ-005", name: "Winter Jacket", category: "Clothing", description: "Insulated winter jacket with waterproof exterior", price: 159.99, cost: 72, stock: 25, minStock: 10, supplier: "FashionHub Wholesale", status: "active", createdAt: "2025-02-15" },
  { id: "6", sku: "SD-006", name: "Standing Desk", category: "Furniture", description: "Adjustable height standing desk with memory presets", price: 449.99, cost: 210, stock: 8, minStock: 5, supplier: "OfficeWorld Supply", status: "active", createdAt: "2025-03-01" },
  { id: "7", sku: "BT-007", name: "Bluetooth Speaker", category: "Electronics", description: "Portable waterproof bluetooth speaker with 20hr battery", price: 79.99, cost: 35, stock: 55, minStock: 15, supplier: "TechGear Wholesale", status: "active", createdAt: "2025-03-05" },
  { id: "8", sku: "HS-008", name: "Hiking Boots", category: "Footwear", description: "Durable waterproof hiking boots with ankle support", price: 139.99, cost: 60, stock: 18, minStock: 10, supplier: "SportsPro Suppliers", status: "active", createdAt: "2025-03-10" },
]

const emptyForm = {
  name: "",
  sku: "",
  category: "",
  description: "",
  price: "",
  cost: "",
  stock: "",
  minStock: "",
  supplier: "",
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const [categories, setCategories] = useLocalStorage<Category[]>("erp-categories", initialCategories)
  const [products, setProducts] = useLocalStorage<Product[]>("erp-products", initialProducts)
  const [search, setSearch] = useState("")
  const [showDialog, setShowDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  // ── Category management state ──
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [newCatName, setNewCatName] = useState("")
  const [newCatColor, setNewCatColor] = useState(colorPresets[0].value)
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editingCatName, setEditingCatName] = useState("")
  const [deleteCatWarning, setDeleteCatWarning] = useState<string | null>(null)

  // ── Helpers ──
  const getCatColor = (catName: string) => {
    const cat = categories.find(c => c.name === catName)
    return cat?.color || "bg-gray-100 text-gray-700"
  }

  const getProductCountForCategory = (catName: string) =>
    products.filter(p => p.category === catName).length

  // ── Product filtering ──
  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q)
    )
  })

  // ── Product CRUD ──
  const openAddDialog = () => {
    setEditingProduct(null)
    setForm({ ...emptyForm, category: categories[0]?.name || "" })
    setShowDialog(true)
  }

  const openEditDialog = (product: Product) => {
    setEditingProduct(product)
    setForm({
      name: product.name,
      sku: product.sku,
      category: product.category,
      description: product.description,
      price: product.price.toString(),
      cost: product.cost.toString(),
      stock: product.stock.toString(),
      minStock: product.minStock.toString(),
      supplier: product.supplier,
    })
    setShowDialog(true)
  }

  const handleSave = () => {
    if (!form.name || !form.sku || !form.price) return

    if (editingProduct) {
      setProducts(products.map((p) =>
        p.id === editingProduct.id
          ? {
              ...p,
              name: form.name,
              sku: form.sku,
              category: form.category,
              description: form.description,
              price: parseFloat(form.price) || 0,
              cost: parseFloat(form.cost) || 0,
              stock: parseInt(form.stock) || 0,
              minStock: parseInt(form.minStock) || 0,
              supplier: form.supplier,
            }
          : p
      ))
    } else {
      const newProduct: Product = {
        id: Date.now().toString(),
        sku: form.sku,
        name: form.name,
        category: form.category,
        description: form.description,
        price: parseFloat(form.price) || 0,
        cost: parseFloat(form.cost) || 0,
        stock: parseInt(form.stock) || 0,
        minStock: parseInt(form.minStock) || 0,
        supplier: form.supplier,
        status: "active",
        createdAt: new Date().toISOString().split("T")[0],
      }
      setProducts([...products, newProduct])
    }
    setShowDialog(false)
    setEditingProduct(null)
    setForm(emptyForm)
  }

  const handleDelete = (id: string) => {
    setProducts(products.filter((p) => p.id !== id))
    setShowDeleteConfirm(null)
  }

  // ── Category CRUD ──
  const handleAddCategory = () => {
    if (!newCatName.trim()) return
    if (categories.some(c => c.name.toLowerCase() === newCatName.trim().toLowerCase())) return
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: newCatName.trim(),
      color: newCatColor,
    }
    setCategories([...categories, newCat])
    setNewCatName("")
    setNewCatColor(colorPresets[0].value)
  }

  const handleSaveCategoryEdit = (catId: string) => {
    if (!editingCatName.trim()) return
    const oldCat = categories.find(c => c.id === catId)
    if (!oldCat) return

    // Rename in categories
    setCategories(categories.map(c => c.id === catId ? { ...c, name: editingCatName.trim() } : c))
    // Also rename in all products that used the old name
    if (oldCat.name !== editingCatName.trim()) {
      setProducts(products.map(p => p.category === oldCat.name ? { ...p, category: editingCatName.trim() } : p))
    }
    setEditingCatId(null)
    setEditingCatName("")
  }

  const handleDeleteCategory = (catId: string) => {
    const cat = categories.find(c => c.id === catId)
    if (!cat) return
    const count = getProductCountForCategory(cat.name)
    if (count > 0) {
      setDeleteCatWarning(catId)
      return
    }
    setCategories(categories.filter(c => c.id !== catId))
  }

  return (
    <div className="space-y-6">
      {/* Page Header with two action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your product catalog and inventory</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCategoryDialog(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Tag className="h-4 w-4" />
            Manage Categories
          </button>
          <button
            onClick={openAddDialog}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Product Catalog Section */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Product Catalog</h2>
              <p className="text-sm text-gray-500 mt-0.5">Browse and manage all products in your inventory</p>
            </div>
            <div className="sm:w-80">
              <SearchInput
                placeholder="Search products by name, category, or SKU..."
                value={search}
                onChange={setSearch}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono text-gray-600">{product.sku}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
                        <Package className="h-4 w-4 text-indigo-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getCatColor(product.category)}`}>
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{product.description}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">{formatCurrency(product.price)}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-sm font-medium ${product.stock <= product.minStock ? "text-red-600" : "text-gray-900"}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditDialog(product)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(product.id)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="text-sm text-gray-500">No products found matching your search.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            Showing {filteredProducts.length} of {products.length} products
          </p>
        </div>
      </div>

      {/* ── Add/Edit Product Dialog ── */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingProduct ? "Edit Product" : "Add New Product"}
              </h3>
              <button onClick={() => { setShowDialog(false); setEditingProduct(null) }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="Enter product name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                  <input type="text" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="e.g. WH-001" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white">
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none" rows={3} placeholder="Enter product description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                  <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="0.00" step="0.01" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost ($)</label>
                  <input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="0.00" step="0.01" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                  <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock</label>
                  <input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <input type="text" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="Enter supplier name" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => { setShowDialog(false); setEditingProduct(null) }} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleSave} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm">
                <Plus className="h-4 w-4" />
                {editingProduct ? "Update Product" : "Add Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Product Confirmation ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Product</h3>
              <p className="mt-2 text-sm text-gray-500">Are you sure you want to delete this product? This action cannot be undone.</p>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Category Management Dialog ── */}
      {showCategoryDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Manage Categories</h3>
              <button onClick={() => { setShowCategoryDialog(false); setDeleteCatWarning(null); setEditingCatId(null) }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Add new category row */}
            <div className="p-6 border-b border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">Add New Category</label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="flex-1 h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Category name"
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory() }}
                />
                <select
                  value={newCatColor}
                  onChange={(e) => setNewCatColor(e.target.value)}
                  className="h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  {colorPresets.map((c) => (
                    <option key={c.name} value={c.value}>{c.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleAddCategory}
                  className="inline-flex items-center gap-1 h-10 px-4 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>
            </div>

            {/* Category list */}
            <div className="p-6 space-y-2">
              {categories.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No categories yet. Add one above.</p>
              )}
              {categories.map((cat) => {
                const prodCount = getProductCountForCategory(cat.name)
                const isEditing = editingCatId === cat.id
                const hasWarning = deleteCatWarning === cat.id

                return (
                  <div key={cat.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cat.color}`}>
                        {isEditing ? "..." : cat.name}
                      </span>
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editingCatName}
                            onChange={(e) => setEditingCatName(e.target.value)}
                            className="flex-1 h-8 px-2 rounded border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === "Enter") handleSaveCategoryEdit(cat.id); if (e.key === "Escape") setEditingCatId(null) }}
                          />
                          <button onClick={() => handleSaveCategoryEdit(cat.id)} className="p-1 rounded hover:bg-green-100 text-green-600 transition-colors">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={() => setEditingCatId(null)} className="p-1 rounded hover:bg-gray-100 text-gray-400 transition-colors">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">
                          {prodCount} product{prodCount !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    {!isEditing && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditingCatId(cat.id); setEditingCatName(cat.name); setDeleteCatWarning(null) }}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className={`p-1.5 rounded-lg transition-colors ${prodCount > 0 ? "text-gray-300 cursor-not-allowed" : "hover:bg-gray-100 text-gray-400 hover:text-red-600"}`}
                          disabled={prodCount > 0}
                          title={prodCount > 0 ? `Cannot delete: ${prodCount} products use this category` : "Delete category"}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    {hasWarning && (
                      <div className="absolute" />
                    )}
                  </div>
                )
              })}

              {/* Warning message shown below the list if applicable */}
              {deleteCatWarning && (() => {
                const cat = categories.find(c => c.id === deleteCatWarning)
                const count = cat ? getProductCountForCategory(cat.name) : 0
                return count > 0 ? (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                    <Trash2 className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700">
                      Cannot delete <strong>{cat?.name}</strong>: {count} product{count !== 1 ? "s" : ""} {count !== 1 ? "are" : "is"} using this category. Reassign them first.
                    </p>
                  </div>
                ) : null
              })()}
            </div>

            <div className="flex items-center justify-end p-6 border-t border-gray-100">
              <button
                onClick={() => { setShowCategoryDialog(false); setDeleteCatWarning(null); setEditingCatId(null) }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
