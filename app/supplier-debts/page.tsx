"use client"

import { PageGuard } from "@/components/shared/permission-guard"
import { PERMISSIONS } from "@/lib/rbac/permissions"

import { useState } from "react"
import { useI18n } from "@/lib/i18n/context"
import { useAuth } from "@/lib/supabase/auth-context"
import { useRBAC } from "@/lib/rbac/rbac-context"
import { logAction } from "@/lib/activity/log-action"
import { useTableData, insertChildRows } from "@/hooks/use-table-data"
import { PageHeader } from "@/components/layout/page-header"
import { KpiCard } from "@/components/shared/kpi-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { SearchInput } from "@/components/shared/search-input"
import { FormError } from "@/components/shared/form-error"
import { validatePayment } from "@/lib/validation"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { SupplierDebt, DebtPayment, PurchaseOrder } from "@/lib/types"
import { Landmark, AlertCircle, CheckCircle2, Clock, X, DollarSign } from "lucide-react"

export default function SupplierDebtsPage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const { orgId } = useRBAC()

  const {
    data: debts,
    loading,
    update: updateDebt,
    refresh: refreshDebts,
  } = useTableData<SupplierDebt>("supplier_debts", {
    select: "*, debt_payments(*)",
    orderBy: { column: "createdAt", ascending: false },
  })

  const {
    update: updatePurchase,
  } = useTableData<PurchaseOrder>("purchase_orders", { manual: true })

  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [paymentDialog, setPaymentDialog] = useState<SupplierDebt | null>(null)
  const [detailDialog, setDetailDialog] = useState<SupplierDebt | null>(null)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentNote, setPaymentNote] = useState("")
  const [paymentError, setPaymentError] = useState("")

  // KPI calculations
  const totalOutstanding = debts.filter((d) => d.status !== "paid").reduce((sum, d) => sum + (d.remainingDebt ?? 0), 0)
  const activeDebts = debts.filter((d) => d.status !== "paid").length
  const fullyPaid = debts.filter((d) => d.status === "paid").length
  const partiallyPaid = debts.filter((d) => d.status === "partial").length

  // Filter by tab
  const tabs = [
    { id: "all", label: t("common.all") },
    { id: "outstanding", label: t("supplierDebts.outstanding") },
    { id: "partial", label: t("supplierDebts.partial") },
    { id: "paid", label: t("supplierDebts.paid") },
  ]
  const tabFiltered = activeTab === "all" ? debts : debts.filter((d) => d.status === activeTab)
  const filtered = tabFiltered.filter(
    (d) =>
      (d.supplierName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (d.purchaseOrderId ?? "").toLowerCase().includes(search.toLowerCase())
  )

  const handleRecordPayment = async () => {
    if (!paymentDialog) return
    const amount = parseFloat(paymentAmount)

    const validation = validatePayment({ amount: paymentAmount, maxAmount: paymentDialog.remainingDebt })
    if (!validation.valid) {
      setPaymentError(validation.errors.amount ?? "Paiement invalide")
      return
    }

    const today = new Date().toISOString().split("T")[0]

    // 1. Insert debt payment
    await insertChildRows("debt_payments", [
      { debtId: paymentDialog.id, amount, date: today, note: paymentNote || "Paiement enregistré" },
    ])

    // 2. Update debt record
    const newAmountPaid = (paymentDialog.amountPaid ?? 0) + amount
    const newRemaining = (paymentDialog.totalAmount ?? 0) - newAmountPaid
    const newStatus = newRemaining <= 0 ? "paid" : "partial"

    await updateDebt(paymentDialog.id, {
      amountPaid: newAmountPaid,
      remainingDebt: Math.max(0, newRemaining),
      status: newStatus,
    } as Partial<SupplierDebt>)

    // 3. Sync payment back to purchase order
    if (paymentDialog.purchaseOrderId) {
      await updatePurchase(paymentDialog.purchaseOrderId, {
        amountPaid: newAmountPaid,
        remainingDebt: Math.max(0, newRemaining),
      } as Partial<PurchaseOrder>)
    }

    // 4. Log action
    if (user?.id && orgId) {
      logAction({
        action: "debt.payment_recorded",
        module: "supplier-debts",
        description: `Paiement de ${formatCurrency(amount)} enregistré pour ${paymentDialog.supplierName} (${paymentDialog.purchaseOrderId ?? "N/A"})`,
        userId: user.id,
        orgId,
        userName: user.email ?? undefined,
        metadata: {
          debt_id: paymentDialog.id,
          supplier: paymentDialog.supplierName,
          amount,
          new_status: newStatus,
          remaining: Math.max(0, newRemaining),
        },
      })
    }

    await refreshDebts()
    setPaymentDialog(null)
    setPaymentAmount("")
    setPaymentNote("")
    setPaymentError("")
  }

  return (
    <PageGuard permission={PERMISSIONS.SUPPLIER_DEBTS_VIEW}>
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t("supplierDebts.title")}
        subtitle={t("supplierDebts.subtitle")}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total impayé" value={formatCurrency(totalOutstanding)} subtitle="Solde impayé" icon={DollarSign} />
        <KpiCard title="Dettes actives" value={String(activeDebts)} subtitle="Paiements en attente" icon={AlertCircle} />
        <KpiCard title="Entièrement payé" value={String(fullyPaid)} subtitle="Dettes réglées" icon={CheckCircle2} />
        <KpiCard title="Partiellement payé" value={String(partiallyPaid)} subtitle="Paiements en cours" icon={Clock} />
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-[#00483c] text-[#00483c]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {tab.id !== "all" && (
              <span className="ml-1 text-xs">({debts.filter((d) => d.status === tab.id).length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <SearchInput placeholder={t("common.search")} value={search} onChange={setSearch} />

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <p className="text-gray-400">{t("common.loading")}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("purchases.supplier")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("supplierDebts.purchaseRef")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("supplierDebts.totalAmount")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("supplierDebts.amountPaid")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("supplierDebts.remainingDebt")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("common.status")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500">
                    <Landmark className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    {t("common.noData")}
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{d.supplierName}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{d.purchaseOrderId ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(d.totalAmount)}</td>
                    <td className="px-4 py-3 text-sm text-green-600 font-medium">{formatCurrency(d.amountPaid)}</td>
                    <td className="px-4 py-3 text-sm font-medium">
                      <span className={(d.remainingDebt ?? 0) > 0 ? "text-red-600" : "text-green-600"}>
                        {formatCurrency(d.remainingDebt)}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {d.status !== "paid" && (
                          <button
                            onClick={() => {
                              setPaymentDialog(d)
                              setPaymentAmount("")
                              setPaymentNote("")
                              setPaymentError("")
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#00483c] bg-[#e6f0ed] rounded-lg hover:bg-[#cce0db] transition-colors"
                          >
                            <DollarSign className="h-3.5 w-3.5" />
                            {t("supplierDebts.payTranche")}
                          </button>
                        )}
                        <button
                          onClick={() => setDetailDialog(d)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          Détails
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Record Payment Dialog */}
      {paymentDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setPaymentDialog(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Enregistrer un paiement</h2>
                <p className="text-sm text-gray-500 mt-0.5">{paymentDialog.supplierName}</p>
              </div>
              <button onClick={() => setPaymentDialog(null)} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg text-sm">
                <div>
                  <span className="text-gray-500">{t("supplierDebts.totalDebt")}</span>
                  <p className="font-semibold text-gray-900">{formatCurrency(paymentDialog.totalAmount)}</p>
                </div>
                <div>
                  <span className="text-gray-500">{t("supplierDebts.totalPaid")}</span>
                  <p className="font-semibold text-green-600">{formatCurrency(paymentDialog.amountPaid)}</p>
                </div>
                <div>
                  <span className="text-gray-500">{t("supplierDebts.remainingTotal")}</span>
                  <p className="font-semibold text-red-600">{formatCurrency(paymentDialog.remainingDebt)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Paiements effectués</span>
                  <p className="font-semibold text-gray-900">{(paymentDialog.payments ?? []).length}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("supplierDebts.paymentAmount")}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">DA</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={paymentDialog.remainingDebt}
                    value={paymentAmount}
                    onChange={(e) => { setPaymentAmount(e.target.value); setPaymentError("") }}
                    placeholder={`Max: ${(paymentDialog.remainingDebt ?? 0).toFixed(2)}`}
                    className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00483c]"
                  />
                </div>
                <FormError error={paymentError} />
                {paymentAmount && parseFloat(paymentAmount) === paymentDialog.remainingDebt && !paymentError && (
                  <p className="text-xs text-green-600 mt-1">Ceci réglera entièrement la dette</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (facultatif)</label>
                <input
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="ex: Virement bancaire, paiement espèces..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00483c]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setPaymentDialog(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleRecordPayment}
                  disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#00483c] rounded-lg hover:bg-[#003d33] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("common.save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debt Detail Dialog */}
      {detailDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setDetailDialog(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Détails de la dette</h2>
                <p className="text-sm text-gray-500 mt-0.5">{detailDialog.supplierName}</p>
              </div>
              <button onClick={() => setDetailDialog(null)} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">{t("purchases.supplier")}</span>
                  <p className="font-medium text-gray-900">{detailDialog.supplierName}</p>
                </div>
                <div>
                  <span className="text-gray-500">{t("supplierDebts.purchaseRef")}</span>
                  <p className="font-medium font-mono text-gray-900">{detailDialog.purchaseOrderId ?? "—"}</p>
                </div>
                <div>
                  <span className="text-gray-500">{t("supplierDebts.totalAmount")}</span>
                  <p className="font-medium text-gray-900">{formatCurrency(detailDialog.totalAmount)}</p>
                </div>
                <div>
                  <span className="text-gray-500">{t("common.status")}</span>
                  <div className="mt-1"><StatusBadge status={detailDialog.status} /></div>
                </div>
                <div>
                  <span className="text-gray-500">{t("supplierDebts.amountPaid")}</span>
                  <p className="font-medium text-green-600">{formatCurrency(detailDialog.amountPaid)}</p>
                </div>
                <div>
                  <span className="text-gray-500">{t("supplierDebts.remainingDebt")}</span>
                  <p className={`font-medium ${(detailDialog.remainingDebt ?? 0) > 0 ? "text-red-600" : "text-green-600"}`}>
                    {formatCurrency(detailDialog.remainingDebt)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Créé le</span>
                  <p className="font-medium text-gray-900">{formatDate(detailDialog.createdAt)}</p>
                </div>
              </div>

              {/* Payment progress bar */}
              <div className="pt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progression du paiement</span>
                  <span>{detailDialog.totalAmount > 0 ? Math.round(((detailDialog.amountPaid ?? 0) / detailDialog.totalAmount) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${detailDialog.status === "paid" ? "bg-green-500" : "bg-[#00483c]"}`}
                    style={{ width: `${detailDialog.totalAmount > 0 ? Math.min(((detailDialog.amountPaid ?? 0) / detailDialog.totalAmount) * 100, 100) : 0}%` }}
                  />
                </div>
              </div>

              {/* Payment history */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">{t("supplierDebts.paymentHistory")}</h4>
                {(detailDialog.payments ?? []).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Aucun paiement enregistré</p>
                ) : (
                  <div className="space-y-2">
                    {(detailDialog.payments ?? []).map((p, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{formatCurrency(p.amount)}</p>
                          <p className="text-xs text-gray-500">{p.note}</p>
                        </div>
                        <span className="text-xs text-gray-400">{formatDate(p.date)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={() => setDetailDialog(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  {t("common.close")}
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
