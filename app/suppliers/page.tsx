"use client"

import { useState } from "react"
import { useSupabaseData as useLocalStorage } from "@/hooks/use-supabase-data"
import { PageHeader } from "@/components/layout/page-header"
import { KpiCard } from "@/components/shared/kpi-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { SearchInput } from "@/components/shared/search-input"
import { Truck, ShoppingBag, DollarSign, Pencil, X, Mail, Phone } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface Supplier {
  id: string; name: string; contactPerson: string; email: string; phone: string; address: string; orders: number; totalSpent: number; status: string
}

const initialSuppliers: Supplier[] = [
  { id: "1", name: "TechGear Wholesale", contactPerson: "John Smith", email: "john@techgear.com", phone: "+1 (555) 123-4567", address: "123 Tech Blvd, San Jose, CA", orders: 45, totalSpent: 125000, status: "active" },
  { id: "2", name: "SportsPro Suppliers", contactPerson: "Sarah Johnson", email: "sarah@sportspro.com", phone: "+1 (555) 234-5678", address: "456 Sports Ave, Portland, OR", orders: 32, totalSpent: 87500, status: "active" },
  { id: "3", name: "HomeComfort Ltd", contactPerson: "Michael Brown", email: "michael@homecomfort.com", phone: "+1 (555) 345-6789", address: "789 Home St, Chicago, IL", orders: 28, totalSpent: 65000, status: "active" },
  { id: "4", name: "Fashion Forward Inc", contactPerson: "Emma Wilson", email: "emma@fashionforward.com", phone: "+1 (555) 456-7890", address: "321 Fashion Rd, New York, NY", orders: 15, totalSpent: 42000, status: "inactive" },
  { id: "5", name: "Global Electronics Co", contactPerson: "David Park", email: "david@globalelec.com", phone: "+1 (555) 567-8901", address: "654 Circuit Way, Austin, TX", orders: 52, totalSpent: 198000, status: "active" },
  { id: "6", name: "FreshGoods Trading", contactPerson: "Lisa Chen", email: "lisa@freshgoods.com", phone: "+1 (555) 678-9012", address: "987 Trade Ln, Seattle, WA", orders: 19, totalSpent: 34000, status: "active" },
]

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useLocalStorage<Supplier[]>("erp-suppliers", initialSuppliers)
  const [search, setSearch] = useState("")
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState({ name: "", contactPerson: "", email: "", phone: "", address: "", status: "active" })

  const filtered = suppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.contactPerson.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()))
  const active = suppliers.filter(s => s.status === "active").length
  const totalOrders = suppliers.reduce((sum, s) => sum + s.orders, 0)
  const totalSpent = suppliers.reduce((sum, s) => sum + s.totalSpent, 0)

  const handleSave = () => {
    if (!form.name) return
    if (editing) {
      setSuppliers(suppliers.map(s => s.id === editing.id ? { ...s, ...form } : s))
    } else {
      setSuppliers([...suppliers, { id: String(suppliers.length + 1), ...form, orders: 0, totalSpent: 0 }])
    }
    setShowDialog(false); setEditing(null); setForm({ name: "", contactPerson: "", email: "", phone: "", address: "", status: "active" })
  }

  const handleEdit = (s: Supplier) => { setEditing(s); setForm({ name: s.name, contactPerson: s.contactPerson, email: s.email, phone: s.phone, address: s.address, status: s.status }); setShowDialog(true) }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Supplier Management" subtitle="Manage suppliers and track purchase history" action={{ label: "Add Supplier", onClick: () => { setEditing(null); setForm({ name: "", contactPerson: "", email: "", phone: "", address: "", status: "active" }); setShowDialog(true) } }} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard title="Active Suppliers" value={String(active)} subtitle="Currently active" icon={Truck} />
        <KpiCard title="Total Orders" value={String(totalOrders)} subtitle="All time orders" icon={ShoppingBag} />
        <KpiCard title="Total Spent" value={formatCurrency(totalSpent)} subtitle="All time spending" icon={DollarSign} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All Suppliers</h2>
          <p className="text-sm text-gray-500">View and manage supplier information</p>
          <div className="mt-4"><SearchInput placeholder="Search suppliers by name, contact, or email..." value={search} onChange={setSearch} /></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Supplier Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Contact Person</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Contact Info</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Orders</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total Spent</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s.contactPerson}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-1 text-gray-600"><Mail className="h-3.5 w-3.5 text-gray-400" />{s.email}</div>
                      <div className="flex items-center gap-1 text-gray-600"><Phone className="h-3.5 w-3.5 text-gray-400" />{s.phone}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s.orders}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(s.totalSpent)}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                  <td className="px-4 py-3"><button onClick={() => handleEdit(s)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"><Pencil className="h-4 w-4" /></button></td>
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
              <h2 className="text-lg font-bold text-gray-900">{editing ? "Edit Supplier" : "Add Supplier"}</h2>
              <button onClick={() => setShowDialog(false)} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label><input value={form.contactPerson} onChange={e => setForm({...form, contactPerson: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label><select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Address</label><input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button onClick={() => setShowDialog(false)} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">{editing ? "Save" : "Add Supplier"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
