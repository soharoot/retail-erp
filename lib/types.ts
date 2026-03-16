// ============================================================
// Centralized ERP type definitions
// All ERP modules import their core types from here.
// ============================================================

export interface Product {
  id: string
  name: string
  category: string
  description: string
  price: number   // selling price
  cost: number    // purchase / cost price
  status: "active" | "inactive"
  createdAt: string
}

export interface InventoryItem {
  id: string
  productId: string
  productName: string
  category: string
  stock: number
  minStock: number
  lastUpdated: string
}

export interface SaleItem {
  name: string
  qty: number
  price: number
  costAtSale: number  // product.cost captured at time of sale for COGS
}

export interface Sale {
  id: string
  date: string
  customer: string
  items: SaleItem[]
  total: number
  payment: "cash" | "card" | "transfer" | "check"
  status: "completed" | "pending" | "cancelled" | "refunded"
}

export interface PurchaseItem {
  name: string
  qty: number
  cost: number
}

export interface PurchaseOrder {
  id: string
  date: string
  supplier: string
  supplierId: string
  items: PurchaseItem[]
  total: number
  status: "pending" | "received" | "cancelled"
  expectedDate: string
  amountPaid: number
  remainingDebt: number
}

export interface Supplier {
  id: string
  name: string
  contactPerson: string
  email: string
  phone: string
  address: string
  orders: number
  totalSpent: number
  status: "active" | "inactive"
}

export interface DebtPayment {
  date: string
  amount: number
}

export interface SupplierDebt {
  id: string
  supplierId: string
  supplierName: string
  purchaseId: string
  totalAmount: number
  amountPaid: number
  remainingDebt: number
  status: "outstanding" | "partial" | "paid"
  payments: DebtPayment[]
  createdAt: string
}

export interface Settings {
  companyName: string
  address: string
  phone: string
  email: string
  website: string
  taxId: string
  currency: string
  taxRate: string
  dateFormat: string
  timezone: string
  language: string
  emailNotifications: boolean
  lowStockAlerts: boolean
  orderNotifications: boolean
  reportEmails: boolean
  invoicePrefix: string
  poPrefix: string
  autoBackup: boolean
  twoFactor: boolean
}

// ── User Preferences (per-user, not org-wide) ─────────────────
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

export const defaultSettings: Settings = {
  companyName: "Retail ERP Corp",
  address: "123 Business Avenue, Suite 100",
  phone: "+1 (555) 000-1234",
  email: "contact@retailerp.com",
  website: "www.retailerp.com",
  taxId: "12-3456789",
  currency: "USD",
  taxRate: "10",
  dateFormat: "MM/DD/YYYY",
  timezone: "America/New_York",
  language: "en",
  emailNotifications: true,
  lowStockAlerts: true,
  orderNotifications: true,
  reportEmails: false,
  invoicePrefix: "INV",
  poPrefix: "PO",
  autoBackup: true,
  twoFactor: false,
}
