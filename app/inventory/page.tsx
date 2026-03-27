"use client"

import { PageGuard } from "@/components/shared/permission-guard"
import { PERMISSIONS } from "@/lib/rbac/permissions"

import { useState, useMemo } from "react"
import { useI18n } from "@/lib/i18n/context"
import { useAuth } from "@/lib/supabase/auth-context"
import { useRBAC } from "@/lib/rbac/rbac-context"
import { logAction } from "@/lib/activity/log-action"
import { useTableData } from "@/hooks/use-table-data"
import { PageHeader } from "@/components/layout/page-header"
import { FormError } from "@/components/shared/form-error"
import { validateStockAdjustment } from "@/lib/validation"
import { formatCurrency, formatStock } from "@/lib/utils"
import type { InventoryItem, Product, Category, SubCategory, ProductVariation } from "@/lib/types"
import { Warehouse, AlertTriangle, X, TrendingUp, TrendingDown } from "lucide-react"

interface InventoryRow {
  id: string
  productId: string
  productName: string
  categoryName: string
  subCategoryName: string
  variationLabel: string       // e.g. "Taille: S" or ""
  variationId: string | null
  stock: number
  minStock: number
  sellingPrice: number
  isVariation: boolean         // true = product_variations row, false = inventory row
  unit: "piece" | "kg" | "metre"
  barcode: string
}

function stockStatus(stock: number, minStock: number) {
  if (stock === 0) return { label: "Rupture de stock", color: "bg-red-100 text-red-700" }
  if (stock <= minStock) return { label: "Stock bas", color: "bg-yellow-100 text-yellow-700" }
  return { label: "En stock", color: "bg-green-100 text-green-700" }
}

export default function InventoryPage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const { orgId } = useRBAC()

  const {
    data: inventory,
    loading: inventoryLoading,
    update: updateInventory,
    refresh: refreshInventory,
  } = useTableData<InventoryItem>("inventory")

  const { data: products, loading: productsLoading } = useTableData<Product>("products")
  const { data: categories, loading: categoriesLoading } = useTableData<Category>("categories")
  const { data: subCategories, loading: subCategoriesLoading } = useTableData<SubCategory>("sub_categories")
  const { data: variations, loading: variationsLoading, update: updateVariation, refresh: refreshVariations } = useTableData<ProductVariation>("product_variations")

  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [adjustItem, setAdjustItem] = useState<InventoryRow | null>(null)
  const [adjustAmount, setAdjustAmount] = useState("")
  const [adjustReason, setAdjustReason] = useState("")
  const [adjustError, setAdjustError] = useState("")

  // ── Build lookup maps ──────────────────────────────────
  const productMap = new Map(products.map((p) => [p.id, p]))
  const categoryMap = new Map(categories.map((c) => [c.id, c]))
  const subCategoryMap = new Map(subCategories.map((sc) => [sc.id, sc]))

  // Build variations by product
  const variationsByProduct = new Map<string, ProductVariation[]>()
  for (const v of variations) {
    const list = variationsByProduct.get(v.productId) ?? []
    list.push(v)
    variationsByProduct.set(v.productId, list)
  }

  // ── Merge data: inventory + product_variations ──────────
  const rows = useMemo<InventoryRow[]>(() => {
    const result: InventoryRow[] = []
    const processedProductIds = new Set<string>()

    // Active products only
    const activeProducts = products.filter((p) => p.status === "active" && !p.deletedAt)

    for (const product of activeProducts) {
      processedProductIds.add(product.id)
      const cat = product.categoryId ? categoryMap.get(product.categoryId) : null
      const subCat = product.subCategoryId ? subCategoryMap.get(product.subCategoryId) : null
      const prodVariations = variationsByProduct.get(product.id)

      if (prodVariations && prodVariations.length > 0) {
        // Product with variations → one row per variation
        for (const v of prodVariations) {
          result.push({
            id: v.id,
            productId: product.id,
            productName: product.name,
            categoryName: cat?.name ?? product.category ?? "",
            subCategoryName: subCat?.name ?? "",
            variationLabel: `${v.variationType}: ${v.variationValue}`,
            variationId: v.id,
            stock: v.stock,
            minStock: 5,
            sellingPrice: v.price ?? product.price,
            isVariation: true,
            unit: product.unit ?? "piece",
            barcode: v.barcode ?? product.barcode ?? "",
          })
        }
      } else {
        // Product without variations → one row from inventory
        const inv = inventory.find((i) => i.productId === product.id)
        result.push({
          id: inv?.id ?? product.id,
          productId: product.id,
          productName: product.name,
          categoryName: cat?.name ?? product.category ?? "",
          subCategoryName: subCat?.name ?? "",
          variationLabel: "",
          variationId: null,
          stock: inv?.stock ?? 0,
          minStock: inv?.minStock ?? 10,
          sellingPrice: product.price,
          isVariation: false,
          unit: product.unit ?? "piece",
          barcode: product.barcode ?? "",
        })
      }
    }

    return result
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, inventory, variations, categories, subCategories])

  // ── Filtering ────────────────────────────────────────────
  const filtered = rows.filter((item) => {
    const matchesSearch =
      item.productName.toLowerCase().includes(search.toLowerCase()) ||
      item.categoryName.toLowerCase().includes(search.toLowerCase()) ||
      item.variationLabel.toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false
    if (!filterStatus || filterStatus === t("common.all")) return true
    const { label } = stockStatus(item.stock, item.minStock)
    return label === filterStatus
    })

  // ── KPIs ────────────────────────────────────────────────
  const totalItems = rows.length
  const totalUnits = rows.reduce((s, i) => s + i.stock, 0)
  const lowStockCount = rows.filter((i) => i.stock > 0 && i.stock <= i.minStock).length
  const outOfStockCount = rows.filter((i) => i.stock === 0).length
  const inventoryValue = rows.reduce((sum, item) => sum + item.stock * item.sellingPrice, 0)

  const loading = inventoryLoading || productsLoading || categoriesLoading || subCategoriesLoading || variationsLoading

  // ── adjust stock ────────────────────────────────────────────
  const handleAdjust = async () => {
    if (!adjustItem) return
    const delta = parseFloat(adjustAmount) || 0

    const validation = validateStockAdjustment(delta, adjustItem.stock)
    if (!validation.valid) {
      setAdjustError(validation.errors.adjustment ?? "Ajustement invalide")
      return
    }

    const newStock = adjustItem.stock + delta

    if (adjustItem.isVariation && adjustItem.variationId) {
      // Update product_variations.stock
      await updateVariation(adjustItem.variationId, { stock: newStock } as Partial<ProductVariation>)
    } else {
      // Update inventory.stock
      const inv = inventory.find((i) => i.productId === adjustItem.productId)
      if (inv) {
        await updateInventory(inv.id, { stock: newStock } as Partial<InventoryItem>)
      }
    }

    if (user?.id && orgId) {
      logAction({
        action: "inventory.adjusted",
        module: "inventory",
        description: `Stock de "${adjustItem.productName}"${adjustItem.variationLabel ? ` (${adjustItem.variationLabel})` : ""} ajusté: ${adjustItem.stock} → ${newStock} (${delta > 0 ? "+" : ""}${delta})${adjustReason ? ` — ${adjustReason}` : ""}`,
        userId: user.id,
        orgId,
        userName: user.email ?? undefined,
        metadata: { product: adjustItem.productName, variation: adjustItem.variationLabel, product_id: adjustItem.productId, old_stock: adjustItem.stock, new_stock: newStock, delta, reason: adjustReason },
      })
    }

    refreshInventory()
    refreshVariations()
    setAdjustItem(null)
    setAdjustAmount("")
    setAdjustReason("")
    setAdjustError("")
  }

  return (
    <PageGuard permission={PERMISSIONS.INVENTORY_VIEW}>
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t("inventory.title")}
        subtitle={t("inventory.subtitle")}
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: t("inventory.totalItems"), value: totalItems, icon: Warehouse, color: "text-[#00483c] bg-[#e6f0ed]" },
          { label: t("inventory.totalUnits"), value: totalUnits.toLocaleString("fr-FR"), icon: Warehouse, color: "text-blue-600 bg-blue-50" },
          { label: t("inventory.lowStockAlerts"), value: lowStockCount + outOfStockCount, icon: AlertTriangle, color: "text-yellow-600 bg-yellow-50" },
          { label: t("inventory.inventoryValue"), value: formatCurrency(inventoryValue), icon: Warehouse, color: "text-green-600 bg-green-50" },
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
              className="w-full rounded-lg border border-gray-200 px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-[#00483c]"
            />
            <Warehouse className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00483c]"
          >
            <option value={t("common.all")}>{t("common.all")}</option>
            <option value="En stock">{t("inventory.inStock")}</option>
            <option value="Stock bas">{t("inventory.lowStockStatus")}</option>
            <option value="Rupture de stock">{t("inventory.outOfStock")}</option>
          </select>
        </div>
      </div>

      {/* Inventory table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <p className="text-gray-400">{t("common.loading")}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Warehouse className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">{t("common.noData")}</p>
            <p className="text-sm text-gray-400 mt-1">
              {rows.length === 0
                ? t("inventory.addProductsFirst")
                : t("inventory.adjustSearchFilter")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">{t("inventory.product")}</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">{t("common.category")}</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">{t("common.subCategory")}</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">{t("common.variation")}</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">{t("inventory.barcode")}</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">{t("inventory.unit")}</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">{t("inventory.stock")}</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">{t("inventory.sellingPrice")}</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">{t("common.status")}</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((item) => {
                  const { label, color } = stockStatus(item.stock, item.minStock)
                  const pct = item.minStock > 0
                    ? Math.min(100, Math.round((item.stock / (item.minStock * 3)) * 100))
                    : 100
                  const barColor =
                    label === "Rupture de stock" ? "bg-red-500" :
                    label === "Stock bas" ? "bg-yellow-500" : "bg-green-500"
                  return (
                    <tr key={`${item.id}-${item.variationId ?? "inv"}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{item.productName}</p>
                      </td>
                      <td className="px-4 py-3">
                        {item.categoryName && (
                          <span className="rounded-full bg-[#e6f0ed] px-2.5 py-1 text-xs font-medium text-[#003d33]">
                            {item.categoryName}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {item.subCategoryName && (
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            {item.subCategoryName}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {item.variationLabel ? (
                          <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
                            {item.variationLabel}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.barcode ? <span className="font-mono text-xs text-gray-500" title={item.barcode}>{item.barcode.slice(0, 10)}</span> : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                          {item.unit === "kg" ? "kg" : item.unit === "metre" ? "m" : "pc"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-semibold text-gray-900">{formatStock(item.stock, item.unit)}</span>
                          <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatCurrency(item.sellingPrice)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${color}`}>{label}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => { setAdjustItem(item); setAdjustError("") }}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-[#e6f0ed] hover:text-[#00483c] hover:border-[#99c1b6] transition-colors"
                        >
                          {t("inventory.adjustStock")}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Adjust Stock Modal ── */}
      {adjustItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">{t("inventory.adjustStock")}</h2>
              <button
                onClick={() => { setAdjustItem(null); setAdjustAmount(""); setAdjustReason(""); setAdjustError("") }}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="font-medium text-gray-900">{adjustItem.productName}</p>
                {adjustItem.variationLabel && (
                  <p className="text-sm text-[#00483c] mt-0.5">{adjustItem.variationLabel}</p>
                )}
                <p className="text-sm text-gray-500 mt-0.5">{t("inventory.currentStock")} : <strong>{formatStock(adjustItem.stock, adjustItem.unit)}</strong></p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t("inventory.adjustmentAmount")}
                </label>
                <p className="text-xs text-gray-400 mb-2">{t("inventory.adjustHint")}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { const step = adjustItem.unit !== "piece" ? 0.5 : 1; setAdjustAmount(String((parseFloat(adjustAmount) || 0) - step)) }}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-gray-600 hover:bg-gray-50"
                  >
                    <TrendingDown className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    step={adjustItem.unit !== "piece" ? "0.001" : "1"}
                    value={adjustAmount}
                    onChange={(e) => { setAdjustAmount(e.target.value); setAdjustError("") }}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-[#00483c]"
                    placeholder="0"
                  />
                  <button
                    onClick={() => { const step = adjustItem.unit !== "piece" ? 0.5 : 1; setAdjustAmount(String((parseFloat(adjustAmount) || 0) + step)) }}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-gray-600 hover:bg-gray-50"
                  >
                    <TrendingUp className="h-4 w-4" />
                  </button>
                </div>
                {adjustAmount && !adjustError && (
                  <p className="text-xs text-[#00483c] mt-1.5">
                    {t("inventory.newStock")} : {formatStock(Math.max(0, adjustItem.stock + (parseFloat(adjustAmount) || 0)), adjustItem.unit)}
                  </p>
                )}
                <FormError error={adjustError} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("inventory.adjustmentReason")}</label>
                <input
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00483c]"
                  placeholder="ex: Correction après inventaire physique"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => { setAdjustItem(null); setAdjustAmount(""); setAdjustReason(""); setAdjustError("") }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleAdjust}
                disabled={!adjustAmount || adjustAmount === "0"}
                className="rounded-lg bg-[#00483c] px-4 py-2 text-sm font-medium text-white hover:bg-[#003d33] disabled:opacity-50"
              >
                {t("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </PageGuard>
  )
}
