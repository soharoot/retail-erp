"use client"

import { PageGuard } from "@/components/shared/permission-guard"
import { PERMISSIONS } from "@/lib/rbac/permissions"

import { useState } from "react"
import { useTableData } from "@/hooks/use-table-data"
import { useAuth } from "@/lib/supabase/auth-context"
import { useRBAC } from "@/lib/rbac/rbac-context"
import { logAction } from "@/lib/activity/log-action"
import type { Employee } from "@/lib/types"
import {
  Users,
  UserCheck,
  Building2,
  DollarSign,
  X,
  Plus,
  Pencil,
  Trash2,
  Calendar,
} from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { SearchInput } from "@/components/shared/search-input"
import { KpiCard } from "@/components/shared/kpi-card"
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"

// ── Attendance & Leave types (no DB table yet — display-only mock data) ──

interface AttendanceRecord {
  id: string
  employeeId: string
  employeeName: string
  date: string
  checkIn: string
  checkOut: string
  status: string
  hours: number
}

interface LeaveRecord {
  id: string
  employeeId: string
  employeeName: string
  leaveType: string
  startDate: string
  endDate: string
  days: number
  status: string
}

// ── Static constants ─────────────────────────────────────────

const departments = [
  { name: "Engineering", manager: "James Wilson", count: 0 },
  { name: "Sales", manager: "Sarah Mitchell", count: 0 },
  { name: "Marketing", manager: "Laura Chen", count: 0 },
  { name: "Finance", manager: "Robert Taylor", count: 0 },
  { name: "HR", manager: "Maria Garcia", count: 0 },
  { name: "Operations", manager: "Kevin Brown", count: 0 },
]

const initialAttendance: AttendanceRecord[] = [
  { id: "a1", employeeId: "1", employeeName: "James Wilson", date: "2025-03-09", checkIn: "08:55", checkOut: "17:30", status: "present", hours: 8.58 },
  { id: "a2", employeeId: "2", employeeName: "Sarah Mitchell", date: "2025-03-09", checkIn: "09:10", checkOut: "18:00", status: "late", hours: 8.83 },
  { id: "a3", employeeId: "3", employeeName: "Laura Chen", date: "2025-03-09", checkIn: "08:45", checkOut: "17:15", status: "present", hours: 8.5 },
  { id: "a4", employeeId: "4", employeeName: "Robert Taylor", date: "2025-03-09", checkIn: "09:00", checkOut: "17:45", status: "present", hours: 8.75 },
  { id: "a5", employeeId: "5", employeeName: "Maria Garcia", date: "2025-03-09", checkIn: "", checkOut: "", status: "absent", hours: 0 },
  { id: "a6", employeeId: "6", employeeName: "Kevin Brown", date: "2025-03-09", checkIn: "08:30", checkOut: "17:00", status: "present", hours: 8.5 },
  { id: "a7", employeeId: "7", employeeName: "Emily Zhang", date: "2025-03-09", checkIn: "08:50", checkOut: "17:20", status: "present", hours: 8.5 },
  { id: "a8", employeeId: "8", employeeName: "David Kim", date: "2025-03-09", checkIn: "09:15", checkOut: "17:45", status: "late", hours: 8.5 },
  { id: "a9", employeeId: "9", employeeName: "Jessica Patel", date: "2025-03-09", checkIn: "", checkOut: "", status: "absent", hours: 0 },
  { id: "a10", employeeId: "10", employeeName: "Michael Johnson", date: "2025-03-09", checkIn: "08:58", checkOut: "17:30", status: "present", hours: 8.53 },
]

const initialLeaves: LeaveRecord[] = [
  { id: "l1", employeeId: "5", employeeName: "Maria Garcia", leaveType: "Sick Leave", startDate: "2025-03-09", endDate: "2025-03-10", days: 2, status: "approved" },
  { id: "l2", employeeId: "9", employeeName: "Jessica Patel", leaveType: "Personal Leave", startDate: "2025-03-09", endDate: "2025-03-12", days: 4, status: "approved" },
  { id: "l3", employeeId: "1", employeeName: "James Wilson", leaveType: "Vacation", startDate: "2025-03-17", endDate: "2025-03-21", days: 5, status: "pending" },
  { id: "l4", employeeId: "7", employeeName: "Emily Zhang", leaveType: "Sick Leave", startDate: "2025-03-03", endDate: "2025-03-03", days: 1, status: "approved" },
  { id: "l5", employeeId: "2", employeeName: "Sarah Mitchell", leaveType: "Vacation", startDate: "2025-04-01", endDate: "2025-04-05", days: 5, status: "pending" },
  { id: "l6", employeeId: "8", employeeName: "David Kim", leaveType: "Personal Leave", startDate: "2025-02-20", endDate: "2025-02-20", days: 1, status: "rejected" },
  { id: "l7", employeeId: "3", employeeName: "Laura Chen", leaveType: "Vacation", startDate: "2025-03-24", endDate: "2025-03-28", days: 5, status: "pending" },
]

const deptColors: Record<string, string> = {
  Engineering: "bg-blue-100 text-blue-700",
  Sales: "bg-green-100 text-green-700",
  Marketing: "bg-purple-100 text-purple-700",
  Finance: "bg-amber-100 text-amber-700",
  HR: "bg-pink-100 text-pink-700",
  Operations: "bg-cyan-100 text-cyan-700",
}

const emptyEmployeeForm = {
  name: "",
  email: "",
  phone: "",
  department: "Engineering",
  position: "",
  salary: "",
  startDate: "",
  status: "active",
}

export default function HRPage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const { orgId } = useRBAC()

  // ── Data from normalized DB table ────────────────────────
  const { data: employees, loading, insert, update, remove } = useTableData<Employee>("employees")

  const [search, setSearch] = useState("")
  const mainTabs = [
    t("hr.employeeDirectory"),
    t("hr.departments"),
    t("hr.attendance"),
    t("hr.leaveManagement"),
  ]
  const [activeTab, setActiveTab] = useState<string>(t("hr.employeeDirectory"))
  const [showDialog, setShowDialog] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [form, setForm] = useState(emptyEmployeeForm)
  const [attendanceDate, setAttendanceDate] = useState("2025-03-09")

  // KPI calculations
  const totalEmployees = employees.length
  const activeEmployees = employees.filter((e) => e.status === "active").length
  const deptCount = new Set(employees.map((e) => e.department)).size
  const avgSalary = employees.length > 0 ? employees.reduce((sum, e) => sum + e.salary, 0) / employees.length : 0

  // Compute department counts
  const deptCounts = employees.reduce((acc, e) => {
    acc[e.department] = (acc[e.department] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Filter employees
  const filteredEmployees = employees.filter((e) => {
    const q = search.toLowerCase()
    return (
      e.name.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q) ||
      e.position.toLowerCase().includes(q)
    )
  })

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const openAddDialog = () => {
    setEditingEmployee(null)
    setForm(emptyEmployeeForm)
    setShowDialog(true)
  }

  const openEditDialog = (employee: Employee) => {
    setEditingEmployee(employee)
    setForm({
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      department: employee.department,
      position: employee.position,
      salary: employee.salary.toString(),
      startDate: employee.startDate || "",
      status: employee.status,
    })
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.email || !form.position) return

    const record = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      department: form.department,
      position: form.position,
      salary: parseFloat(form.salary) || 0,
      startDate: form.startDate || new Date().toISOString().split("T")[0],
      status: form.status as Employee["status"],
    }

    if (editingEmployee) {
      await update(editingEmployee.id, record)
      if (user?.id && orgId) {
        logAction({
          action: "employee.updated",
          module: "hr",
          description: `Updated employee: ${form.name}`,
          metadata: { employeeId: editingEmployee.id, name: form.name },
          userId: user.id,
          orgId,
        })
      }
    } else {
      await insert(record)
      if (user?.id && orgId) {
        logAction({
          action: "employee.created",
          module: "hr",
          description: `Added new employee: ${form.name}`,
          metadata: { name: form.name, department: form.department },
          userId: user.id,
          orgId,
        })
      }
    }
    setShowDialog(false)
    setEditingEmployee(null)
  }

  const handleDelete = async (employee: Employee) => {
    if (!confirm(`Are you sure you want to delete "${employee.name}"?`)) return
    await remove(employee.id)
    if (user?.id && orgId) {
      logAction({
        action: "employee.deleted",
        module: "hr",
        description: `Deleted employee: ${employee.name}`,
        metadata: { employeeId: employee.id, name: employee.name },
        userId: user.id,
        orgId,
      })
    }
  }

  const attendanceStatusColor = (status: string) => {
    switch (status) {
      case "present": return "bg-green-100 text-green-700"
      case "late": return "bg-yellow-100 text-yellow-700"
      case "absent": return "bg-red-100 text-red-700"
      default: return "bg-gray-100 text-gray-700"
    }
  }

  const leaveStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-700"
      case "pending": return "bg-yellow-100 text-yellow-700"
      case "rejected": return "bg-red-100 text-red-700"
      default: return "bg-gray-100 text-gray-700"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <PageGuard permission={PERMISSIONS.HR_VIEW}>
    <div className="space-y-6">
      <PageHeader
        title={t("hr.title")}
        subtitle={t("hr.subtitle")}
        action={{ label: t("hr.addEmployee"), onClick: openAddDialog }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title={t("hr.totalEmployees")} value={totalEmployees.toString()} icon={Users} subtitle="All team members" />
        <KpiCard title={t("hr.activeEmployees")} value={activeEmployees.toString()} icon={UserCheck} subtitle="Currently working" />
        <KpiCard title={t("hr.departments")} value={deptCount.toString()} icon={Building2} subtitle="Active departments" />
        <KpiCard title={t("hr.avgSalary")} value={formatCurrency(avgSalary)} icon={DollarSign} subtitle="Per employee" />
      </div>

      {/* Main Tabs */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 w-fit">
            {mainTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Employee Directory Tab */}
        {activeTab === t("hr.employeeDirectory") && (
          <>
            <div className="p-6 border-b border-gray-100">
              <div className="sm:w-96">
                <SearchInput
                  placeholder={t("common.search")}
                  value={search}
                  onChange={setSearch}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Salary</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                            {getInitials(employee.name)}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{employee.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{employee.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${deptColors[employee.department] || "bg-gray-100 text-gray-700"}`}>
                          {employee.department}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{employee.position}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">{formatCurrency(employee.salary)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{employee.startDate ? formatDate(employee.startDate) : "—"}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${getStatusColor(employee.status)}`}>
                          {employee.status.replace("-", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditDialog(employee)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(employee)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center">
                        <p className="text-sm text-gray-500">
                          {employees.length === 0
                            ? "No employees yet. Click \"Add Employee\" to get started."
                            : "No employees found matching your search."}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Showing {filteredEmployees.length} of {employees.length} employees
              </p>
            </div>
          </>
        )}

        {/* Departments Tab */}
        {activeTab === t("hr.departments") && (
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map((dept) => (
                <div key={dept.name} className="rounded-xl border border-gray-200 p-5 hover:border-indigo-200 hover:shadow-sm transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                      <Building2 className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{dept.name}</h3>
                      <p className="text-xs text-gray-500">Manager: {dept.manager}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-500">Employees</span>
                    <span className="text-lg font-bold text-gray-900">{deptCounts[dept.name] || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attendance Tab */}
        {activeTab === t("hr.attendance") && (
          <>
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <span className="text-sm text-gray-500">
                  Showing attendance for {formatDate(attendanceDate)}
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {initialAttendance.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                            {getInitials(record.employeeName)}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{record.employeeName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{record.checkIn || "-"}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{record.checkOut || "-"}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${attendanceStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                        {record.hours > 0 ? `${record.hours.toFixed(1)}h` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Leave Management Tab */}
        {activeTab === t("hr.leaveManagement") && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {initialLeaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                          {getInitials(leave.employeeName)}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{leave.employeeName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{leave.leaveType}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(leave.startDate)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(leave.endDate)}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">{leave.days}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${leaveStatusColor(leave.status)}`}>
                        {leave.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Employee Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingEmployee ? "Edit Employee" : "Add New Employee"}
              </h3>
              <button
                onClick={() => { setShowDialog(false); setEditingEmployee(null) }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="email@company.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="(555) 000-0000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                  >
                    {departments.map((dept) => (
                      <option key={dept.name} value={dept.name}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                <input
                  type="text"
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter position"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary ($)</label>
                  <input
                    type="number"
                    value={form.salary}
                    onChange={(e) => setForm({ ...form, salary: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  <option value="active">Active</option>
                  <option value="on-leave">On Leave</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => { setShowDialog(false); setEditingEmployee(null) }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
              >
                <Plus className="h-4 w-4" />
                {editingEmployee ? "Update Employee" : "Add Employee"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </PageGuard>
  )
}
