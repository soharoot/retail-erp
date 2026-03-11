"use client"

import { useState } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { KpiCard } from "@/components/shared/kpi-card"
import { BarChart3, TrendingUp, PieChart as PieChartIcon, FileDown, Calendar, Filter } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area } from "recharts"

const salesByMonth = [
  { month: "Sep", revenue: 12500, expenses: 8200, profit: 4300 },
  { month: "Oct", revenue: 15800, expenses: 9100, profit: 6700 },
  { month: "Nov", revenue: 18200, expenses: 10500, profit: 7700 },
  { month: "Dec", revenue: 22100, expenses: 12800, profit: 9300 },
  { month: "Jan", revenue: 19800, expenses: 10900, profit: 8900 },
  { month: "Feb", revenue: 17500, expenses: 9800, profit: 7700 },
  { month: "Mar", revenue: 21300, expenses: 11200, profit: 10100 },
]

const salesByCategory = [
  { name: "Electronics", value: 45200, color: "#6366f1" },
  { name: "Footwear", value: 28300, color: "#22c55e" },
  { name: "Appliances", value: 18900, color: "#f59e0b" },
  { name: "Sports", value: 15600, color: "#ef4444" },
  { name: "Clothing", value: 12100, color: "#06b6d4" },
  { name: "Furniture", value: 8400, color: "#8b5cf6" },
]

const topProducts = [
  { name: "Wireless Headphones", sales: 145, revenue: 18855, growth: 12.5 },
  { name: "Running Shoes", sales: 98, revenue: 8820, growth: 8.3 },
  { name: "Smart Watch", sales: 87, revenue: 17313, growth: 15.2 },
  { name: "Coffee Maker", sales: 76, revenue: 6004, growth: -3.1 },
  { name: "Yoga Mat", sales: 120, revenue: 3588, growth: 22.0 },
]

const topCustomers = [
  { name: "Alice Johnson", orders: 12, spent: 4520, lastOrder: "2025-03-01" },
  { name: "Bob Smith", orders: 8, spent: 3200, lastOrder: "2025-02-28" },
  { name: "Carol Williams", orders: 15, spent: 6800, lastOrder: "2025-03-05" },
  { name: "David Lee", orders: 6, spent: 2100, lastOrder: "2025-02-25" },
  { name: "Eva Martinez", orders: 10, spent: 5400, lastOrder: "2025-03-07" },
]

const inventoryByCategory = [
  { category: "Electronics", items: 5, totalStock: 210, lowStock: 1, value: 28500 },
  { category: "Footwear", items: 3, totalStock: 85, lowStock: 0, value: 7650 },
  { category: "Appliances", items: 4, totalStock: 120, lowStock: 2, value: 9600 },
  { category: "Sports", items: 3, totalStock: 180, lowStock: 0, value: 5400 },
  { category: "Clothing", items: 2, totalStock: 95, lowStock: 1, value: 4750 },
]

const monthlyTrend = [
  { month: "Aug", sales: 42, customers: 28 },
  { month: "Sep", sales: 55, customers: 35 },
  { month: "Oct", sales: 67, customers: 42 },
  { month: "Nov", sales: 78, customers: 48 },
  { month: "Dec", sales: 92, customers: 55 },
  { month: "Jan", sales: 85, customers: 52 },
  { month: "Feb", sales: 73, customers: 46 },
  { month: "Mar", sales: 88, customers: 58 },
]

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("sales")
  const [period, setPeriod] = useState("monthly")

  const tabs = [
    { id: "sales", label: "Sales Reports" },
    { id: "inventory", label: "Inventory Reports" },
    { id: "financial", label: "Financial Reports" },
    { id: "customers", label: "Customer Reports" },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Reports & Analytics" subtitle="Comprehensive business intelligence and reporting" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Revenue" value={formatCurrency(127200)} change={{ value: "12.5%", positive: true }} subtitle="vs last period" icon={TrendingUp} />
        <KpiCard title="Total Orders" value="487" change={{ value: "8.3%", positive: true }} subtitle="vs last period" icon={BarChart3} />
        <KpiCard title="Avg Order Value" value={formatCurrency(261)} change={{ value: "3.2%", positive: true }} subtitle="vs last period" icon={PieChartIcon} />
        <KpiCard title="Growth Rate" value="15.2%" change={{ value: "2.1%", positive: true }} subtitle="month over month" icon={TrendingUp} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-gray-200 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {tab.label}
          </button>
        ))}
        <div className="flex-1" />
        <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 mb-2">
          <FileDown className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {activeTab === "sales" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">Revenue vs Expenses</h3>
              <p className="text-sm text-gray-500 mb-4">Monthly comparison over the last 7 months</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesByMonth}>
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

            {/* Category Breakdown */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">Sales by Category</h3>
              <p className="text-sm text-gray-500 mb-4">Revenue distribution across product categories</p>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={salesByCategory} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                    {salesByCategory.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Products */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Selling Products</h3>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left pb-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="text-left pb-3 text-xs font-medium text-gray-500 uppercase">Units Sold</th>
                  <th className="text-left pb-3 text-xs font-medium text-gray-500 uppercase">Revenue</th>
                  <th className="text-left pb-3 text-xs font-medium text-gray-500 uppercase">Growth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topProducts.map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="py-3 text-sm font-medium text-gray-900">{p.name}</td>
                    <td className="py-3 text-sm text-gray-600">{p.sales}</td>
                    <td className="py-3 text-sm text-gray-600">{formatCurrency(p.revenue)}</td>
                    <td className="py-3"><span className={`text-sm font-medium ${p.growth >= 0 ? "text-green-600" : "text-red-500"}`}>{p.growth >= 0 ? "+" : ""}{p.growth}%</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "inventory" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory by Category</h3>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left pb-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="text-left pb-3 text-xs font-medium text-gray-500 uppercase">Items</th>
                  <th className="text-left pb-3 text-xs font-medium text-gray-500 uppercase">Total Stock</th>
                  <th className="text-left pb-3 text-xs font-medium text-gray-500 uppercase">Low Stock</th>
                  <th className="text-left pb-3 text-xs font-medium text-gray-500 uppercase">Stock Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {inventoryByCategory.map((cat, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="py-3 text-sm font-medium text-gray-900">{cat.category}</td>
                    <td className="py-3 text-sm text-gray-600">{cat.items}</td>
                    <td className="py-3 text-sm text-gray-600">{cat.totalStock} units</td>
                    <td className="py-3"><span className={`text-sm font-medium ${cat.lowStock > 0 ? "text-red-500" : "text-green-600"}`}>{cat.lowStock}</span></td>
                    <td className="py-3 text-sm text-gray-600">{formatCurrency(cat.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">Stock Value by Category</h3>
            <p className="text-sm text-gray-500 mb-4">Inventory value distribution</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={inventoryByCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis dataKey="category" type="category" tick={{ fontSize: 12 }} stroke="#9ca3af" width={80} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="value" name="Stock Value" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === "financial" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">Profit Trend</h3>
            <p className="text-sm text-gray-500 mb-4">Monthly profit over the last 7 months</p>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={salesByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Area type="monotone" dataKey="profit" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} strokeWidth={2} />
                <Area type="monotone" dataKey="revenue" stroke="#22c55e" fill="#22c55e" fillOpacity={0.05} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Profit & Loss Summary</h3>
            <div className="space-y-3">
              {[
                { label: "Total Revenue", value: 127200, bold: true },
                { label: "Cost of Goods Sold", value: -52800, bold: false },
                { label: "Gross Profit", value: 74400, bold: true, highlight: true },
                { label: "Operating Expenses", value: -19600, bold: false },
                { label: "Marketing & Advertising", value: -8400, bold: false },
                { label: "Salaries & Wages", value: -28000, bold: false },
                { label: "Net Income", value: 18400, bold: true, highlight: true },
              ].map((item, i) => (
                <div key={i} className={`flex items-center justify-between py-2 ${item.highlight ? "border-t-2 border-gray-300 pt-3" : ""}`}>
                  <span className={`text-sm ${item.bold ? "font-semibold text-gray-900" : "text-gray-600"}`}>{item.label}</span>
                  <span className={`text-sm ${item.bold ? "font-semibold" : ""} ${item.value >= 0 ? "text-gray-900" : "text-red-500"}`}>{formatCurrency(Math.abs(item.value))}{item.value < 0 ? " -" : ""}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "customers" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">Customer Acquisition Trend</h3>
              <p className="text-sm text-gray-500 mb-4">New customers and orders over time</p>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="sales" name="Orders" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="customers" name="New Customers" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Customers</h3>
              <div className="space-y-4">
                {topCustomers.map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold">#{i + 1}</div>
                      <div><p className="text-sm font-medium text-gray-900">{c.name}</p><p className="text-xs text-gray-500">{c.orders} orders</p></div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(c.spent)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
