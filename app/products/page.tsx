"use client"

import { useState } from "react"
import { useSupabaseData as useLocalStorage } from "@/hooks/use-supabase-data"
import { Pencil, Trash2, X, Plus, Package } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { SearchInput } from "@/components/shared/search-input"
import { getCategoryColor, formatCurrency } from "@/lib/utils"

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
  category: "Electronics",
  description: "",
  price: "",
  cost: "",
  stock: "",
  minStock: "",
  supplier: "",
}

export default function ProductsPage() {
  const [products, setProducts] = useLocalStorage<Product[]>("erp-products", initialProducts)
  const [search, setSearch] = useState("")
  const [showDialog, setShowDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q)
    )
  })

  const openAddDialog = () => {
    setEditingProduct(null)
    setForm(emptyForm)
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

  const categories = ["Electronics", "Footwear", "Appliances", "Sports", "Clothing", "Furniture"]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Management"
        subtitle="Manage your product catalog and inventory"
        action={{ label: "Add Product", onClick: openAddDialog }}
      />

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
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getCategoryColor(product.category)}`}>
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

      {/* Add/Edit Product Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingProduct ? "Edit Product" : "Add New Product"}
              </h3>
              <button
                onClick={() => { setShowDialog(false); setEditingProduct(null) }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter product name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="e.g. WH-001"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Enter product description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost ($)</label>
                  <input
                    type="number"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                  <input
                    type="number"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock</label>
                  <input
                    type="number"
                    value={form.minStock}
                    onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <input
                  type="text"
                  value={form.supplier}
                  onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter supplier name"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => { setShowDialog(false); setEditingProduct(null) }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
              >
                <Plus className="h-4 w-4" />
                {editingProduct ? "Update Product" : "Add Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Product</h3>
              <p className="mt-2 text-sm text-gray-500">
                Are you sure you want to delete this product? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
