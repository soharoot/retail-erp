"use client"

import { useState } from "react"
import { useSupabaseData as useLocalStorage } from "@/hooks/use-supabase-data"
import { PageHeader } from "@/components/layout/page-header"
import { KpiCard } from "@/components/shared/kpi-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { SearchInput } from "@/components/shared/search-input"
import { Shield, Users, UserCheck, UserX, Pencil, Trash2, X, Key, Clock } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"

interface User {
  id: string
  name: string
  email: string
  role: string
  department: string
  status: string
  lastLogin: string
  createdAt: string
}

const initialUsers: User[] = [
  { id: "U-001", name: "Admin User", email: "admin@erp.com", role: "admin", department: "Management", status: "active", lastLogin: "2025-03-09", createdAt: "2024-01-15" },
  { id: "U-002", name: "Sarah Davis", email: "sarah.davis@erp.com", role: "manager", department: "Sales", status: "active", lastLogin: "2025-03-09", createdAt: "2024-02-01" },
  { id: "U-003", name: "John Miller", email: "john.miller@erp.com", role: "manager", department: "Finance", status: "active", lastLogin: "2025-03-08", createdAt: "2024-02-15" },
  { id: "U-004", name: "Emily Chen", email: "emily.chen@erp.com", role: "employee", department: "Engineering", status: "active", lastLogin: "2025-03-07", createdAt: "2024-03-01" },
  { id: "U-005", name: "Mike Johnson", email: "mike.j@erp.com", role: "employee", department: "Marketing", status: "active", lastLogin: "2025-03-06", createdAt: "2024-03-15" },
  { id: "U-006", name: "Lisa Wang", email: "lisa.wang@erp.com", role: "employee", department: "HR", status: "active", lastLogin: "2025-03-05", createdAt: "2024-04-01" },
  { id: "U-007", name: "Tom Brown", email: "tom.b@erp.com", role: "viewer", department: "Operations", status: "active", lastLogin: "2025-02-28", createdAt: "2024-05-10" },
  { id: "U-008", name: "Anna Wilson", email: "anna.w@erp.com", role: "employee", department: "Sales", status: "inactive", lastLogin: "2025-01-15", createdAt: "2024-04-20" },
  { id: "U-009", name: "David Park", email: "david.p@erp.com", role: "viewer", department: "Finance", status: "inactive", lastLogin: "2024-12-20", createdAt: "2024-06-01" },
  { id: "U-010", name: "Rachel Green", email: "rachel.g@erp.com", role: "manager", department: "Operations", status: "active", lastLogin: "2025-03-08", createdAt: "2024-07-15" },
]

const roleColors: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  manager: "bg-blue-100 text-blue-700",
  employee: "bg-green-100 text-green-700",
  viewer: "bg-gray-100 text-gray-600",
}

const permissions = {
  admin: { dashboard: true, products: true, inventory: true, sales: true, purchases: true, suppliers: true, customers: true, invoicing: true, financial: true, hr: true, projects: true, crm: true, reports: true, settings: true, users: true },
  manager: { dashboard: true, products: true, inventory: true, sales: true, purchases: true, suppliers: true, customers: true, invoicing: true, financial: true, hr: false, projects: true, crm: true, reports: true, settings: false, users: false },
  employee: { dashboard: true, products: true, inventory: true, sales: true, purchases: false, suppliers: false, customers: true, invoicing: false, financial: false, hr: false, projects: true, crm: true, reports: false, settings: false, users: false },
  viewer: { dashboard: true, products: true, inventory: true, sales: false, purchases: false, suppliers: false, customers: false, invoicing: false, financial: false, hr: false, projects: false, crm: false, reports: true, settings: false, users: false },
}

export default function UsersPage() {
  const { t } = useI18n()
  const [users, setUsers] = useLocalStorage<User[]>("erp-users", initialUsers)
  const [search, setSearch] = useState("")
  const [showDialog, setShowDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState<"users" | "roles" | "activity">("users")
  const [formData, setFormData] = useState({ name: "", email: "", role: "employee", department: "", status: "active" })

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.department.toLowerCase().includes(search.toLowerCase())
  )

  const activeUsers = users.filter(u => u.status === "active").length
  const admins = users.filter(u => u.role === "admin").length
  const inactiveUsers = users.filter(u => u.status === "inactive").length

  const handleSave = () => {
    if (!formData.name || !formData.email) return
    if (editingUser) {
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...formData } : u))
    } else {
      const newUser: User = {
        id: `U-${String(users.length + 1).padStart(3, "0")}`,
        ...formData,
        lastLogin: "Never",
        createdAt: new Date().toISOString().split("T")[0],
      }
      setUsers([...users, newUser])
    }
    setShowDialog(false)
    setEditingUser(null)
    setFormData({ name: "", email: "", role: "employee", department: "", status: "active" })
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({ name: user.name, email: user.email, role: user.role, department: user.department, status: user.status })
    setShowDialog(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      setUsers(users.filter(u => u.id !== id))
    }
  }

  const activityLog = [
    { user: "Admin User", action: "Updated system settings", time: "2 minutes ago" },
    { user: "Sarah Davis", action: "Created new invoice INV-2025-015", time: "15 minutes ago" },
    { user: "John Miller", action: "Approved purchase order PO-012", time: "1 hour ago" },
    { user: "Emily Chen", action: "Added new product SKU-089", time: "2 hours ago" },
    { user: "Mike Johnson", action: "Closed deal with MegaRetail", time: "3 hours ago" },
    { user: "Admin User", action: "Added new user Rachel Green", time: "5 hours ago" },
    { user: "Lisa Wang", action: "Updated employee records", time: "Yesterday" },
    { user: "Sarah Davis", action: "Generated monthly sales report", time: "Yesterday" },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title={t("users.title")} subtitle={t("users.subtitle")} action={{ label: t("users.addUser"), onClick: () => { setEditingUser(null); setFormData({ name: "", email: "", role: "employee", department: "", status: "active" }); setShowDialog(true) } }} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title={t("users.totalUsers")} value={String(users.length)} subtitle="All accounts" icon={Users} />
        <KpiCard title={t("users.activeUsers")} value={String(activeUsers)} subtitle="Currently active" icon={UserCheck} />
        <KpiCard title={t("users.roles")} value={String(admins)} subtitle="Full access" icon={Shield} />
        <KpiCard title={t("common.inactive")} value={String(inactiveUsers)} subtitle="Disabled accounts" icon={UserX} />
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        {[
          { id: "users" as const, label: t("users.title") },
          { id: "roles" as const, label: t("users.roles") },
          { id: "activity" as const, label: t("users.activity") },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "users" && (
        <>
          <SearchInput placeholder={t("common.search")} value={search} onChange={setSearch} />
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Department</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Last Login</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 text-sm font-bold">
                          {user.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${roleColors[user.role]}`}>
                        <Key className="h-3 w-3" />{user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.department}</td>
                    <td className="px-4 py-3"><StatusBadge status={user.status} /></td>
                    <td className="px-4 py-3 text-sm text-gray-500">{user.lastLogin === "Never" ? "Never" : formatDate(user.lastLogin)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEdit(user)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"><Pencil className="h-4 w-4" /></button>
                        {user.role !== "admin" && <button onClick={() => handleDelete(user.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === "roles" && (
        <div className="space-y-6">
          {(["admin", "manager", "employee", "viewer"] as const).map(role => (
            <div key={role} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium capitalize ${roleColors[role]}`}>
                    <Shield className="h-4 w-4" />{role}
                  </span>
                  <span className="text-sm text-gray-500">{users.filter(u => u.role === role).length} users</span>
                </div>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                {Object.entries(permissions[role]).map(([module, hasAccess]) => (
                  <div key={module} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${hasAccess ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-400"}`}>
                    <div className={`w-2 h-2 rounded-full ${hasAccess ? "bg-green-500" : "bg-gray-300"}`} />
                    <span className="capitalize">{module}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "activity" && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">Recent Activity</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {activityLog.map((activity, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex-shrink-0">
                  {activity.user.split(" ").map(n => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900"><span className="font-medium">{activity.user}</span> {activity.action}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                  <Clock className="h-3 w-3" />
                  {activity.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit User Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowDialog(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">{editingUser ? "Edit User" : "Add New User"}</h2>
              <button onClick={() => setShowDialog(false)} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label><input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Role</label><select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"><option value="admin">Admin</option><option value="manager">Manager</option><option value="employee">Employee</option><option value="viewer">Viewer</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Department</label><select value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"><option value="">Select...</option><option>Management</option><option>Engineering</option><option>Sales</option><option>Marketing</option><option>Finance</option><option>HR</option><option>Operations</option></select></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label><select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button onClick={() => setShowDialog(false)} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">{editingUser ? "Save Changes" : "Add User"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
