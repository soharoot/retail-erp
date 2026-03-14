"use client"

import { useState } from "react"
import { useI18n } from "@/lib/i18n/context"
import { useSupabaseData } from "@/hooks/use-supabase-data"
import { PageHeader } from "@/components/layout/page-header"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { Sale, PurchaseOrder, Settings } from "@/lib/types"
import { defaultSettings } from "@/lib/types"
import { FileText, Printer, X, ShoppingCart, ShoppingBag, TrendingUp } from "lucide-react"

type InvoiceType = "sale" | "purchase"
type FilterType = "all" | "sale" | "purchase"

interface UnifiedInvoice {
  id: string
  type: InvoiceType
  date: string
  party: string
  items: { name: string; qty: number; price: number }[]
  subtotal: number
  tax: number
  total: number
  status: string
  payment?: string
}

export default function InvoicingPage() {
  const [sales] = useSupabaseData<Sale[]>("erp-sales", [])
  const [purchases] = useSupabaseData<PurchaseOrder[]>("erp-purchases", [])
  const [settings] = useSupabaseData<Settings>("erp-settings", defaultSettings)

  const { t } = useI18n()
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<FilterType>("all")
  const [printInvoice, setPrintInvoice] = useState<UnifiedInvoice | null>(null)

  const taxRate = parseFloat(settings?.taxRate ?? "10") / 100
  const taxRateLabel = `${parseFloat(settings?.taxRate ?? "10")}%`
  const companyName = settings?.companyName || "Retail ERP Store"

  const safeSales = (Array.isArray(sales) ? sales : []).filter(Boolean) as Sale[]
  const safePurchases = (Array.isArray(purchases) ? purchases : []).filter(Boolean) as PurchaseOrder[]

  // Build sale invoices
  const saleInvoices: UnifiedInvoice[] = safeSales.map((s) => {
    const items = (s.items ?? []).map((i) => ({
      name: i.name ?? "",
      qty: i.qty ?? 0,
      price: i.price ?? 0,
    }))
    const subtotal = items.reduce((sum, i) => sum + i.qty * i.price, 0)
    return {
      id: s.id,
      type: "sale",
      date: s.date,
      party: s.customer ?? "",
      items,
      subtotal,
      tax: subtotal * taxRate,
      total: s.total ?? 0,
      status: s.status,
      payment: s.payment,
    }
  })

  // Build purchase invoices
  const purchaseInvoices: UnifiedInvoice[] = safePurchases.map((p) => {
    const items = (p.items ?? []).map((i) => ({
      name: i.name ?? "",
      qty: i.qty ?? 0,
      price: i.cost ?? 0,
    }))
    const subtotal = items.reduce((sum, i) => sum + i.qty * i.price, 0)
    return {
      id: p.id,
      type: "purchase",
      date: p.date,
      party: p.supplier ?? "",
      items,
      subtotal,
      tax: 0,
      total: p.total ?? 0,
      status: p.status,
    }
  })

  // Merge and sort by date desc
  const allInvoices: UnifiedInvoice[] = [...saleInvoices, ...purchaseInvoices].sort(
    (a, b) => b.date.localeCompare(a.date)
  )

  const filtered = allInvoices.filter((inv) => {
    const matchFilter = filter === "all" || inv.type === filter
    const q = search.toLowerCase()
    const matchSearch =
      inv.id.toLowerCase().includes(q) || inv.party.toLowerCase().includes(q)
    return matchFilter && matchSearch
  })

  const totalValue = allInvoices.reduce((s, i) => s + i.total, 0)

  const statusColor = (status: string, type: InvoiceType) => {
    if (type === "sale") {
      const map: Record<string, string> = {
        completed: "bg-green-100 text-green-700",
        pending: "bg-yellow-100 text-yellow-700",
        cancelled: "bg-gray-100 text-gray-600",
        refunded: "bg-red-100 text-red-700",
      }
      return map[status] ?? "bg-gray-100 text-gray-600"
    }
    const map: Record<string, string> = {
      received: "bg-green-100 text-green-700",
      pending: "bg-yellow-100 text-yellow-700",
      cancelled: "bg-gray-100 text-gray-600",
    }
    return map[status] ?? "bg-gray-100 text-gray-600"
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t("nav.invoicing")}
        subtitle={t("nav.invoicing")}
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: t("common.total") + " " + t("nav.invoicing"), value: String(allInvoices.length), icon: FileText, color: "text-indigo-600 bg-indigo-50" },
          { label: t("nav.sales") + " " + t("nav.invoicing"), value: String(saleInvoices.length), icon: ShoppingCart, color: "text-green-600 bg-green-50" },
          { label: t("nav.purchases") + " " + t("nav.invoicing"), value: String(purchaseInvoices.length), icon: ShoppingBag, color: "text-blue-600 bg-blue-50" },
          { label: t("supplierDebts.totalAmount"), value: formatCurrency(totalValue), icon: TrendingUp, color: "text-purple-600 bg-purple-50" },
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
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            {(["all", "sale", "purchase"] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {f === "all" ? t("common.all") : f === "sale" ? t("nav.sales") : t("nav.purchases")}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("common.search")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">{t("common.noData")}</p>
            <p className="text-sm text-gray-400 mt-1">
              {allInvoices.length === 0
                ? "Invoices are generated automatically when you create sales or purchases"
                : "Try adjusting your search or filter"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Invoice #</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">{t("common.status")}</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">{t("common.date")}</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Customer / Supplier</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">{t("common.total")}</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">{t("common.status")}</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">{t("common.print")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((inv) => (
                  <tr key={`${inv.type}-${inv.id}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">{inv.id}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        inv.type === "sale" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"
                      }`}>
                        {inv.type === "sale" ? "Sale" : "Purchase"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(inv.date)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{inv.party}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatCurrency(inv.total)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColor(inv.status, inv.type)}`}>
                        {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setPrintInvoice(inv)}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                        title={t("common.print")}
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">Showing {filtered.length} of {allInvoices.length} invoices</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Print Invoice Modal ── */}
      {printInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {printInvoice.type === "sale" ? t("nav.sales") + " " + t("nav.invoicing") : t("nav.purchases") + " " + t("nav.invoicing")}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  <Printer className="h-4 w-4" /> {t("common.print")}
                </button>
                <button onClick={() => setPrintInvoice(null)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Company header */}
              <div className="text-center border-b pb-4">
                <h1 className="text-2xl font-bold text-gray-900">{companyName}</h1>
                {settings.address && <p className="text-sm text-gray-500 mt-1">{settings.address}</p>}
                <p className="text-sm text-gray-500">
                  {[settings.phone, settings.email].filter(Boolean).join(" | ")}
                </p>
                {settings.taxId && (
                  <p className="text-xs text-gray-400 mt-1">Tax ID: {settings.taxId}</p>
                )}
              </div>

              {/* Invoice meta */}
              <div className="flex justify-between text-sm">
                <div>
                  <p className="text-xs uppercase font-medium text-gray-500 mb-1">Invoice #</p>
                  <p className="font-bold text-gray-900">{printInvoice.id}</p>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    printInvoice.type === "sale" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"
                  }`}>
                    {printInvoice.type === "sale" ? "Sales Invoice" : "Purchase Invoice"}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase font-medium text-gray-500 mb-1">Date</p>
                  <p className="font-semibold text-gray-900">{formatDate(printInvoice.date)}</p>
                </div>
              </div>

              {/* Party */}
              <div className="border-t pt-3 text-sm">
                <p className="text-xs uppercase font-medium text-gray-500 mb-1">
                  {printInvoice.type === "sale" ? t("sales.customer") : t("purchases.supplier")}
                </p>
                <p className="font-semibold text-gray-900">{printInvoice.party}</p>
              </div>

              {/* Items table */}
              <table className="w-full text-sm border-t">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-gray-500 font-medium">Item</th>
                    <th className="text-right py-2 text-gray-500 font-medium">Qty</th>
                    <th className="text-right py-2 text-gray-500 font-medium">
                      {printInvoice.type === "sale" ? "Price" : "Cost"}
                    </th>
                    <th className="text-right py-2 text-gray-500 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {printInvoice.items.map((item, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2 text-gray-900">{item.name}</td>
                      <td className="text-right py-2 text-gray-600">{item.qty}</td>
                      <td className="text-right py-2 text-gray-600">{formatCurrency(item.price)}</td>
                      <td className="text-right py-2 font-medium text-gray-900">
                        {formatCurrency(item.qty * item.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="pt-3 text-right text-gray-500">{t("sales.subtotal")}</td>
                    <td className="pt-3 text-right text-gray-900">{formatCurrency(printInvoice.subtotal)}</td>
                  </tr>
                  {printInvoice.type === "sale" && (
                    <tr>
                      <td colSpan={3} className="text-right text-gray-500">{t("sales.tax")} ({taxRateLabel})</td>
                      <td className="text-right text-gray-900">{formatCurrency(printInvoice.tax)}</td>
                    </tr>
                  )}
                  <tr className="border-t">
                    <td colSpan={3} className="pt-2 text-right font-bold text-gray-900">{t("common.total")}</td>
                    <td className="pt-2 text-right font-bold text-indigo-600">
                      {formatCurrency(printInvoice.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Footer info */}
              <div className="text-center text-xs text-gray-400 border-t pt-3 space-y-0.5">
                {printInvoice.type === "sale" && printInvoice.payment && (
                  <p>Payment: <span className="capitalize font-medium text-gray-600">{printInvoice.payment}</span></p>
                )}
                <p>Status: <span className="capitalize font-medium text-gray-600">{printInvoice.status}</span></p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
