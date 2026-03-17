// ============================================================
// Centralized ERP type definitions
// All ERP modules import their core types from here.
// Types match the normalized database schema (006_normalize_business_data.sql)
// DB uses snake_case; TypeScript uses camelCase.
// ============================================================

// ── Products & Inventory ────────────────────────────────────

export interface Product {
  id: string
  orgId: string
  name: string
  sku?: string
  category: string
  description: string
  price: number   // selling price
  cost: number    // purchase / cost price
  status: "active" | "inactive"
  deletedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface InventoryItem {
  id: string
  orgId: string
  productId: string
  stock: number
  minStock: number
  lastUpdated: string
  // Joined fields (from product)
  product?: Product
}

// ── Sales ────────────────────────────────────────────────────

export interface SaleItem {
  id: string
  saleId: string
  productId?: string | null
  productName: string
  quantity: number
  unitPrice: number
  costAtSale: number  // product.cost captured at time of sale for COGS
  lineTotal: number
}

export interface Sale {
  id: string
  orgId: string
  saleNumber: string
  date: string
  customerId?: string | null
  customerName: string
  subtotal: number
  tax: number
  total: number
  paymentMethod: "cash" | "card" | "transfer" | "check"
  status: "completed" | "pending" | "cancelled" | "refunded"
  createdBy?: string
  createdAt: string
  updatedAt: string
  // Nested relation
  items: SaleItem[]
}

// ── Purchases ────────────────────────────────────────────────

export interface PurchaseItem {
  id: string
  purchaseOrderId: string
  productId?: string | null
  productName: string
  quantity: number
  unitCost: number
  lineTotal: number
}

export interface PurchaseOrder {
  id: string
  orgId: string
  poNumber: string
  date: string
  supplierId?: string | null
  supplierName: string
  subtotal: number
  tax: number
  total: number
  status: "pending" | "approved" | "received" | "cancelled"
  expectedDate?: string | null
  receivedDate?: string | null
  amountPaid: number
  remainingDebt: number
  createdBy?: string
  createdAt: string
  updatedAt: string
  // Nested relation
  items: PurchaseItem[]
}

// ── Suppliers ────────────────────────────────────────────────

export interface Supplier {
  id: string
  orgId: string
  name: string
  contactPerson: string
  email: string
  phone: string
  address: string
  status: "active" | "inactive"
  deletedAt?: string | null
  createdAt: string
  updatedAt: string
}

// ── Customers ────────────────────────────────────────────────

export interface Customer {
  id: string
  orgId: string
  name: string
  email: string
  phone: string
  company: string
  address: string
  segment: "VIP" | "Regular" | "New"
  status: "active" | "inactive"
  deletedAt?: string | null
  createdAt: string
  updatedAt: string
}

// ── Supplier Debts & Payments ────────────────────────────────

export interface DebtPayment {
  id: string
  debtId: string
  amount: number
  date: string
  note: string
  createdAt: string
}

export interface SupplierDebt {
  id: string
  orgId: string
  supplierId?: string | null
  supplierName: string
  purchaseOrderId?: string | null
  totalAmount: number
  amountPaid: number
  remainingDebt: number
  status: "outstanding" | "partial" | "paid"
  createdAt: string
  updatedAt: string
  // Nested relation
  payments: DebtPayment[]
}

// ── Expenses ─────────────────────────────────────────────────

export interface Expense {
  id: string
  orgId: string
  date: string
  category: string
  description: string
  amount: number
  vendor: string
  status: "pending" | "approved" | "rejected"
  createdAt: string
}

// ── Settings ─────────────────────────────────────────────────

export interface Settings {
  orgId: string
  companyName: string
  address: string
  phone: string
  email: string
  website: string
  taxId: string
  currency: string
  taxRate: number
  dateFormat: string
  timezone: string
  language: string
  invoicePrefix: string
  poPrefix: string
  emailNotifications: boolean
  lowStockAlerts: boolean
  orderNotifications: boolean
  reportEmails: boolean
  autoBackup: boolean
  twoFactor: boolean
  updatedAt: string
}

export const defaultSettings: Settings = {
  orgId: "",
  companyName: "My Company",
  address: "",
  phone: "",
  email: "",
  website: "",
  taxId: "",
  currency: "USD",
  taxRate: 0,
  dateFormat: "MM/DD/YYYY",
  timezone: "UTC",
  language: "en",
  invoicePrefix: "INV",
  poPrefix: "PO",
  emailNotifications: true,
  lowStockAlerts: true,
  orderNotifications: true,
  reportEmails: false,
  autoBackup: false,
  twoFactor: false,
  updatedAt: "",
}

// ── User Preferences (per-user, not org-wide) ───────────────

export interface UserPreferences {
  theme: "light" | "dark" | "system"
  interfaceStyle: "default" | "compact" | "comfortable"
  dashboardLayout: "grid" | "list"
}

export const defaultUserPreferences: UserPreferences = {
  theme: "system",
  interfaceStyle: "default",
  dashboardLayout: "grid",
}

// ── Utility: DB column mapping ──────────────────────────────
// Maps camelCase TypeScript keys to snake_case DB columns

export function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
    result[snakeKey] = value
  }
  return result
}

export function toCamelCase<T = Record<string, unknown>>(obj: Record<string, unknown>): T {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
    result[camelKey] = value
  }
  return result as T
}
