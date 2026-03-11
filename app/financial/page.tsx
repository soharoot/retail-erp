"use client"

import { useState } from "react"
import { KpiCard } from "@/components/shared/kpi-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { DollarSign, TrendingUp, CreditCard, AlertCircle } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
} from "recharts"

const revenueData = [
  { month: "Sep", revenue: 14200, expenses: 9800 },
  { month: "Oct", revenue: 15800, expenses: 10100 },
  { month: "Nov", revenue: 18200, expenses: 11500 },
  { month: "Dec", revenue: 22100, expenses: 13800 },
  { month: "Jan", revenue: 19800, expenses: 10900 },
  { month: "Feb", revenue: 17500, expenses: 9800 },
  { month: "Mar", revenue: 21300, expenses: 11200 },
]

const cashFlowData = [
  { month: "Sep", inflow: 16000, outflow: 12000 },
  { month: "Oct", inflow: 18500, outflow: 13200 },
  { month: "Nov", inflow: 21000, outflow: 15500 },
  { month: "Dec", inflow: 25000, outflow: 18000 },
  { month: "Jan", inflow: 22000, outflow: 14500 },
  { month: "Feb", inflow: 19500, outflow: 13000 },
  { month: "Mar", inflow: 23500, outflow: 15000 },
]

const expenseCategories = [
  { name: "Cost of Goods", value: 52800, color: "#6366f1" },
  { name: "Salaries", value: 28000, color: "#22c55e" },
  { name: "Marketing", value: 8400, color: "#f59e0b" },
  { name: "Rent & Utilities", value: 6200, color: "#ef4444" },
  { name: "Software & Tools", value: 3200, color: "#06b6d4" },
  { name: "Other", value: 2300, color: "#8b5cf6" },
]

const receivables = [
  { customer: "Carol Williams", amount: 3200, dueDate: "2025-02-28", daysOverdue: 9, status: "overdue" },
  { customer: "David Lee", amount: 1800, dueDate: "2025-03-15", daysOverdue: 0, status: "pending" },
  { customer: "Eva Martinez", amount: 4500, dueDate: "2025-03-01", daysOverdue: 8, status: "overdue" },
  { customer: "Frank Wilson", amount: 950, dueDate: "2025-03-20", daysOverdue: 0, status: "pending" },
  { customer: "Henry Brown", amount: 2200, dueDate: "2025-03-10", daysOverdue: 0, status: "pending" },
]

const payables = [
  { supplier: "TechGear Wholesale", amount: 6250, dueDate: "2025-03-15", status: "pending" },
  { supplier: "SportsPro Suppliers", amount: 1600, dueDate: "2025-03-10", status: "pending" },
  { supplier: "HomeComfort Ltd", amount: 2800, dueDate: "2025-02-28", status: "overdue" },
  { supplier: "Global Electronics Co", amount: 4200, dueDate: "2025-03-20", status: "pending" },
]

export default function FinancialPage() {
  const [activeTab, setActiveTab] = useState("overview")

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "expenses", label: "Expenses" },
    { id: "receivable", label: "Accounts Receivable" },
    { id: "payable", label: "Accounts Payable" },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financial Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor business performance and financial health</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Revenue" value="$19,800" change={{ value: "12.5%", positive: true }} subtitle="from last month" icon={DollarSign} />
        <KpiCard title="Net Profit" value="$8,900" subtitle="Profit margin: 44.9%" icon={TrendingUp} />
        <KpiCard title="Total Expenses" value="$10,900" change={{ value: "5.2%", positive: false }} subtitle="from last month" icon={CreditCard} />
        <KpiCard title="Outstanding Debt" value="$77,000" subtitle="$8,500 overdue" icon={AlertCircle} />
      </div>

      {/* Revenue vs Expenses Chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Revenue vs Expenses</h3>
        <p className="text-sm text-gray-500 mb-4">Monthly comparison over the last 7 months</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Legend />
            <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* P&L Summary */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Profit & Loss Summary</h3>
            <div className="space-y-3">
              {[
                { label: "Total Revenue", value: 128900, bold: true },
                { label: "Cost of Goods Sold", value: -52800 },
                { label: "Gross Profit", value: 76100, bold: true, border: true },
                { label: "Operating Expenses", value: -19600 },
                { label: "Marketing & Advertising", value: -8400 },
                { label: "Salaries & Wages", value: -28000 },
                { label: "Rent & Utilities", value: -6200 },
                { label: "Net Income", value: 13900, bold: true, border: true },
              ].map((item, i) => (
                <div key={i} className={`flex items-center justify-between py-2 ${item.border ? "border-t-2 border-gray-300 pt-3" : ""}`}>
                  <span className={`text-sm ${item.bold ? "font-semibold text-gray-900" : "text-gray-600 pl-4"}`}>{item.label}</span>
                  <span className={`text-sm ${item.bold ? "font-semibold" : ""} ${item.value >= 0 ? "text-gray-900" : "text-red-500"}`}>
                    {item.value < 0 ? "-" : ""}{formatCurrency(Math.abs(item.value))}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Cash Flow */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">Monthly Cash Flow</h3>
            <p className="text-sm text-gray-500 mb-4">Inflow vs outflow trends</p>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Area type="monotone" dataKey="inflow" name="Cash In" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} strokeWidth={2} />
                <Area type="monotone" dataKey="outflow" name="Cash Out" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Expenses Tab */}
      {activeTab === "expenses" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expenseCategories}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {expenseCategories.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Categories</h3>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left pb-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="text-right pb-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="text-right pb-3 text-xs font-medium text-gray-500 uppercase">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expenseCategories.map((cat, i) => {
                  const total = expenseCategories.reduce((s, c) => s + c.value, 0)
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="text-sm font-medium text-gray-900">{cat.name}</span>
                        </div>
                      </td>
                      <td className="py-3 text-right text-sm text-gray-600">{formatCurrency(cat.value)}</td>
                      <td className="py-3 text-right text-sm text-gray-600">{((cat.value / total) * 100).toFixed(1)}%</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300">
                  <td className="pt-3 text-sm font-semibold text-gray-900">Total</td>
                  <td className="pt-3 text-right text-sm font-semibold text-gray-900">{formatCurrency(expenseCategories.reduce((s, c) => s + c.value, 0))}</td>
                  <td className="pt-3 text-right text-sm font-semibold text-gray-900">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Accounts Receivable Tab */}
      {activeTab === "receivable" && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Outstanding Invoices</h3>
            <p className="text-sm text-gray-500">Payments due from customers</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Days Overdue</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {receivables.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.customer}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(r.amount)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(r.dueDate)}</td>
                  <td className="px-4 py-3 text-sm">
                    {r.daysOverdue > 0 ? (
                      <span className="text-red-600 font-medium">{r.daysOverdue} days</span>
                    ) : (
                      <span className="text-green-600">On time</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50">
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">Total Outstanding</td>
                <td className="px-4 py-3 text-sm font-bold text-indigo-600">{formatCurrency(receivables.reduce((s, r) => s + r.amount, 0))}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Accounts Payable Tab */}
      {activeTab === "payable" && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Bills to Pay</h3>
            <p className="text-sm text-gray-500">Outstanding payments to suppliers</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Supplier</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payables.map((p, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.supplier}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(p.amount)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(p.dueDate)}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50">
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">Total Payable</td>
                <td className="px-4 py-3 text-sm font-bold text-red-600">{formatCurrency(payables.reduce((s, p) => s + p.amount, 0))}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
