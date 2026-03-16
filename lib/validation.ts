// ============================================================
// Shared form validation for all ERP modules
// ============================================================

export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
  warnings: string[]
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^[+]?[\d\s()-]{7,20}$/
const MAX_PRICE = 10_000_000

function ok(): ValidationResult {
  return { valid: true, errors: {}, warnings: [] }
}

// ── Product Validation ──────────────────────────────────────

export function validateProduct(
  form: { name: string; category: string; price: string | number; cost: string | number },
  existingNames: string[] = [],
  editingId?: string
): ValidationResult {
  const errors: Record<string, string> = {}
  const warnings: string[] = []

  const name = (form.name ?? "").trim()
  if (!name) {
    errors.name = "Product name is required"
  } else if (existingNames.some((n) => n.toLowerCase() === name.toLowerCase())) {
    errors.name = "A product with this name already exists"
  }

  if (!form.category) {
    errors.category = "Category is required"
  }

  const price = typeof form.price === "string" ? parseFloat(form.price) : form.price
  if (isNaN(price) || price < 0) {
    errors.price = "Price must be 0 or greater"
  } else if (price > MAX_PRICE) {
    errors.price = `Price cannot exceed ${MAX_PRICE.toLocaleString()}`
  }

  const cost = typeof form.cost === "string" ? parseFloat(form.cost) : form.cost
  if (isNaN(cost) || cost < 0) {
    errors.cost = "Cost must be 0 or greater"
  } else if (cost > MAX_PRICE) {
    errors.cost = `Cost cannot exceed ${MAX_PRICE.toLocaleString()}`
  }

  if (!errors.price && !errors.cost && cost > price && price > 0) {
    warnings.push("Cost price exceeds selling price — this product will have a negative margin")
  }

  return { valid: Object.keys(errors).length === 0, errors, warnings }
}

// ── Customer Validation ─────────────────────────────────────

export function validateCustomer(form: {
  name: string
  email?: string
  phone?: string
}): ValidationResult {
  const errors: Record<string, string> = {}

  if (!(form.name ?? "").trim()) {
    errors.name = "Customer name is required"
  }

  if (form.email && !EMAIL_REGEX.test(form.email)) {
    errors.email = "Invalid email format"
  }

  if (form.phone && !PHONE_REGEX.test(form.phone)) {
    errors.phone = "Invalid phone number format"
  }

  return { valid: Object.keys(errors).length === 0, errors, warnings: [] }
}

// ── Supplier Validation ─────────────────────────────────────

export function validateSupplier(
  form: { name: string; email?: string; phone?: string },
  existingNames: string[] = []
): ValidationResult {
  const errors: Record<string, string> = {}

  const name = (form.name ?? "").trim()
  if (!name) {
    errors.name = "Supplier name is required"
  } else if (existingNames.some((n) => n.toLowerCase() === name.toLowerCase())) {
    errors.name = "A supplier with this name already exists"
  }

  if (form.email && !EMAIL_REGEX.test(form.email)) {
    errors.email = "Invalid email format"
  }

  if (form.phone && !PHONE_REGEX.test(form.phone)) {
    errors.phone = "Invalid phone number format"
  }

  return { valid: Object.keys(errors).length === 0, errors, warnings: [] }
}

// ── Sale Validation ─────────────────────────────────────────

export function validateSale(form: {
  customerName: string
  items: Array<{ productId?: string; quantity: number | string; unitPrice: number | string }>
}): ValidationResult {
  const errors: Record<string, string> = {}

  if (!(form.customerName ?? "").trim()) {
    errors.customer = "Customer is required"
  }

  if (!form.items || form.items.length === 0) {
    errors.items = "At least one item is required"
  } else {
    const hasValidItem = form.items.some((item) => {
      const qty = typeof item.quantity === "string" ? parseInt(item.quantity) : item.quantity
      const price = typeof item.unitPrice === "string" ? parseFloat(item.unitPrice) : item.unitPrice
      return item.productId && qty > 0 && price > 0
    })
    if (!hasValidItem) {
      errors.items = "At least one item must have a product, quantity > 0, and price > 0"
    }
  }

  return { valid: Object.keys(errors).length === 0, errors, warnings: [] }
}

// ── Purchase Validation ─────────────────────────────────────

export function validatePurchase(form: {
  supplierId: string
  items: Array<{ productId?: string; quantity: number | string; unitCost: number | string }>
}): ValidationResult {
  const errors: Record<string, string> = {}

  if (!form.supplierId) {
    errors.supplier = "Supplier is required"
  }

  if (!form.items || form.items.length === 0) {
    errors.items = "At least one item is required"
  } else {
    const hasValidItem = form.items.some((item) => {
      const qty = typeof item.quantity === "string" ? parseInt(item.quantity) : item.quantity
      const cost = typeof item.unitCost === "string" ? parseFloat(item.unitCost) : item.unitCost
      return qty > 0 && cost > 0
    })
    if (!hasValidItem) {
      errors.items = "At least one item must have quantity > 0 and cost > 0"
    }
  }

  return { valid: Object.keys(errors).length === 0, errors, warnings: [] }
}

// ── Payment Validation ──────────────────────────────────────

export function validatePayment(form: {
  amount: number | string
  maxAmount: number
}): ValidationResult {
  const errors: Record<string, string> = {}
  const amount = typeof form.amount === "string" ? parseFloat(form.amount) : form.amount

  if (isNaN(amount) || amount <= 0) {
    errors.amount = "Payment amount must be greater than 0"
  } else if (amount > form.maxAmount) {
    errors.amount = `Payment cannot exceed remaining debt of ${form.maxAmount.toFixed(2)}`
  }

  return { valid: Object.keys(errors).length === 0, errors, warnings: [] }
}

// ── Stock Adjustment Validation ─────────────────────────────

export function validateStockAdjustment(
  adjustment: number,
  currentStock: number
): ValidationResult {
  const errors: Record<string, string> = {}

  if (adjustment === 0) {
    errors.adjustment = "Adjustment cannot be 0"
  }

  if (adjustment < 0 && Math.abs(adjustment) > currentStock) {
    errors.adjustment = `Cannot remove ${Math.abs(adjustment)} units — only ${currentStock} available`
  }

  return { valid: Object.keys(errors).length === 0, errors, warnings: [] }
}
