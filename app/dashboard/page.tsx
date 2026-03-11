"use client"

import { useState } from "react"
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  AlertCircle,
  ShoppingCart,
  Package,
  FileText,
  BarChart3,
  ArrowUpRight,
  AlertTriangle,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts"
import { KpiCard } from "@/components/shared/kpi-card"
import { StatusBadge } from "@/components/shared/status-badge"

const revenueExpensesData = [
  { month: "Sep", revenue: 12500, expenses: 8200 },
  { month: "Oct", revenue: 14800, expenses: 9100 },
  { month: "Nov", revenue: 13200, expenses: 8800 },
  { month: "Dec", revenue: 18500, expenses: 11200 },
  { month: "Jan", revenue: 16200, expenses: 9800 },
  { month: "Feb", revenue: 17600, expenses: 10400 },
  { month: "Mar", revenue: 19800, expenses: 10900 },
]

const salesTrendData = [
  { month: "Oct", sales: 42, orders: 38 },
  { month: "Nov", sales: 38, orders: 35 },
  { month: "Dec", sales: 56, orders: 48 },
  { month: "Jan", sales: 47, orders: 42 },
  { month: "Feb", sales: 51, orders: 45 },
  { month: "Mar", sales: 58, orders: 52 },
]

const recentTransactions = [
  { id: "TXN-001", customer: "John Smith", amount: "$1,250.00", date: "Mar 8, 2026", status: "completed" },
  { id: "TXN-002", customer: "Sarah Johnson", amount: "$890.50", date: "Mar 7, 2026", status: "completed" },
  { id: "TXN-003", customer: "Mike Williams", amount: "$2,340.00", date: "Mar 7, 2026", status: "pending" },
  { id: "TXN-004", customer: "Emily Davis", amount: "$675.00", date: "Mar 6, 2026", status: "completed" },
  { id: "TXN-005", customer: "Robert Brown", amount: "$1,120.75", date: "Mar 6, 2026", status: "pending" },
]

const lowStockItems = [
  { name: "Wireless Mouse", sku: "WM-001", stock: 5, reorderLevel: 20 },
  { name: "USB-C Cable", sku: "UC-012", stock: 8, reorderLevel: 25 },
  { name: "Screen Protector", sku: "SP-045", stock: 12, reorderLevel: 30 },
  { name: "Phone Case", sku: "PC-089", stock: 3, reorderLevel: 15 },
  { name: "Earbuds", sku: "EB-023", stock: 15, reorderLevel: 20 },
]

const quickActions = [
  { label: "New Sale", icon: ShoppingCart, href: "/sales", color: "bg-indigo-600 hover:bg-indigo-700" },
  { label: "Add Product", icon: Package, href: "/products", color: "bg-emerald-600 hover:bg-emerald-700" },
  { label: "Create Invoice", icon: FileText, href: "/invoicing", color: "bg-amber-600 hover:bg-amber-700" },
  { label: "View Reports", icon: BarChart3, href: "/reports", color: "bg-violet-600 hover:bg-violet-700" },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Welcome back! Here&apos;s your business overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Revenue"
          value="$19,800"
          change={{ value: "12.5%", positive: true }}
          subtitle="from last month"
          icon={DollarSign}
        />
        <KpiCard
          title="Net Profit"
          value="$8,900"
          subtitle="Profit margin: 44.9%"
          icon={TrendingUp}
        />
        <KpiCard
          title="Total Expenses"
          value="$10,900"
          change={{ value: "5.2%", positive: false }}
          subtitle="from last month"
          icon={CreditCard}
        />
        <KpiCard
          title="Outstanding Debt"
          value="$77,000"
          subtitle="$8,500 overdue"
          icon={AlertCircle}
        />
      </div>

      {/* Revenue vs Expenses Chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Revenue vs Expenses</h2>
            <p className="text-sm text-gray-500">Monthly comparison for the last 7 months</p>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueExpensesData} barGap={8}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6b7280" }} />
              <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value) => [`$${Number(value).toLocaleString()}`, undefined]}
                contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
              />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Transactions & Low Stock */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Transactions */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
            <a href="/sales" className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700">
              View all <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-3 text-left text-xs font-medium uppercase text-gray-500">ID</th>
                  <th className="pb-3 text-left text-xs font-medium uppercase text-gray-500">Customer</th>
                  <th className="pb-3 text-right text-xs font-medium uppercase text-gray-500">Amount</th>
                  <th className="pb-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                  <th className="pb-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="py-3 text-sm font-medium text-gray-900">{tx.id}</td>
                    <td className="py-3 text-sm text-gray-600">{tx.customer}</td>
                    <td className="py-3 text-right text-sm font-medium text-gray-900">{tx.amount}</td>
                    <td className="py-3 text-sm text-gray-500">{tx.date}</td>
                    <td className="py-3">
                      <StatusBadge status={tx.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-semibold text-gray-900">Low Stock Alerts</h2>
            </div>
            <a href="/inventory" className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700">
              View all <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
          <div className="space-y-3">
            {lowStockItems.map((item) => (
              <div key={item.sku} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${item.stock <= 5 ? "text-red-600" : "text-amber-600"}`}>
                    {item.stock} left
                  </p>
                  <p className="text-xs text-gray-400">Reorder at {item.reorderLevel}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sales Trend */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Sales Trend</h2>
          <p className="text-sm text-gray-500">Last 6 months performance</p>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6b7280" }} />
              <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }} />
              <Legend />
              <Line
                type="monotone"
                dataKey="sales"
                name="Sales"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 4, fill: "#6366f1" }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="orders"
                name="Orders"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ r: 4, fill: "#22c55e" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickActions.map((action) => (
            <a
              key={action.label}
              href={action.href}
              className={`flex flex-col items-center gap-2 rounded-lg p-4 text-white transition-colors ${action.color}`}
            >
              <action.icon className="h-6 w-6" />
              <span className="text-sm font-medium">{action.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
