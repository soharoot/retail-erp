// ============================================================
// Central permission constants — single source of truth.
// Must match the codes seeded in 002_rbac.sql.
// ============================================================

export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard.view",

  PRODUCTS_VIEW: "products.view",
  PRODUCTS_MANAGE: "products.manage",

  INVENTORY_VIEW: "inventory.view",
  INVENTORY_MANAGE: "inventory.manage",

  SALES_VIEW: "sales.view",
  SALES_MANAGE: "sales.manage",

  PURCHASES_VIEW: "purchases.view",
  PURCHASES_MANAGE: "purchases.manage",

  SUPPLIERS_VIEW: "suppliers.view",
  SUPPLIERS_MANAGE: "suppliers.manage",

  SUPPLIER_DEBTS_VIEW: "supplier_debts.view",
  SUPPLIER_DEBTS_MANAGE: "supplier_debts.manage",

  CUSTOMERS_VIEW: "customers.view",
  CUSTOMERS_MANAGE: "customers.manage",

  INVOICING_VIEW: "invoicing.view",
  INVOICING_MANAGE: "invoicing.manage",

  FINANCIAL_VIEW: "financial.view",
  FINANCIAL_MANAGE: "financial.manage",

  HR_VIEW: "hr.view",
  HR_MANAGE: "hr.manage",

  PROJECTS_VIEW: "projects.view",
  PROJECTS_MANAGE: "projects.manage",

  CRM_VIEW: "crm.view",
  CRM_MANAGE: "crm.manage",

  REPORTS_VIEW: "reports.view",

  SETTINGS_VIEW: "settings.view",
  SETTINGS_MANAGE: "settings.manage",

  USERS_VIEW: "users.view",
  USERS_MANAGE: "users.manage",

  ACTIVITY_VIEW: "activity.view",
} as const

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

/**
 * Maps each route path to the permission required to access it.
 */
export const ROUTE_PERMISSIONS: Record<string, PermissionCode> = {
  "/dashboard": PERMISSIONS.DASHBOARD_VIEW,
  "/products": PERMISSIONS.PRODUCTS_VIEW,
  "/inventory": PERMISSIONS.INVENTORY_VIEW,
  "/sales": PERMISSIONS.SALES_VIEW,
  "/purchases": PERMISSIONS.PURCHASES_VIEW,
  "/suppliers": PERMISSIONS.SUPPLIERS_VIEW,
  "/supplier-debts": PERMISSIONS.SUPPLIER_DEBTS_VIEW,
  "/customers": PERMISSIONS.CUSTOMERS_VIEW,
  "/invoicing": PERMISSIONS.INVOICING_VIEW,
  "/financial": PERMISSIONS.FINANCIAL_VIEW,
  "/hr": PERMISSIONS.HR_VIEW,
  "/projects": PERMISSIONS.PROJECTS_VIEW,
  "/crm": PERMISSIONS.CRM_VIEW,
  "/reports": PERMISSIONS.REPORTS_VIEW,
  "/settings": PERMISSIONS.SETTINGS_VIEW,
  "/users": PERMISSIONS.USERS_VIEW,
  "/activity": PERMISSIONS.ACTIVITY_VIEW,
}

/**
 * Same map used by the sidebar to decide which nav items to render.
 */
export const NAV_PERMISSIONS: Record<string, PermissionCode> = { ...ROUTE_PERMISSIONS }

/**
 * All modules with their human-readable labels and available actions.
 * Used by the Roles permission-grid UI.
 */
export const MODULE_DEFINITIONS = [
  { module: "dashboard",      label: "Dashboard",       actions: ["view"] },
  { module: "products",       label: "Products",        actions: ["view", "manage"] },
  { module: "inventory",      label: "Inventory",       actions: ["view", "manage"] },
  { module: "sales",          label: "Sales",           actions: ["view", "manage"] },
  { module: "purchases",      label: "Purchases",       actions: ["view", "manage"] },
  { module: "suppliers",      label: "Suppliers",       actions: ["view", "manage"] },
  { module: "supplier_debts", label: "Supplier Debts",  actions: ["view", "manage"] },
  { module: "customers",      label: "Customers",       actions: ["view", "manage"] },
  { module: "invoicing",      label: "Invoicing",       actions: ["view", "manage"] },
  { module: "financial",      label: "Financial",       actions: ["view", "manage"] },
  { module: "hr",             label: "HR",              actions: ["view", "manage"] },
  { module: "projects",       label: "Projects",        actions: ["view", "manage"] },
  { module: "crm",            label: "CRM",             actions: ["view", "manage"] },
  { module: "reports",        label: "Reports",         actions: ["view"] },
  { module: "settings",       label: "Settings",        actions: ["view", "manage"] },
  { module: "users",          label: "User Management", actions: ["view", "manage"] },
  { module: "activity",       label: "Activity Log",    actions: ["view"] },
] as const
