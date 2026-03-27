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
import { formatCurrency, generateBarcode } from "@/lib/utils"
import { validateProduct } from "@/lib/validation"
import type { Product, InventoryItem, Category, SubCategory, ProductVariation, VariationType, VariationValue } from "@/lib/types"
import { Package, Tag, Edit2, Trash2, Plus, X, Archive, RotateCcw, FolderTree, Minus, Barcode, Zap } from "lucide-react"

const UNIT_LABELS: Record<string, string> = { piece: "Pièce", kg: "Kilogramme (kg)", metre: "Mètre (m)" }
const UNIT_SHORT: Record<string, string> = { piece: "pc", kg: "kg", metre: "m" }

const emptyForm = {
  name: "",
  categoryId: "",
  subCategoryId: "",
  description: "",
  price: "",
  cost: "",
  unit: "piece" as "piece" | "kg" | "metre",
  barcode: "",
  status: "active" as "active" | "inactive",
}

interface VariationForm {
  variationType: string
  variationValue: string
  stock: string
  price: string
  cost: string
  barcode: string
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

  const {
    data: categories,
    loading: categoriesLoading,
    insert: insertCategory,
    remove: removeCategory,
    refresh: refreshCategories,
  } = useTableData<Category>("categories", {
    orderBy: { column: "name", ascending: true },
  })

  const {
    data: subCategories,
    insert: insertSubCategory,
    remove: removeSubCategory,
    refresh: refreshSubCategories,
  } = useTableData<SubCategory>("sub_categories", {
    orderBy: { column: "name", ascending: true },
  })

  const {
    data: variations,
    insert: insertVariation,
    remove: removeVariation,
    refresh: refreshVariations,
  } = useTableData<ProductVariation>("product_variations", {
    orderBy: { column: "variation_type", ascending: true },
  })

  const {
    data: variationTypes,
    insert: insertVariationType,
    remove: removeVariationType,
    refresh: refreshVariationTypes,
  } = useTableData<VariationType>("variation_types", {
    orderBy: { column: "name", ascending: true },
  })

  const {
    data: variationValues,
    insert: insertVariationValue,
    remove: removeVariationValue,
    refresh: refreshVariationValues,
  } = useTableData<VariationValue>("variation_values", {
    orderBy: { column: "value", ascending: true },
  })

  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [warnings, setWarnings] = useState<string[]>([])
  const [search, setSearch] = useState("")
  const [filterCat, setFilterCat] = useState("All")
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Category management state
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newSubCategoryName, setNewSubCategoryName] = useState("")
  const [selectedCategoryForSub, setSelectedCategoryForSub] = useState("")
  const [catError, setCatError] = useState("")

  // Variation management state (within product form)
  const [productVariations, setProductVariations] = useState<VariationForm[]>([])
  const [existingVariations, setExistingVariations] = useState<ProductVariation[]>([])

  // Variation types/values management modal state
  const [showVariationModal, setShowVariationModal] = useState(false)
  const [newTypeName, setNewTypeName] = useState("")
  const [newValueName, setNewValueName] = useState("")
  const [selectedTypeForValue, setSelectedTypeForValue] = useState("")
  const [varError, setVarError] = useState("")

  // ── Derived data ──────────────────────────────────────────
  const activeProducts = products.filter((p) => !p.deletedAt)
  const displayProducts = showArchived ? products : activeProducts

  // Category/sub-category maps
  const categoryMap = new Map(categories.map((c) => [c.id, c]))
  const subCategoryMap = new Map(subCategories.map((s) => [s.id, s]))

  // Sub-categories filtered by selected category in form
  const filteredSubCats = form.categoryId
    ? subCategories.filter((s) => s.categoryId === form.categoryId)
    : []

  const filtered = displayProducts.filter((p) => {
    const catName = p.categoryId ? categoryMap.get(p.categoryId)?.name ?? "" : p.category ?? ""
    const matchesSearch =
      (p.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      catName.toLowerCase().includes(search.toLowerCase())
    const matchesCat = filterCat === "All" || p.categoryId === filterCat || p.category === filterCat
    return matchesSearch && matchesCat
  })

  const totalProducts = activeProducts.length
  const activeCount = activeProducts.filter((p) => p.status === "active").length
  const totalCategories = categories.length
  const lowStockCount = inventoryItems.filter(
    (i) => (i.stock ?? 0) > 0 && (i.stock ?? 0) <= (i.minStock ?? 10)
  ).length

  // Variations per product
  const variationsByProduct = new Map<string, ProductVariation[]>()
  for (const v of variations) {
    const list = variationsByProduct.get(v.productId) ?? []
    list.push(v)
    variationsByProduct.set(v.productId, list)
  }

  // ── Modal helpers ─────────────────────────────────────────
  const openAdd = () => {
    setEditingProduct(null)
    setForm(emptyForm)
    setErrors({})
    setWarnings([])
    setProductVariations([])
    setExistingVariations([])
    setShowModal(true)
  }

  const openEdit = (p: Product) => {
    setEditingProduct(p)
    setForm({
      name: p.name,
      categoryId: p.categoryId ?? "",
      subCategoryId: p.subCategoryId ?? "",
      description: p.description,
      price: String(p.price),
      cost: String(p.cost ?? ""),
      unit: p.unit ?? "piece",
      barcode: p.barcode ?? "",
      status: p.status,
    })
    setErrors({})
    setWarnings([])
    setProductVariations([])
    setExistingVariations(variationsByProduct.get(p.id) ?? [])
    setShowModal(true)
  }

  // ── Save (create or update) ───────────────────────────────
  const handleSave = async () => {
    const existingNames = activeProducts
      .filter((p) => p.id !== editingProduct?.id)
      .map((p) => p.name)

    const validation = validateProduct(
      { name: form.name, categoryId: form.categoryId || undefined, price: form.price },
      existingNames
    )
    setErrors(validation.errors)
    setWarnings(validation.warnings)
    if (!validation.valid) return

    const price = parseFloat(form.price) || 0
    const catName = form.categoryId ? categoryMap.get(form.categoryId)?.name ?? "" : ""

    if (editingProduct) {
      await updateProduct(editingProduct.id, {
        name: form.name.trim(),
        categoryId: form.categoryId || null,
        subCategoryId: form.subCategoryId || null,
        category: catName,
        description: (form.description ?? "").trim(),
        price,
        cost: parseFloat(form.cost) || 0,
        unit: form.unit,
        barcode: form.barcode.trim() || null,
        status: form.status,
      } as Partial<Product>)

      if (user?.id && orgId) {
        logAction({
          action: "product.updated",
          module: "products",
          description: `Produit modifié "${form.name.trim()}" — prix: ${price}`,
          userId: user.id,
          orgId,
          userName: user.email ?? undefined,
          metadata: { product_id: editingProduct.id },
        })
      }

      // Save new variations for this product
      for (const v of productVariations) {
        if (v.variationType && v.variationValue) {
          await insertVariation({
            productId: editingProduct.id,
            variationType: v.variationType,
            variationValue: v.variationValue,
            stock: parseFloat(v.stock) || 0,
            price: v.price ? parseFloat(v.price) : null,
            cost: v.cost ? parseFloat(v.cost) : null,
            barcode: v.barcode.trim() || null,
          } as Partial<ProductVariation>)
        }
      }
    } else {
      const created = await insertProduct({
        name: form.name.trim(),
        categoryId: form.categoryId || null,
        subCategoryId: form.subCategoryId || null,
        category: catName,
        description: (form.description ?? "").trim(),
        price,
        cost: parseFloat(form.cost) || 0,
        unit: form.unit,
        barcode: form.barcode.trim() || null,
        status: form.status,
      } as Partial<Product>)

      if (created) {
        if (user?.id && orgId) {
          logAction({
            action: "product.created",
            module: "products",
            description: `Produit créé "${form.name.trim()}" — prix: ${price}`,
            userId: user.id,
            orgId,
            userName: user.email ?? undefined,
            metadata: { product_id: created.id, price },
          })
        }

        // Create variations for new product
        for (const v of productVariations) {
          if (v.variationType && v.variationValue) {
            await insertVariation({
              productId: created.id,
              variationType: v.variationType,
              variationValue: v.variationValue,
              stock: parseInt(v.stock) || 0,
            } as Partial<ProductVariation>)
          }
        }
      }
    }

    setShowModal(false)
    refreshProducts()
    refreshVariations()
  }

  // ── Delete (soft delete) ──────────────────────────────────
  const handleDelete = async (id: string) => {
    const product = products.find((p) => p.id === id)
    await removeProduct(id, true)

    if (product && user?.id && orgId) {
      logAction({
        action: "product.deleted",
        module: "products",
        description: `Produit archivé "${product.name}"`,
        userId: user.id,
        orgId,
        userName: user.email ?? undefined,
        metadata: { product_id: id, name: product.name },
      })
    }
    setDeleteConfirm(null)
  }

  const handleRestore = async (id: string) => {
    await updateProduct(id, { deletedAt: null } as Partial<Product>)
    refreshProducts()
  }

  // ── Category management ───────────────────────────────────
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) { setCatError("Le nom de la catégorie est requis"); return }
    if (categories.some((c) => c.name.toLowerCase() === newCategoryName.trim().toLowerCase())) {
      setCatError("Cette catégorie existe déjà"); return
    }
    await insertCategory({ name: newCategoryName.trim() } as Partial<Category>)
    setNewCategoryName("")
    setCatError("")
    refreshCategories()
  }

  const handleDeleteCategory = async (catId: string) => {
    if (products.some((p) => p.categoryId === catId)) {
      setCatError(t("products.cannotDeleteCategory")); return
    }
    const subs = subCategories.filter((s) => s.categoryId === catId)
    for (const sub of subs) await removeSubCategory(sub.id, false)
    await removeCategory(catId, false)
    setCatError("")
    refreshCategories()
    refreshSubCategories()
  }

  const handleAddSubCategory = async () => {
    if (!selectedCategoryForSub) { setCatError("Sélectionnez une catégorie"); return }
    if (!newSubCategoryName.trim()) { setCatError("Le nom de la sous-catégorie est requis"); return }
    const existing = subCategories.filter((s) => s.categoryId === selectedCategoryForSub)
    if (existing.some((s) => s.name.toLowerCase() === newSubCategoryName.trim().toLowerCase())) {
      setCatError("Cette sous-catégorie existe déjà"); return
    }
    await insertSubCategory({ categoryId: selectedCategoryForSub, name: newSubCategoryName.trim() } as Partial<SubCategory>)
    setNewSubCategoryName("")
    setCatError("")
    refreshSubCategories()
  }

  const handleDeleteSubCategory = async (subId: string) => {
    if (products.some((p) => p.subCategoryId === subId)) {
      setCatError(t("products.cannotDeleteSubCategory")); return
    }
    await removeSubCategory(subId, false)
    setCatError("")
    refreshSubCategories()
  }

  // ── Variation type/value management ──────────────────────
  const handleAddVariationType = async () => {
    if (!newTypeName.trim()) { setVarError("Le nom du type est requis"); return }
    if (variationTypes.some((vt) => vt.name.toLowerCase() === newTypeName.trim().toLowerCase())) {
      setVarError("Ce type de variation existe déjà"); return
    }
    await insertVariationType({ name: newTypeName.trim() } as Partial<VariationType>)
    setNewTypeName("")
    setVarError("")
    await refreshVariationTypes()
  }

  const handleDeleteVariationType = async (typeId: string) => {
    // Check if any product_variations use this type name
    const typeName = variationTypes.find((vt) => vt.id === typeId)?.name
    if (typeName && variations.some((v) => v.variationType === typeName)) {
      setVarError(t("products.cannotDeleteVariationType")); return
    }
    // Delete associated values first
    const vals = variationValues.filter((vv) => vv.variationTypeId === typeId)
    for (const val of vals) await removeVariationValue(val.id, false)
    await removeVariationType(typeId, false)
    setVarError("")
    await refreshVariationTypes()
    await refreshVariationValues()
  }

  const handleAddVariationValue = async () => {
    if (!selectedTypeForValue) { setVarError("Sélectionnez un type de variation"); return }
    if (!newValueName.trim()) { setVarError("La valeur est requise"); return }
    const existing = variationValues.filter((vv) => vv.variationTypeId === selectedTypeForValue)
    if (existing.some((vv) => vv.value.toLowerCase() === newValueName.trim().toLowerCase())) {
      setVarError("Cette valeur existe déjà pour ce type"); return
    }
    await insertVariationValue({ variationTypeId: selectedTypeForValue, value: newValueName.trim() } as Partial<VariationValue>)
    setNewValueName("")
    setVarError("")
    await refreshVariationValues()
  }

  const handleDeleteVariationValue = async (valueId: string) => {
    const val = variationValues.find((vv) => vv.id === valueId)
    if (val) {
      const typeName = variationTypes.find((vt) => vt.id === val.variationTypeId)?.name
      if (typeName && variations.some((v) => v.variationType === typeName && v.variationValue === val.value)) {
        setVarError(t("products.cannotDeleteVariationValue")); return
      }
    }
    await removeVariationValue(valueId, false)
    setVarError("")
    await refreshVariationValues()
  }

  const handleSeedDefaults = async () => {
    const defaults = [
      { name: "Taille", values: ["XS", "S", "M", "L", "XL", "XXL"] },
      { name: "Couleur", values: ["Noir", "Blanc", "Rouge", "Bleu", "Vert"] },
      { name: "Stockage", values: ["64Go", "128Go", "256Go", "512Go", "1To"] },
      { name: "Poids", values: ["250g", "500g", "1kg", "2kg", "5kg"] },
      { name: "Matériau", values: ["Coton", "Polyester", "Cuir", "Métal", "Plastique"] },
    ]
    for (const def of defaults) {
      if (variationTypes.some((vt) => vt.name.toLowerCase() === def.name.toLowerCase())) continue
      const created = await insertVariationType({ name: def.name } as Partial<VariationType>)
      if (created) {
        for (const val of def.values) {
          await insertVariationValue({ variationTypeId: created.id, value: val } as Partial<VariationValue>)
        }
      }
    }
    await refreshVariationTypes()
    await refreshVariationValues()
  }

  // Build values by type for product form
  const valuesByType = new Map<string, VariationValue[]>()
  for (const vv of variationValues) {
    const list = valuesByType.get(vv.variationTypeId) ?? []
    list.push(vv)
    valuesByType.set(vv.variationTypeId, list)
  }

  // ── Variation helpers ─────────────────────────────────────
  const addVariationRow = () => setProductVariations([...productVariations, { variationType: "", variationValue: "", stock: "0", price: "", cost: "", barcode: "" }])

  // Generate combinations from selected types/values
  const [showCombinationBuilder, setShowCombinationBuilder] = useState(false)
  const [selectedTypesForCombo, setSelectedTypesForCombo] = useState<Record<string, string[]>>({})

  const toggleComboType = (typeName: string) => {
    setSelectedTypesForCombo((prev) => {
      const copy = { ...prev }
      if (copy[typeName]) delete copy[typeName]
      else copy[typeName] = []
      return copy
    })
  }

  const toggleComboValue = (typeName: string, value: string) => {
    setSelectedTypesForCombo((prev) => {
      const copy = { ...prev }
      const vals = copy[typeName] ?? []
      copy[typeName] = vals.includes(value) ? vals.filter((v) => v !== value) : [...vals, value]
      return copy
    })
  }

  const generateCombinations = () => {
    const entries = Object.entries(selectedTypesForCombo).filter(([, vals]) => vals.length > 0)
    if (entries.length === 0) return

    // Cartesian product
    let combos: Array<Array<{ type: string; value: string }>> = [[]]
    for (const [typeName, values] of entries) {
      const next: typeof combos = []
      for (const combo of combos) {
        for (const val of values) {
          next.push([...combo, { type: typeName, value: val }])
        }
      }
      combos = next
    }

    const newRows: VariationForm[] = combos.map((combo) => ({
      variationType: combo.map((c) => c.type).join(" / "),
      variationValue: combo.map((c) => c.value).join(" / "),
      stock: "0",
      price: "",
      cost: "",
      barcode: "",
    }))

    setProductVariations((prev) => [...prev, ...newRows])
    setShowCombinationBuilder(false)
    setSelectedTypesForCombo({})
  }
  const removeVariationRow = (idx: number) => setProductVariations(productVariations.filter((_, i) => i !== idx))
  const updateVariationRow = (idx: number, field: keyof VariationForm, value: string) =>
    setProductVariations(productVariations.map((v, i) => i === idx ? { ...v, [field]: value } : v))

  const handleDeleteExistingVariation = async (varId: string) => {
    await removeVariation(varId, false)
    setExistingVariations(existingVariations.filter((v) => v.id !== varId))
    refreshVariations()
  }

  const statusColor = (s: string) => s === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
  const loading = productsLoading || inventoryLoading || categoriesLoading

  return (
    <PageGuard permission={PERMISSIONS.PRODUCTS_VIEW}>
    <div className="space-y-6 animate-fade-in">
      <PageHeader title={t("products.title")} subtitle={t("products.subtitle")} action={{ label: t("products.addProduct"), onClick: openAdd }} />

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: t("products.totalProducts"), value: totalProducts, icon: Package, color: "text-[#00483c] bg-[#e6f0ed]" },
          { label: t("products.activeProducts"), value: activeCount, icon: Package, color: "text-green-600 bg-green-50" },
          { label: t("products.categories"), value: totalCategories, icon: Tag, color: "text-purple-600 bg-purple-50" },
          { label: t("products.lowStock"), value: lowStockCount, icon: Package, color: lowStockCount > 0 ? "text-amber-600 bg-amber-50" : "text-gray-600 bg-gray-50" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500">{kpi.label}</p>
              <span className={`rounded-lg p-1.5 ${kpi.color}`}><kpi.icon className="h-4 w-4" /></span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("common.search")} className="w-full rounded-lg border border-gray-200 px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-[#00483c]" />
            <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00483c]">
            <option value="All">{t("products.allCategories")}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={() => setShowCategoryModal(true)} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <FolderTree className="h-4 w-4" /> {t("products.manageCategories")}
          </button>
          <button onClick={() => { setShowVariationModal(true); setVarError("") }} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Tag className="h-4 w-4" /> {t("products.manageVariations")}
          </button>
          <button onClick={() => setShowArchived(!showArchived)} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${showArchived ? "border-amber-200 bg-amber-50 text-amber-700" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
            <Archive className="h-4 w-4" />
            {showArchived ? t("products.hideArchived") : t("products.showArchived")}
          </button>
        </div>
      </div>

      {/* Products table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center"><p className="text-gray-400">{t("common.loading")}</p></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">{t("common.noData")}</p>
            <p className="text-sm text-gray-400 mt-1">{activeProducts.length === 0 ? t("products.addFirstProduct") : t("products.adjustSearch")}</p>
            {activeProducts.length === 0 && (
              <button onClick={openAdd} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#00483c] px-4 py-2 text-sm font-medium text-white hover:bg-[#003d33]">
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
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">{t("common.subCategory")}</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">{t("products.unit")}</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">{t("products.sellingPrice")}</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">{t("products.barcode")}</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">{t("common.variations")}</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">{t("common.status")}</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((product) => {
                  const isArchived = !!product.deletedAt
                  const catName = product.categoryId ? categoryMap.get(product.categoryId)?.name : product.category
                  const subCatName = product.subCategoryId ? subCategoryMap.get(product.subCategoryId)?.name : ""
                  const prodVars = variationsByProduct.get(product.id) ?? []
                  return (
                    <tr key={product.id} className={`hover:bg-gray-50 transition-colors ${isArchived ? "opacity-60" : ""}`}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">
                            {product.name}
                            {isArchived && <span className="ml-2 text-xs text-amber-600 bg-amber-50 rounded px-1.5 py-0.5">{t("products.archived")}</span>}
                          </p>
                          {product.description && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{product.description}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3">{catName && <span className="rounded-full bg-[#e6f0ed] px-2.5 py-1 text-xs font-medium text-[#003d33]">{catName}</span>}</td>
                      <td className="px-4 py-3">{subCatName && <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">{subCatName}</span>}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{UNIT_SHORT[product.unit ?? "piece"] ?? "pc"}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(product.price ?? 0)}</td>
                      <td className="px-4 py-3 text-center">
                        {product.barcode ? <span className="font-mono text-xs text-gray-500" title={product.barcode}>{product.barcode.slice(0, 8)}…</span> : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {prodVars.length > 0 ? <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">{prodVars.length} var.</span> : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColor(product.status ?? "active")}`}>
                          {(product.status ?? "active") === "active" ? t("common.active") : t("common.inactive")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {isArchived ? (
                            <button onClick={() => handleRestore(product.id)} className="p-1.5 rounded-lg text-gray-400 hover:bg-green-50 hover:text-green-600 transition-colors" title={t("products.restoreProduct")}>
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          ) : (
                            <>
                              <button onClick={() => openEdit(product)} className="p-1.5 rounded-lg text-gray-400 hover:bg-[#e6f0ed] hover:text-[#00483c] transition-colors" title={t("products.editProduct")}><Edit2 className="h-4 w-4" /></button>
                              <button onClick={() => setDeleteConfirm(product.id)} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors" title={t("products.deleteProduct")}><Trash2 className="h-4 w-4" /></button>
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

      {/* ── Add/Edit Product Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">{editingProduct ? t("products.editProduct") : t("products.addProduct")}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="h-5 w-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              {warnings.map((w, i) => <FormWarning key={i} message={w} />)}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("products.productName")} *</label>
                <input value={form.name ?? ""} onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors((p) => ({ ...p, name: "" })) }} className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00483c] ${errors.name ? "border-red-300" : "border-gray-200"}`} placeholder="ex: Smartphone Samsung A54" />
                <FormError error={errors.name} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("common.category")} *</label>
                  <select value={form.categoryId} onChange={(e) => { setForm({ ...form, categoryId: e.target.value, subCategoryId: "" }); setErrors((p) => ({ ...p, category: "" })) }} className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00483c] ${errors.category ? "border-red-300" : "border-gray-200"}`}>
                    <option value="">{t("products.selectCategory")}</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <FormError error={errors.category} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("common.subCategory")}</label>
                  <select value={form.subCategoryId} onChange={(e) => setForm({ ...form, subCategoryId: e.target.value })} disabled={!form.categoryId} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00483c] disabled:opacity-50">
                    <option value="">{t("products.selectSubCategory")}</option>
                    {filteredSubCats.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("products.sellingPrice")} *</label>
                  <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => { setForm({ ...form, price: e.target.value }); setErrors((p) => ({ ...p, price: "" })) }} className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00483c] ${errors.price ? "border-red-300" : "border-gray-200"}`} placeholder="0.00" />
                  <FormError error={errors.price} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("products.cost")}</label>
                  <input type="number" min="0" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00483c]" placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("products.unit")}</label>
                  <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value as "piece" | "kg" | "metre" })} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00483c]">
                    {Object.entries(UNIT_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                  {form.unit !== "piece" && <p className="text-xs text-blue-600 mt-1">Les quantités décimales seront autorisées pour ce produit</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("products.barcode")}</label>
                  <div className="flex gap-2">
                    <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#00483c]" placeholder="Code-barres" />
                    <button type="button" onClick={() => setForm({ ...form, barcode: generateBarcode() })} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" title={t("products.generateBarcode")}><Barcode className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("common.description")}</label>
                <textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00483c]" placeholder="Description optionnelle du produit" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("common.status")}</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "inactive" })} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00483c]">
                  <option value="active">{t("common.active")}</option>
                  <option value="inactive">{t("common.inactive")}</option>
                </select>
              </div>

              {/* Variations Section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">{t("products.variations")}</label>
                  <div className="flex gap-2">
                    <button onClick={() => setShowCombinationBuilder(!showCombinationBuilder)} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700">
                      <Zap className="h-3.5 w-3.5" /> {t("products.generateCombinations")}
                    </button>
                    <button onClick={addVariationRow} className="flex items-center gap-1 text-xs font-medium text-[#00483c] hover:text-[#003d33]">
                      <Plus className="h-3.5 w-3.5" /> {t("products.addVariation")}
                    </button>
                  </div>
                </div>

                {/* Combination Builder */}
                {showCombinationBuilder && (
                  <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-3">
                    <p className="text-xs font-medium text-blue-700">{t("products.selectVariationTypes")}</p>
                    {variationTypes.map((vt) => {
                      const vals = variationValues.filter((vv) => vv.variationTypeId === vt.id)
                      const isSelected = !!selectedTypesForCombo[vt.name]
                      return (
                        <div key={vt.id}>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                            <input type="checkbox" checked={isSelected} onChange={() => toggleComboType(vt.name)} className="rounded border-gray-300" />
                            {vt.name}
                          </label>
                          {isSelected && (
                            <div className="ml-6 mt-1 flex flex-wrap gap-1.5">
                              {vals.map((val) => {
                                const checked = (selectedTypesForCombo[vt.name] ?? []).includes(val.value)
                                return (
                                  <label key={val.id} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer ${checked ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200"}`}>
                                    <input type="checkbox" checked={checked} onChange={() => toggleComboValue(vt.name, val.value)} className="sr-only" />
                                    {val.value}
                                  </label>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                    <button onClick={generateCombinations} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                      <Zap className="inline h-3 w-3 mr-1" />{t("products.generateCombinations")}
                    </button>
                  </div>
                )}

                {existingVariations.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {existingVariations.map((v) => (
                      <div key={v.id} className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span><span className="font-medium text-gray-700">{v.variationType}:</span> <span className="text-gray-900">{v.variationValue}</span></span>
                          <button onClick={() => handleDeleteExistingVariation(v.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                        <div className="flex gap-3 mt-1 text-xs text-gray-500">
                          <span>Stock: {v.stock}</span>
                          {v.price != null && <span>Prix: {formatCurrency(v.price)}</span>}
                          {v.cost != null && <span>Coût: {formatCurrency(v.cost)}</span>}
                          {v.barcode && <span className="font-mono">CB: {v.barcode}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {productVariations.map((v, idx) => {
                  const selectedType = variationTypes.find((vt) => vt.name === v.variationType)
                  const typeValues = selectedType ? (valuesByType.get(selectedType.id) ?? []) : []
                  return (
                    <div key={idx} className="space-y-2 mb-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="flex gap-2 items-start">
                        <select value={v.variationType} onChange={(e) => { updateVariationRow(idx, "variationType", e.target.value); updateVariationRow(idx, "variationValue", "") }} className="flex-1 rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00483c]">
                          <option value="">{t("products.variationType")}</option>
                          {variationTypes.map((vt) => <option key={vt.id} value={vt.name}>{vt.name}</option>)}
                        </select>
                        <select value={v.variationValue} onChange={(e) => updateVariationRow(idx, "variationValue", e.target.value)} disabled={!v.variationType} className="flex-1 rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00483c] disabled:opacity-50">
                          <option value="">{t("products.variationValue")}</option>
                          {typeValues.map((tv) => <option key={tv.id} value={tv.value}>{tv.value}</option>)}
                        </select>
                        <button onClick={() => removeVariationRow(idx)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><Minus className="h-4 w-4" /></button>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <input type="number" min="0" step="0.01" value={v.price} onChange={(e) => updateVariationRow(idx, "price", e.target.value)} placeholder={t("products.sellingPrice")} className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#00483c]" />
                        <input type="number" min="0" step="0.01" value={v.cost} onChange={(e) => updateVariationRow(idx, "cost", e.target.value)} placeholder={t("products.cost")} className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#00483c]" />
                        <div className="flex gap-1">
                          <input value={v.barcode} onChange={(e) => updateVariationRow(idx, "barcode", e.target.value)} placeholder={t("products.barcode")} className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#00483c]" />
                          <button type="button" onClick={() => updateVariationRow(idx, "barcode", generateBarcode())} className="rounded border border-gray-200 px-1.5 text-gray-400 hover:text-gray-600"><Barcode className="h-3 w-3" /></button>
                        </div>
                        <input type="number" min="0" value={v.stock} onChange={(e) => updateVariationRow(idx, "stock", e.target.value)} placeholder="Stock" className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-[#00483c]" />
                      </div>
                    </div>
                  )
                })}
                {productVariations.length === 0 && existingVariations.length === 0 && <p className="text-xs text-gray-400">{t("products.noVariations")}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4 flex-shrink-0">
              <button onClick={() => setShowModal(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">{t("common.cancel")}</button>
              <button onClick={handleSave} className="rounded-lg bg-[#00483c] px-4 py-2 text-sm font-medium text-white hover:bg-[#003d33]">{editingProduct ? t("common.save") : t("products.addProduct")}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t("products.archiveProduct")}</h3>
            <p className="text-sm text-gray-500 mb-6">{t("products.archiveConfirm")}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">{t("common.cancel")}</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700">{t("products.archiveProduct")}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Category Management Modal ── */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">{t("products.categoriesTitle")}</h2>
              <button onClick={() => { setShowCategoryModal(false); setCatError("") }} className="p-1 rounded-lg hover:bg-gray-100"><X className="h-5 w-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              {catError && <FormError error={catError} />}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("products.addCategory")}</label>
                <div className="flex gap-2">
                  <input value={newCategoryName} onChange={(e) => { setNewCategoryName(e.target.value); setCatError("") }} placeholder={t("products.categoryName")} className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00483c]" />
                  <button onClick={handleAddCategory} className="rounded-lg bg-[#00483c] px-4 py-2 text-sm font-medium text-white hover:bg-[#003d33]">{t("common.add")}</button>
                </div>
              </div>
              <div className="space-y-3">
                {categories.map((cat) => {
                  const subs = subCategories.filter((s) => s.categoryId === cat.id)
                  return (
                    <div key={cat.id} className="rounded-lg border border-gray-200 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{cat.name}</span>
                        <button onClick={() => handleDeleteCategory(cat.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500" title={t("common.delete")}><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                      {subs.length > 0 && (
                        <div className="mt-2 ml-4 space-y-1">
                          {subs.map((sub) => (
                            <div key={sub.id} className="flex items-center justify-between text-sm text-gray-600">
                              <span>↳ {sub.name}</span>
                              <button onClick={() => handleDeleteSubCategory(sub.id)} className="p-0.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("products.addSubCategory")}</label>
                <div className="flex gap-2">
                  <select value={selectedCategoryForSub} onChange={(e) => setSelectedCategoryForSub(e.target.value)} className="w-1/3 rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00483c]">
                    <option value="">{t("common.category")}</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <input value={newSubCategoryName} onChange={(e) => { setNewSubCategoryName(e.target.value); setCatError("") }} placeholder={t("products.subCategoryName")} className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00483c]" />
                  <button onClick={handleAddSubCategory} className="rounded-lg bg-[#00483c] px-4 py-2 text-sm font-medium text-white hover:bg-[#003d33]">{t("common.add")}</button>
                </div>
              </div>
            </div>
            <div className="flex justify-end border-t border-gray-100 px-6 py-4 flex-shrink-0">
              <button onClick={() => { setShowCategoryModal(false); setCatError("") }} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">{t("common.close")}</button>
            </div>
          </div>
        </div>
      )}
      {/* ── Variation Management Modal ── */}
      {showVariationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">{t("products.variationsTitle")}</h2>
              <button onClick={() => { setShowVariationModal(false); setVarError("") }} className="p-1 rounded-lg hover:bg-gray-100"><X className="h-5 w-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              {varError && <FormError error={varError} />}

              {variationTypes.length === 0 && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                  <p className="text-sm text-blue-700 mb-2">Aucun type de variation défini.</p>
                  <button onClick={handleSeedDefaults} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                    <Plus className="h-3.5 w-3.5" /> {t("products.seedDefaultTypes")}
                  </button>
                </div>
              )}

              {/* Add variation type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("products.addVariationType")}</label>
                <div className="flex gap-2">
                  <input value={newTypeName} onChange={(e) => { setNewTypeName(e.target.value); setVarError("") }} placeholder={t("products.variationTypeName")} className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00483c]" />
                  <button onClick={handleAddVariationType} className="rounded-lg bg-[#00483c] px-4 py-2 text-sm font-medium text-white hover:bg-[#003d33]">{t("common.add")}</button>
                </div>
              </div>

              {/* Types list with values */}
              <div className="space-y-3">
                {variationTypes.map((vt) => {
                  const vals = variationValues.filter((vv) => vv.variationTypeId === vt.id)
                  return (
                    <div key={vt.id} className="rounded-lg border border-gray-200 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{vt.name}</span>
                        <button onClick={() => handleDeleteVariationType(vt.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500" title={t("common.delete")}><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                      {vals.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {vals.map((val) => (
                            <span key={val.id} className="inline-flex items-center gap-1 rounded-full bg-[#e6f0ed] px-2.5 py-1 text-xs font-medium text-[#003d33]">
                              {val.value}
                              <button onClick={() => handleDeleteVariationValue(val.id)} className="hover:text-red-500 ml-0.5">
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      {vals.length === 0 && <p className="text-xs text-gray-400 mt-1">Aucune valeur</p>}
                    </div>
                  )
                })}
              </div>

              {/* Add variation value */}
              {variationTypes.length > 0 && (
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("products.addVariationValue")}</label>
                  <div className="flex gap-2">
                    <select value={selectedTypeForValue} onChange={(e) => setSelectedTypeForValue(e.target.value)} className="w-1/3 rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00483c]">
                      <option value="">{t("products.selectVariationType")}</option>
                      {variationTypes.map((vt) => <option key={vt.id} value={vt.id}>{vt.name}</option>)}
                    </select>
                    <input value={newValueName} onChange={(e) => { setNewValueName(e.target.value); setVarError("") }} placeholder={t("products.variationValue")} className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00483c]" />
                    <button onClick={handleAddVariationValue} className="rounded-lg bg-[#00483c] px-4 py-2 text-sm font-medium text-white hover:bg-[#003d33]">{t("common.add")}</button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end border-t border-gray-100 px-6 py-4 flex-shrink-0">
              <button onClick={() => { setShowVariationModal(false); setVarError("") }} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">{t("common.close")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  </PageGuard>
  )
}
