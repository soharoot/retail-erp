"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useI18n } from "@/lib/i18n/context"
import { useAuth } from "@/lib/supabase/auth-context"
import { useRBAC } from "@/lib/rbac/rbac-context"
import { logAction } from "@/lib/activity/log-action"
import { useTableData, insertChildRows, deleteChildRows } from "@/hooks/use-table-data"
import { useSettings } from "@/hooks/use-settings"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { Sale, SaleItem, Product, InventoryItem, Customer, ProductVariation } from "@/lib/types"
import {
  ArrowLeft, Search, Plus, Minus, Trash2, Printer, X,
  ShoppingCart, CreditCard, Banknote, Clock, Eye, Check,
  Package, AlertTriangle,
} from "lucide-react"

// ── Cart Item Type ──────────────────────────────────────────
interface CartItem {
  productId: string
  productName: string
  variationId: string | null
  variationLabel: string | null
  quantity: number
  unitPrice: number
  costAtSale: number
  lineTotal: number
}

export default function POSPage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const { orgId } = useRBAC()
  const router = useRouter()

  // ── Data hooks (same pattern as /sales) ───────────────────
  const {
    data: sales,
    insert: insertSale,
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
  const { data: customers, insert: insertCustomer, refresh: refreshCustomers } = useTableData<Customer>("customers", {
    orderBy: { column: "name", ascending: true },
  })
  const { data: variations, update: updateVariation, refresh: refreshVariations } = useTableData<ProductVariation>("product_variations")
  const [settings] = useSettings()

  const taxRate = (settings?.taxRate ?? 0) / 100
  const taxRateLabel = `${settings?.taxRate ?? 0}%`

  // ── Derived lookups ───────────────────────────────────────
  const activeProducts = useMemo(() => products.filter((p) => p.status === "active" && !p.deletedAt), [products])
  const inventoryByProduct = useMemo(() => new Map(inventory.map((i) => [i.productId, i])), [inventory])
  const variationsByProduct = useMemo(() => {
    const map = new Map<string, ProductVariation[]>()
    for (const v of variations) {
      const list = map.get(v.productId) ?? []
      list.push(v)
      map.set(v.productId, list)
    }
    return map
  }, [variations])

  // ── POS State ─────────────────────────────────────────────
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash")
  const [discountAmount, setDiscountAmount] = useState(0)
  const [customerName, setCustomerName] = useState("")
  const [discountField, setDiscountField] = useState<"discount" | "total">("discount")

  // Modals
  const [showConfirm, setShowConfirm] = useState(false)
  const [showInvoice, setShowInvoice] = useState<Sale | null>(null)
  const [showRecentSales, setShowRecentSales] = useState(false)
  const [showVariationPicker, setShowVariationPicker] = useState<Product | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const searchRef = useRef<HTMLInputElement>(null)

  // Auto-focus search on mount
  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  // Clear success message after 3s
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMsg])

  // ── Product filtering ─────────────────────────────────────
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return activeProducts
    const q = searchQuery.toLowerCase()
    return activeProducts.filter((p) =>
      p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q)
    )
  }, [activeProducts, searchQuery])

  // ── Cart calculations ─────────────────────────────────────
  const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0)
  const clampedDiscount = Math.max(0, Math.min(discountAmount, subtotal))
  const subtotalAfterDiscount = subtotal - clampedDiscount
  const tax = subtotalAfterDiscount * taxRate
  const grandTotal = subtotalAfterDiscount + tax

  // ── Get stock for a product ───────────────────────────────
  const getProductStock = (product: Product): number => {
    const prodVariations = variationsByProduct.get(product.id)
    if (prodVariations && prodVariations.length > 0) {
      return prodVariations.reduce((sum, v) => sum + v.stock, 0)
    }
    return inventoryByProduct.get(product.id)?.stock ?? 0
  }

  // ── Cart Operations ───────────────────────────────────────
  const addToCart = (product: Product, variation?: ProductVariation) => {
    setError(null)
    const variationId = variation?.id ?? null
    const variationLabel = variation ? `${variation.variationType}: ${variation.variationValue}` : null

    // Check stock
    let available: number
    if (variation) {
      available = variation.stock
    } else {
      const prodVariations = variationsByProduct.get(product.id)
      if (prodVariations && prodVariations.length > 0) {
        // Product has variations — must pick one
        setShowVariationPicker(product)
        return
      }
      available = inventoryByProduct.get(product.id)?.stock ?? 0
    }

    // Check if already in cart
    const existingIdx = cart.findIndex(
      (c) => c.productId === product.id && c.variationId === variationId
    )
    const currentQtyInCart = existingIdx >= 0 ? cart[existingIdx].quantity : 0

    if (available <= currentQtyInCart) {
      setError(`${t("pos.stockError")}: "${product.name}" (${available})`)
      return
    }

    if (existingIdx >= 0) {
      const updated = [...cart]
      updated[existingIdx].quantity += 1
      updated[existingIdx].lineTotal = updated[existingIdx].quantity * updated[existingIdx].unitPrice
      setCart(updated)
    } else {
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        variationId,
        variationLabel,
        quantity: 1,
        unitPrice: product.price,
        costAtSale: product.cost ?? 0,
        lineTotal: product.price,
      }])
    }
    setShowVariationPicker(null)
  }

  const updateQuantity = (index: number, delta: number) => {
    const updated = [...cart]
    const newQty = updated[index].quantity + delta
    if (newQty <= 0) {
      updated.splice(index, 1)
    } else {
      // Stock check for increase
      if (delta > 0) {
        const item = updated[index]
        let available: number
        if (item.variationId) {
          available = variations.find((v) => v.id === item.variationId)?.stock ?? 0
        } else {
          available = inventoryByProduct.get(item.productId)?.stock ?? 0
        }
        if (available < newQty) {
          setError(`${t("pos.stockError")}: "${item.productName}" (${available})`)
          return
        }
      }
      updated[index].quantity = newQty
      updated[index].lineTotal = newQty * updated[index].unitPrice
    }
    setCart(updated)
  }

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index))
  }

  const clearCart = () => {
    setCart([])
    setDiscountAmount(0)
    setCustomerName("")
    setError(null)
  }

  // ── Discount handlers ─────────────────────────────────────
  const handleDiscountChange = (value: string) => {
    const num = parseFloat(value) || 0
    setDiscountAmount(Math.max(0, Math.min(num, subtotal)))
    setDiscountField("discount")
  }

  const handleTotalWithDiscountChange = (value: string) => {
    const desired = parseFloat(value) || 0
    const clamped = Math.max(0, Math.min(desired, subtotal))
    setDiscountAmount(Math.max(0, subtotal - clamped))
    setDiscountField("total")
  }

  // ── Generate sale number ──────────────────────────────────
  const generateSaleNumber = () => {
    const prefix = settings?.invoicePrefix ?? "VENTE"
    const maxNum = sales.reduce((max, s) => {
      const match = (s.saleNumber ?? "").match(/(\d+)$/)
      return match ? Math.max(max, parseInt(match[1])) : max
    }, 0)
    return `${prefix}-${String(maxNum + 1).padStart(4, "0")}`
  }

  // ── Complete Sale ─────────────────────────────────────────
  const handleCompleteSale = async () => {
    setProcessing(true)
    setError(null)

    try {
      // Stock validation
      for (const item of cart) {
        if (item.variationId) {
          const variation = variations.find((v) => v.id === item.variationId)
          if (variation && variation.stock < item.quantity) {
            setError(`${t("pos.stockError")}: "${item.productName}" (${variation.stock})`)
            setProcessing(false)
            return
          }
        } else {
          const inv = inventoryByProduct.get(item.productId)
          if (inv && inv.stock < item.quantity) {
            setError(`${t("pos.stockError")}: "${item.productName}" (${inv.stock})`)
            setProcessing(false)
            return
          }
        }
      }

      const saleNumber = generateSaleNumber()
      const resolvedCustomerName = customerName.trim() || t("pos.walkInCustomer")

      // Auto-create customer if named
      let customerId: string | null = null
      if (customerName.trim()) {
        const activeCustomers = customers.filter((c) => c.status === "active" && !c.deletedAt)
        const existing = activeCustomers.find((c) => c.name.toLowerCase() === customerName.trim().toLowerCase())
        if (existing) {
          customerId = existing.id
        } else {
          const newCustomer = await insertCustomer({
            name: customerName.trim(),
            email: "",
            phone: "",
            company: "",
            address: "",
            segment: "New",
            status: "active",
          } as Partial<Customer>)
          if (newCustomer) {
            customerId = newCustomer.id
            await refreshCustomers()
          }
        }
      }

      // Insert sale
      const created = await insertSale({
        saleNumber,
        date: new Date().toISOString().slice(0, 10),
        customerId,
        customerName: resolvedCustomerName,
        subtotal,
        discount: clampedDiscount,
        tax,
        total: grandTotal,
        paymentMethod,
        status: "completed",
        createdBy: user?.id,
      } as Partial<Sale>)

      if (!created) {
        setError("Échec de la création de la vente")
        setProcessing(false)
        return
      }

      // Insert sale items
      const { error: itemsError } = await insertChildRows("sale_items", cart.map((item) => ({
        saleId: created.id,
        productId: item.productId || null,
        productName: item.productName,
        variationId: item.variationId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        costAtSale: item.costAtSale,
        lineTotal: item.lineTotal,
      })))

      if (itemsError) {
        await removeSale(created.id, false)
        setError("Échec de l'insertion des articles")
        setProcessing(false)
        return
      }

      // Deduct stock
      for (const item of cart) {
        if (item.variationId) {
          const variation = variations.find((v) => v.id === item.variationId)
          if (variation) {
            await updateVariation(variation.id, { stock: Math.max(0, variation.stock - item.quantity) } as Partial<ProductVariation>)
          }
        } else {
          const inv = inventoryByProduct.get(item.productId)
          if (inv) {
            await updateInventory(inv.id, { stock: Math.max(0, inv.stock - item.quantity) } as Partial<InventoryItem>)
          }
        }
      }

      // Log activity
      if (user?.id && orgId) {
        logAction({
          action: "sale.created",
          module: "sales",
          description: `POS: Vente ${saleNumber} — "${resolvedCustomerName}" — ${cart.length} article(s), total ${formatCurrency(grandTotal)}`,
          userId: user.id,
          orgId,
          userName: user.email ?? undefined,
          metadata: { sale_id: created.id, sale_number: saleNumber, total: grandTotal, payment: paymentMethod, item_count: cart.length, source: "pos" },
        })
      }

      await refreshSales()
      await refreshInventory()
      await refreshVariations()

      // Show invoice
      const completedSale: Sale = {
        ...created,
        discount: clampedDiscount,
        items: cart.map((item) => ({
          id: "",
          saleId: created.id,
          productId: item.productId,
          productName: item.productName,
          variationId: item.variationId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          costAtSale: item.costAtSale,
          lineTotal: item.lineTotal,
        })) as SaleItem[],
      }
      setShowInvoice(completedSale)
      setShowConfirm(false)

      // Clear cart for next sale
      setCart([])
      setDiscountAmount(0)
      setCustomerName("")
      setSuccessMsg(t("pos.saleCompleted"))
    } catch (err) {
      setError("Erreur inattendue")
    } finally {
      setProcessing(false)
    }
  }

  // ── Delete sale (from recent sales) ───────────────────────
  const handleDeleteSale = async (saleId: string) => {
    const sale = sales.find((s) => s.id === saleId)
    if (!sale) return

    // Restore stock
    for (const item of sale.items ?? []) {
      if (item.variationId) {
        const variation = variations.find((v) => v.id === item.variationId)
        if (variation) {
          await updateVariation(variation.id, { stock: variation.stock + item.quantity } as Partial<ProductVariation>)
        }
      } else {
        const inv = inventoryByProduct.get(item.productId ?? "")
        if (inv) {
          await updateInventory(inv.id, { stock: inv.stock + item.quantity } as Partial<InventoryItem>)
        }
      }
    }

    await deleteChildRows("sale_items", "saleId", saleId)
    await removeSale(saleId, false)

    if (user?.id && orgId) {
      logAction({
        action: "sale.deleted",
        module: "sales",
        description: `POS: Vente ${sale.saleNumber} supprimée (total: ${formatCurrency(sale.total ?? 0)})`,
        userId: user.id,
        orgId,
        userName: user.email ?? undefined,
        metadata: { sale_id: saleId },
      })
    }

    setDeleteConfirm(null)
    await refreshSales()
    await refreshInventory()
    await refreshVariations()
  }

  // ── Recent sales (last 20) ────────────────────────────────
  const recentSales = sales.filter((s) => s.status !== "cancelled").slice(0, 20)

  // ── Time display ──────────────────────────────────────────
  const [currentTime, setCurrentTime] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════
  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* ── Top Bar ────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-3 bg-[#00483c] text-white shadow-lg">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm font-medium">{t("pos.backToDashboard")}</span>
        </button>

        <h1 className="text-lg font-bold tracking-wide">{t("pos.title")}</h1>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowRecentSales(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Clock className="h-4 w-4" />
            <span className="text-sm">{t("pos.recentSales")}</span>
          </button>
          <span className="text-sm text-white/60">
            {currentTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </header>

      {/* ── Success banner ─────────────────────────────────── */}
      {successMsg && (
        <div className="bg-green-500 text-white text-center py-2 text-sm font-medium">
          <Check className="h-4 w-4 inline mr-2" />{successMsg}
        </div>
      )}

      {/* ── Error banner ───────────────────────────────────── */}
      {error && (
        <div className="bg-red-500 text-white text-center py-2 text-sm font-medium flex items-center justify-center gap-2">
          <AlertTriangle className="h-4 w-4" />{error}
          <button onClick={() => setError(null)} className="ml-2 hover:bg-white/20 rounded p-0.5"><X className="h-3 w-3" /></button>
        </div>
      )}

      {/* ── Main split layout ──────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── LEFT: Product Grid ────────────────────────────── */}
        <div className="w-[60%] flex flex-col border-r border-gray-200">
          {/* Search */}
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                placeholder={t("pos.searchProducts")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00483c] focus:border-transparent"
              />
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Package className="h-12 w-12 mb-3" />
                <p className="text-sm">{t("pos.noProducts")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredProducts.map((product) => {
                  const stock = getProductStock(product)
                  const isOutOfStock = stock <= 0
                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      disabled={isOutOfStock}
                      className={`relative flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                        isOutOfStock
                          ? "bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed"
                          : "bg-white border-gray-200 hover:border-[#00483c] hover:shadow-md active:scale-[0.98]"
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">{product.name}</p>
                      <p className="text-lg font-bold text-[#00483c]">{formatCurrency(product.price)}</p>
                      <span className={`mt-2 text-xs font-medium px-2 py-0.5 rounded-full ${
                        isOutOfStock
                          ? "bg-red-100 text-red-600"
                          : stock <= 5
                            ? "bg-orange-100 text-orange-600"
                            : "bg-green-100 text-green-600"
                      }`}>
                        {isOutOfStock ? t("pos.outOfStock") : `Stock: ${stock}`}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Cart & Payment ─────────────────────────── */}
        <div className="w-[40%] flex flex-col bg-white">
          {/* Cart header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-[#00483c]" />
              <h2 className="text-sm font-bold text-gray-900">{t("pos.cart")}</h2>
              {cart.length > 0 && (
                <span className="bg-[#00483c] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-700 font-medium">
                {t("pos.clearCart")}
              </button>
            )}
          </div>

          {/* Customer name (optional) */}
          <div className="px-4 py-2 border-b border-gray-100">
            <input
              type="text"
              placeholder={t("pos.customerName")}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00483c] focus:border-transparent"
            />
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto px-4 py-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <ShoppingCart className="h-10 w-10 mb-2" />
                <p className="text-sm font-medium">{t("pos.emptyCart")}</p>
                <p className="text-xs mt-1">{t("pos.addProducts")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item, idx) => (
                  <div key={`${item.productId}-${item.variationId}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                      {item.variationLabel && (
                        <p className="text-xs text-gray-500">{item.variationLabel}</p>
                      )}
                      <p className="text-xs text-gray-400">{formatCurrency(item.unitPrice)} / unité</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(idx, -1)}
                        className="h-7 w-7 flex items-center justify-center rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(idx, 1)}
                        className="h-7 w-7 flex items-center justify-center rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-sm font-bold text-gray-900 w-24 text-right">{formatCurrency(item.lineTotal)}</p>
                    <button
                      onClick={() => removeFromCart(idx)}
                      className="p-1 text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Pricing & Payment ─────────────────────────── */}
          {cart.length > 0 && (
            <div className="border-t border-gray-200 p-4 space-y-3">
              {/* Subtotal */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t("pos.subtotal")}</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>

              {/* Discount fields — bidirectional */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">{t("pos.discountAmount")}</label>
                  <input
                    type="number"
                    min="0"
                    max={subtotal}
                    value={discountField === "discount" ? (discountAmount || "") : clampedDiscount || ""}
                    onChange={(e) => handleDiscountChange(e.target.value)}
                    onFocus={() => setDiscountField("discount")}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00483c]"
                    placeholder="0"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">{t("pos.totalWithDiscount")}</label>
                  <input
                    type="number"
                    min="0"
                    max={subtotal}
                    value={discountField === "total" ? (subtotalAfterDiscount || "") : subtotalAfterDiscount || ""}
                    onChange={(e) => handleTotalWithDiscountChange(e.target.value)}
                    onFocus={() => setDiscountField("total")}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00483c]"
                    placeholder="0"
                  />
                </div>
              </div>

              {clampedDiscount > 0 && (
                <div className="flex justify-between text-sm text-orange-600">
                  <span>{t("pos.discount")}</span>
                  <span>-{formatCurrency(clampedDiscount)}</span>
                </div>
              )}

              {/* Tax */}
              {taxRate > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t("pos.tax")} ({taxRateLabel})</span>
                  <span className="font-medium">{formatCurrency(tax)}</span>
                </div>
              )}

              {/* Grand total */}
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-base font-bold text-gray-900">{t("pos.grandTotal")}</span>
                <span className="text-2xl font-bold text-[#00483c]">{formatCurrency(grandTotal)}</span>
              </div>

              {/* Payment method */}
              <div className="flex gap-2">
                <button
                  onClick={() => setPaymentMethod("cash")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    paymentMethod === "cash"
                      ? "bg-[#00483c] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <Banknote className="h-4 w-4" />
                  {t("pos.cash")}
                </button>
                <button
                  onClick={() => setPaymentMethod("card")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    paymentMethod === "card"
                      ? "bg-[#00483c] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  {t("pos.card")}
                </button>
              </div>

              {/* Complete sale button */}
              <button
                onClick={() => setShowConfirm(true)}
                disabled={processing}
                className="w-full py-4 bg-gradient-to-r from-[#00483c] to-[#1f6052] text-white text-base font-bold rounded-xl hover:from-[#003d33] hover:to-[#00483c] active:scale-[0.99] transition-all disabled:opacity-50"
              >
                {processing ? "..." : t("pos.completeSale")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* MODALS                                                */}
      {/* ══════════════════════════════════════════════════════ */}

      {/* ── Variation Picker Modal ────────────────────────── */}
      {showVariationPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowVariationPicker(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">{t("pos.selectVariation")}</h3>
              <button onClick={() => setShowVariationPicker(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-3">{showVariationPicker.name}</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {(variationsByProduct.get(showVariationPicker.id) ?? []).map((v) => (
                <button
                  key={v.id}
                  onClick={() => addToCart(showVariationPicker, v)}
                  disabled={v.stock <= 0}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                    v.stock <= 0
                      ? "bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed"
                      : "bg-white border-gray-200 hover:border-[#00483c] hover:bg-[#e6f0ed]"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{v.variationType}: {v.variationValue}</p>
                    <p className="text-xs text-gray-500">Stock: {v.stock}</p>
                  </div>
                  <Plus className="h-4 w-4 text-[#00483c]" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmation Modal ────────────────────────────── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{t("pos.confirmSale")}</h3>
            <p className="text-sm text-gray-600 mb-6">
              {t("pos.confirmSaleMessage")} <span className="font-bold text-[#00483c]">{formatCurrency(grandTotal)}</span> ?
            </p>
            <div className="text-sm text-gray-500 space-y-1 mb-6">
              <p>{cart.length} {t("pos.items")} — {t("pos.subtotal")}: {formatCurrency(subtotal)}</p>
              {clampedDiscount > 0 && <p>{t("pos.discount")}: -{formatCurrency(clampedDiscount)}</p>}
              {taxRate > 0 && <p>{t("pos.tax")}: {formatCurrency(tax)}</p>}
              <p>{t("pos.paymentMethod")}: {paymentMethod === "cash" ? t("pos.cash") : t("pos.card")}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleCompleteSale}
                disabled={processing}
                className="flex-1 py-3 bg-gradient-to-r from-[#00483c] to-[#1f6052] text-white rounded-xl text-sm font-bold hover:from-[#003d33] hover:to-[#00483c] disabled:opacity-50"
              >
                {processing ? "..." : t("common.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Invoice Modal ─────────────────────────────────── */}
      {showInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div id="pos-invoice" className="p-6">
              {/* Company header */}
              <div className="text-center mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">{settings?.companyName || "Ledger ERP"}</h2>
                {settings?.address && <p className="text-xs text-gray-500 mt-1">{settings.address}</p>}
                <div className="flex items-center justify-center gap-4 mt-1 text-xs text-gray-500">
                  {settings?.phone && <span>{settings.phone}</span>}
                  {settings?.email && <span>{settings.email}</span>}
                </div>
              </div>

              {/* Invoice info */}
              <div className="flex justify-between mb-4 text-sm">
                <div>
                  <p className="font-bold text-gray-900">{t("pos.invoice")} N°: {showInvoice.saleNumber}</p>
                  <p className="text-gray-500">{formatDate(showInvoice.date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500">{t("sales.customer")}:</p>
                  <p className="font-medium text-gray-900">{showInvoice.customerName}</p>
                </div>
              </div>

              {/* Items table */}
              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-2 font-medium text-gray-600">{t("pos.unitPrice")}</th>
                    <th className="text-center py-2 font-medium text-gray-600">{t("pos.quantity")}</th>
                    <th className="text-right py-2 font-medium text-gray-600">{t("pos.unitPrice")}</th>
                    <th className="text-right py-2 font-medium text-gray-600">{t("pos.lineTotal")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(showInvoice.items ?? []).map((item, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2 text-gray-900">{item.productName}</td>
                      <td className="py-2 text-center text-gray-600">{item.quantity}</td>
                      <td className="py-2 text-right text-gray-600">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-2 text-right font-medium text-gray-900">{formatCurrency(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="space-y-1 text-sm border-t border-gray-200 pt-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t("pos.subtotal")}</span>
                  <span>{formatCurrency(showInvoice.subtotal)}</span>
                </div>
                {(showInvoice.discount ?? 0) > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>{t("pos.discount")}</span>
                    <span>-{formatCurrency(showInvoice.discount)}</span>
                  </div>
                )}
                {(showInvoice.tax ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t("pos.tax")}</span>
                    <span>{formatCurrency(showInvoice.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-300 text-base font-bold">
                  <span>{t("pos.grandTotal")}</span>
                  <span className="text-[#00483c]">{formatCurrency(showInvoice.total)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>{t("pos.paymentMethod")}</span>
                  <span>{showInvoice.paymentMethod === "cash" ? t("pos.cash") : t("pos.card")}</span>
                </div>
              </div>
            </div>

            {/* Actions (not printed) */}
            <div className="flex gap-3 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowInvoice(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t("pos.close")}
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#00483c] text-white rounded-xl text-sm font-medium hover:bg-[#003d33]"
              >
                <Printer className="h-4 w-4" />
                {t("pos.printInvoice")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Recent Sales Modal ────────────────────────────── */}
      {showRecentSales && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowRecentSales(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-base font-bold text-gray-900">{t("pos.recentSales")}</h3>
              <button onClick={() => setShowRecentSales(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {recentSales.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Clock className="h-10 w-10 mb-2" />
                  <p className="text-sm">{t("common.noData")}</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentSales.map((sale) => (
                    <div key={sale.id} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">{sale.saleNumber}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            sale.status === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                          }`}>
                            {sale.status === "completed" ? "Complété" : sale.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {sale.customerName} — {formatDate(sale.date)}
                          {sale.paymentMethod === "cash" ? " — Espèces" : " — Carte"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <span className="text-sm font-bold text-[#00483c]">{formatCurrency(sale.total)}</span>
                        <button
                          onClick={() => { setShowRecentSales(false); setShowInvoice(sale) }}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-[#00483c]"
                          title={t("common.view")}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { setShowRecentSales(false); setShowInvoice(sale); setTimeout(() => window.print(), 300) }}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-[#00483c]"
                          title={t("pos.printInvoice")}
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(sale.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600"
                          title={t("common.delete")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ────────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-6">
            <h3 className="text-base font-bold text-gray-900 mb-2">{t("common.confirm")}</h3>
            <p className="text-sm text-gray-600 mb-6">{t("pos.deleteConfirm")}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => handleDeleteSale(deleteConfirm)}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700"
              >
                {t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
