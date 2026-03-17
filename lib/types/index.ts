export interface Product {
  id: string
  sku: string
  name: string
  category: string
  description: string
  price: number
  cost: number
  stock: number
  minStock: number
  supplier: string
  status: "active" | "inactive"
  createdAt: string
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
  rating: number
  createdAt: string
}

export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  address: string
  company: string
  totalOrders: number
  totalSpent: number
  segment: string
  status: "active" | "inactive"
  createdAt: string
}

export interface Sale {
  id: string
  date: string
  customer: string
  customerId: string
  items: SaleItem[]
  subtotal: number
  tax: number
  total: number
  payment: "cash" | "card" | "transfer" | "check"
  status: "completed" | "pending" | "cancelled" | "refunded"
}

export interface SaleItem {
  productId: string
  productName: string
  quantity: number
  price: number
  total: number
}

export interface PurchaseOrder {
  id: string
  date: string
  supplier: string
  supplierId: string
  items: PurchaseItem[]
  subtotal: number
  tax: number
  total: number
  status: "pending" | "approved" | "received" | "cancelled"
  expectedDate: string
  receivedDate?: string
}

export interface PurchaseItem {
  productId: string
  productName: string
  quantity: number
  cost: number
  total: number
}

export interface Invoice {
  id: string
  number: string
  date: string
  dueDate: string
  customer: string
  customerId: string
  items: InvoiceItem[]
  subtotal: number
  tax: number
  total: number
  amountPaid: number
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
  notes: string
}

export interface InvoiceItem {
  description: string
  quantity: number
  price: number
  total: number
}

export interface Expense {
  id: string
  date: string
  category: string
  description: string
  amount: number
  vendor: string
  status: "pending" | "approved" | "rejected"
}

export interface User {
  id: string
  name: string
  email: string
  role: "admin" | "manager" | "employee" | "viewer"
  department: string
  status: "active" | "inactive"
  lastLogin: string
  avatar?: string
}

export interface CompanySettings {
  name: string
  address: string
  phone: string
  email: string
  website: string
  currency: string
  taxRate: number
  dateFormat: string
  logo?: string
}

export interface InventoryItem extends Product {
  warehouse: string
  lastRestocked: string
}

