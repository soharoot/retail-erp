// ============================================================
// Validation partagée pour tous les modules ERP
// Messages d'erreur en français
// ============================================================

export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
  warnings: string[]
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^[+]?[\d\s()-]{7,20}$/
const MAX_PRICE = 10_000_000

// ── Product Validation ──────────────────────────────────────

export function validateProduct(
  form: { name: string; category?: string; categoryId?: string; price: string | number; cost?: string | number },
  existingNames: string[] = [],
  editingId?: string
): ValidationResult {
  const errors: Record<string, string> = {}
  const warnings: string[] = []

  const name = (form.name ?? "").trim()
  if (!name) {
    errors.name = "Le nom du produit est requis"
  } else if (existingNames.some((n) => n.toLowerCase() === name.toLowerCase())) {
    errors.name = "Un produit avec ce nom existe déjà"
  }

  if (!form.categoryId && !form.category) {
    errors.category = "La catégorie est requise"
  }

  const price = typeof form.price === "string" ? parseFloat(form.price) : form.price
  if (isNaN(price) || price < 0) {
    errors.price = "Le prix doit être supérieur ou égal à 0"
  } else if (price > MAX_PRICE) {
    errors.price = `Le prix ne peut pas dépasser ${MAX_PRICE.toLocaleString("fr-FR")}`
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
    errors.name = "Le nom du client est requis"
  }

  if (form.email && !EMAIL_REGEX.test(form.email)) {
    errors.email = "Format d'email invalide"
  }

  if (form.phone && !PHONE_REGEX.test(form.phone)) {
    errors.phone = "Format de numéro de téléphone invalide"
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
    errors.name = "Le nom du fournisseur est requis"
  } else if (existingNames.some((n) => n.toLowerCase() === name.toLowerCase())) {
    errors.name = "Un fournisseur avec ce nom existe déjà"
  }

  if (form.email && !EMAIL_REGEX.test(form.email)) {
    errors.email = "Format d'email invalide"
  }

  if (form.phone && !PHONE_REGEX.test(form.phone)) {
    errors.phone = "Format de numéro de téléphone invalide"
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
    errors.customer = "Le client est requis"
  }

  if (!form.items || form.items.length === 0) {
    errors.items = "Au moins un article est requis"
  } else {
    const hasValidItem = form.items.some((item) => {
      const qty = typeof item.quantity === "string" ? parseInt(item.quantity) : item.quantity
      const price = typeof item.unitPrice === "string" ? parseFloat(item.unitPrice) : item.unitPrice
      return item.productId && qty > 0 && price > 0
    })
    if (!hasValidItem) {
      errors.items = "Au moins un article doit avoir un produit, une quantité > 0 et un prix > 0"
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
    errors.supplier = "Le fournisseur est requis"
  }

  if (!form.items || form.items.length === 0) {
    errors.items = "Au moins un article est requis"
  } else {
    for (const item of form.items) {
      const qty = typeof item.quantity === "string" ? parseInt(item.quantity) : item.quantity
      if (item.productId && (isNaN(qty) || qty <= 0)) {
        errors.items = "La quantité doit être supérieure à 0"
        break
      }
      const cost = typeof item.unitCost === "string" ? parseFloat(item.unitCost) : item.unitCost
      if (item.productId && (isNaN(cost) || cost <= 0)) {
        errors.items = "Le coût unitaire doit être supérieur à 0"
        break
      }
    }

    if (!errors.items) {
      const hasValidItem = form.items.some((item) => {
        const qty = typeof item.quantity === "string" ? parseInt(item.quantity) : item.quantity
        const cost = typeof item.unitCost === "string" ? parseFloat(item.unitCost) : item.unitCost
        return qty > 0 && cost > 0
      })
      if (!hasValidItem) {
        errors.items = "Au moins un article doit avoir une quantité > 0 et un coût > 0"
      }
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
    errors.amount = "Le montant du paiement doit être supérieur à 0"
  } else if (amount > form.maxAmount) {
    errors.amount = `Le paiement ne peut pas dépasser le solde restant de ${form.maxAmount.toFixed(2)}`
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
    errors.adjustment = "L'ajustement ne peut pas être 0"
  }

  if (adjustment < 0 && Math.abs(adjustment) > currentStock) {
    errors.adjustment = `Impossible de retirer ${Math.abs(adjustment)} unités — seulement ${currentStock} disponibles`
  }

  return { valid: Object.keys(errors).length === 0, errors, warnings: [] }
}
