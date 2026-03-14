"use client"

import { useState } from "react"
import { useI18n } from "@/lib/i18n/context"
import { useSupabaseData as useLocalStorage } from "@/hooks/use-supabase-data"
import { PageHeader } from "@/components/layout/page-header"
import { KpiCard } from "@/components/shared/kpi-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { SearchInput } from "@/components/shared/search-input"
import { Users, UserCheck, DollarSign, Crown, Pencil, Trash2, X } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface Customer {
  id: string; name: string; email: string; phone: string; company: string; orders: number; totalSpent: number; segment: string; status: string
}

const initialCustomers: Customer[] = [
  { id: "C-001", name: "Alice Johnson", email: "alice@example.com", phone: "+1 (555) 111-0001", company: "Johnson Corp", orders: 12, totalSpent: 4520, segment: "VIP", status: "active" },
  { id: "C-002", name: "Bob Smith", email: "bob@example.com", phone: "+1 (555) 111-0002", company: "Smith & Co", orders: 8, totalSpent: 3200, segment: "Regular", status: "active" },
  { id: "C-003", name: "Carol Williams", email: "carol@example.com", phone: "+1 (555) 111-0003", company: "Williams Inc", orders: 15, totalSpent: 6800, segment: "VIP", status: "active" },
  { id: "C-004", name: "David Lee", email: "david@example.com", phone: "+1 (555) 111-0004", company: "Lee Enterprises", orders: 6, totalSpent: 2100, segment: "Regular", status: "active" },
  { id: "C-005", name: "Eva Martinez", email: "eva@example.com", phone: "+1 (555) 111-0005", company: "Martinez LLC", orders: 10, totalSpent: 5400, segment: "VIP", status: "active" },
  { id: "C-006", name: "Frank Wilson", email: "frank@example.com", phone: "+1 (555) 111-0006", company: "Wilson Trading", orders: 3, totalSpent: 890, segment: "New", status: "active" },
  { id: "C-007", name: "Grace Kim", email: "grace@example.com", phone: "+1 (555) 111-0007", company: "Kim Studios", orders: 2, totalSpent: 540, segment: "New", status: "inactive" },
  { id: "C-008", name: "Henry Brown", email: "henry@example.com", phone: "+1 (555) 111-0008", company: "Brown Goods", orders: 7, totalSpent: 2890, segment: "Regular", status: "active" },
]

const segmentColors: Record<string, string> = { VIP: "bg-purple-100 text-purple-700", Regular: "bg-blue-100 text-blue-700", New: "bg-green-100 text-green-700" }

export default function CustomersPage() {
  const { t } = useI18n()
  const [customers, setCustomers] = useLocalStorage<Customer[]>("erp-customers", initialCustomers)
  const [search, setSearch] = useState("")
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", segment: "Regular", status: "active" })

  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()) || c.company.toLowerCase().includes(search.toLowerCase()))
  const activeCount = customers.filter(c => c.status === "active").length
  const vipCount = customers.filter(c => c.segment === "VIP").length
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0)

  const handleSave = () => {
    if (!form.name) return
    if (editing) {
      setCustomers(customers.map(c => c.id === editing.id ? { ...c, ...form } : c))
    } else {
      setCustomers([...customers, { id: `C-${String(customers.length + 1).padStart(3, "0")}`, ...form, orders: 0, totalSpent: 0 }])
    }
    setShowDialog(false); setEditing(null)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Customer Management" subtitle="Manage your customer relationships" action={{ label: "Add Customer", onClick: () => { setEditing(null); setForm({ name: "", email: "", phone: "", company: "", segment: "Regular", status: "active" }); setShowDialog(true) } }} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Customers" value={String(customers.length)} subtitle="All customers" icon={Users} />
        <KpiCard title="Active Customers" value={String(activeCount)} subtitle="Currently active" icon={UserCheck} />
        <KpiCard title="Total Revenue" value={formatCurrency(totalRevenue)} subtitle="From all customers" icon={DollarSign} />
        <KpiCard title="VIP Customers" value={String(vipCount)} subtitle="High-value clients" icon={Crown} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Customer Directory</h2>
          <div className="mt-4"><SearchInput placeholder={t("common.search")} value={search} onChange={setSearch} /></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("common.name")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("common.email")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("common.phone")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Company</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Orders</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total Spent</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Segment</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("common.status")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold">{c.name.split(" ").map(n => n[0]).join("")}</div><span className="text-sm font-medium text-gray-900">{c.name}</span></div></td>
                  <td className="px-4 py-3 text-sm text-gray-500">{c.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{c.phone}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.company}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.orders}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(c.totalSpent)}</td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${segmentColors[c.segment]}`}>{c.segment}</span></td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditing(c); setForm({ name: c.name, email: c.email, phone: c.phone, company: c.company, segment: c.segment, status: c.status }); setShowDialog(true) }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setCustomers(customers.filter(x => x.id !== c.id))} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowDialog(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">{editing ? "Edit Customer" : "Add Customer"}</h2>
              <button onClick={() => setShowDialog(false)} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("common.name")}</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("common.email")}</label><input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("common.phone")}</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Company</label><input value={form.company} onChange={e => setForm({...form, company: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Segment</label><select value={form.segment} onChange={e => setForm({...form, segment: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"><option>VIP</option><option>Regular</option><option>New</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("common.status")}</label><select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"><option value="active">{t("common.active")}</option><option value="inactive">{t("common.inactive")}</option></select></div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button onClick={() => setShowDialog(false)} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">{t("common.cancel")}</button>
                <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">{editing ? t("common.save") : "Add Customer"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
