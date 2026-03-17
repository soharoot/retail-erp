-- ═══════════════════════════════════════════════════════════════
-- 007_core_business_tables.sql — Core ERP Business Tables
-- Creates normalized relational tables for core business data.
-- Tables: products, inventory, suppliers, customers, sales,
--         sale_items, purchase_orders, purchase_items,
--         supplier_debts, debt_payments, expenses, org_settings
-- ═══════════════════════════════════════════════════════════════

-- Ensure set_updated_at function exists
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────
-- 1. Products
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sku         TEXT,
  category    TEXT NOT NULL DEFAULT 'General',
  description TEXT DEFAULT '',
  price       NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  cost        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_unique_name
  ON public.products(org_id, name) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_org
  ON public.products(org_id) WHERE deleted_at IS NULL;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'products_select') THEN
    CREATE POLICY "products_select" ON public.products FOR SELECT USING (org_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'products_insert') THEN
    CREATE POLICY "products_insert" ON public.products FOR INSERT WITH CHECK (org_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'products_update') THEN
    CREATE POLICY "products_update" ON public.products FOR UPDATE USING (org_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'products_delete') THEN
    CREATE POLICY "products_delete" ON public.products FOR DELETE USING (org_id = public.user_org_id());
  END IF;
END $$;

DROP TRIGGER IF EXISTS products_set_updated_at ON public.products;
CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 2. Inventory
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.inventory (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_stock   INTEGER NOT NULL DEFAULT 10,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_org
  ON public.inventory(org_id);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory' AND policyname = 'inventory_select') THEN
    CREATE POLICY "inventory_select" ON public.inventory FOR SELECT USING (org_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory' AND policyname = 'inventory_insert') THEN
    CREATE POLICY "inventory_insert" ON public.inventory FOR INSERT WITH CHECK (org_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory' AND policyname = 'inventory_update') THEN
    CREATE POLICY "inventory_update" ON public.inventory FOR UPDATE USING (org_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory' AND policyname = 'inventory_delete') THEN
    CREATE POLICY "inventory_delete" ON public.inventory FOR DELETE USING (org_id = public.user_org_id());
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 3. Suppliers
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.suppliers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  contact_person  TEXT DEFAULT '',
  email           TEXT DEFAULT '',
  phone           TEXT DEFAULT '',
  address         TEXT DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_org
  ON public.suppliers(org_id) WHERE deleted_at IS NULL;

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'suppliers' AND policyname = 'suppliers_select') THEN
    CREATE POLICY "suppliers_select" ON public.suppliers FOR SELECT USING (org_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'suppliers' AND policyname = 'suppliers_insert') THEN
    CREATE POLICY "suppliers_insert" ON public.suppliers FOR INSERT WITH CHECK (org_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'suppliers' AND policyname = 'suppliers_update') THEN
    CREATE POLICY "suppliers_update" ON public.suppliers FOR UPDATE USING (org_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'suppliers' AND policyname = 'suppliers_delete') THEN
    CREATE POLICY "suppliers_delete" ON public.suppliers FOR DELETE USING (org_id = public.user_org_id());
  END IF;
END $$;

DROP TRIGGER IF EXISTS suppliers_set_updated_at ON public.suppliers;
CREATE TRIGGER suppliers_set_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 4. Customers
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.customers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT DEFAULT '',
  phone       TEXT DEFAULT '',
  company     TEXT DEFAULT '',
  address     TEXT DEFAULT '',
  segment     TEXT NOT NULL DEFAULT 'Regular' CHECK (segment IN ('VIP','Regular','New')),
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_org
  ON public.customers(org_id) WHERE deleted_at IS NULL;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'customers_select') THEN
    CREATE POLICY "customers_select" ON public.customers FOR SELECT USING (org_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'customers_insert') THEN
    CREATE POLICY "customers_insert" ON public.customers FOR INSERT WITH CHECK (org_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'customers_update') THEN
    CREATE POLICY "customers_update" ON public.customers FOR UPDATE USING (org_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'customers_delete') THEN
    CREATE POLICY "customers_delete" ON public.customers FOR DELETE USING (org_id = public.user_org_id());
  END IF;
END $$;

DROP TRIGGER IF EXISTS customers_set_updated_at ON public.customers;
CREATE TRIGGER customers_set_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 5. Sales
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sale_number     TEXT NOT NULL,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_id     UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name   TEXT NOT NULL DEFAULT 'Walk-in',
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax             NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method  TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash','card','transfer','check')),
  status          TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','pending','cancelled','refunded')),
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_org_date
  ON public.sales(org_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_org_status
  ON public.sales(org_id, status);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sales' AND policyname = 'sales_select') THEN
    CREATE POLICY "sales_select" ON public.sales FOR SELECT USING (org_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sales' AND policyname = 'sales_insert') THEN
    CREATE POLICY "sales_insert" ON public.sales FOR INSERT WITH CHECK (org_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sales' AND policyname = 'sales_update') THEN
    CREATE POLICY "sales_update" ON public.sales FOR UPDATE USING (org_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sales' AND policyname = 'sales_delete') THEN
    CREATE POLICY "sales_delete" ON public.sales FOR DELETE USING (org_id = public.user_org_id());
  END IF;
END $$;

DROP TRIGGER IF EXISTS sales_set_updated_at ON public.sales;
CREATE TRIGGER sales_set_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 6. Sale Items
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sale_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id       UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name  TEXT NOT NULL,
  quantity      INTEGER NOT NULL CHECK (quantity > 0),
  unit_price    NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  cost_at_sale  NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total    NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale
  ON public.sale_items(sale_id);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sale_items' AND policyname = 'sale_items_select') THEN
    CREATE POLICY "sale_items_select" ON public.sale_items FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND s.org_id = public.user_org_id())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sale_items' AND policyname = 'sale_items_insert') THEN
    CREATE POLICY "sale_items_insert" ON public.sale_items FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND s.org_id = public.user_org_id())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sale_items' AND policyname = 'sale_items_update') THEN
    CREATE POLICY "sale_items_update" ON public.sale_items FOR UPDATE USING (
      EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND s.org_id = public.user_org_id())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sale_items' AND policyname = 'sale_items_delete') THEN
    CREATE POLICY "sale_items_delete" ON public.sale_items FOR DELETE USING (
      EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND s.org_id = public.user_org_id())
    );
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 7. Purchase Orders
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  po_number       TEXT NOT NULL,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier_id     UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name   TEXT NOT NULL,
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax             NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','received','cancelled')),
  expected_date   DATE,
  received_date   DATE,
  amount_paid     NUMERIC(12,2) NOT NULL DEFAULT 0,
  remaining_debt  NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_org
  ON public.purchase_orders(org_id, date DESC);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_orders' AND policyname = 'purchase_orders_select') THEN
    CREATE POLICY "purchase_orders_select" ON public.purchase_orders FOR SELECT USING (org_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_orders' AND policyname = 'purchase_orders_insert') THEN
    CREATE POLICY "purchase_orders_insert" ON public.purchase_orders FOR INSERT WITH CHECK (org_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_orders' AND policyname = 'purchase_orders_update') THEN
    CREATE POLICY "purchase_orders_update" ON public.purchase_orders FOR UPDATE USING (org_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_orders' AND policyname = 'purchase_orders_delete') THEN
    CREATE POLICY "purchase_orders_delete" ON public.purchase_orders FOR DELETE USING (org_id = public.user_org_id());
  END IF;
END $$;

DROP TRIGGER IF EXISTS purchase_orders_set_updated_at ON public.purchase_orders;
CREATE TRIGGER purchase_orders_set_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 8. Purchase Items
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.purchase_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id        UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name      TEXT NOT NULL,
  quantity          INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost         NUMERIC(12,2) NOT NULL CHECK (unit_cost >= 0),
  line_total        NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_po
  ON public.purchase_items(purchase_order_id);

ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_items' AND policyname = 'purchase_items_select') THEN
    CREATE POLICY "purchase_items_select" ON public.purchase_items FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.purchase_orders po WHERE po.id = purchase_order_id AND po.org_id = public.user_org_id())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_items' AND policyname = 'purchase_items_insert') THEN
    CREATE POLICY "purchase_items_insert" ON public.purchase_items FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM public.purchase_orders po WHERE po.id = purchase_order_id AND po.org_id = public.user_org_id())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_items' AND policyname = 'purchase_items_update') THEN
    CREATE POLICY "purchase_items_update" ON public.purchase_items FOR UPDATE USING (
      EXISTS (SELECT 1 FROM public.purchase_orders po WHERE po.id = purchase_order_id AND po.org_id = public.user_org_id())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_items' AND policyname = 'purchase_items_delete') THEN
    CREATE POLICY "purchase_items_delete" ON public.purchase_items FOR DELETE USING (
      EXISTS (SELECT 1 FROM public.purchase_orders po WHERE po.id = purchase_order_id AND po.org_id = public.user_org_id())
    );
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 9. Supplier Debts
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.supplier_debts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  supplier_id       UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name     TEXT NOT NULL,
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  total_amount      NUMERIC(12,2) NOT NULL,
  amount_paid       NUMERIC(12,2) NOT NULL DEFAULT 0,
  remaining_debt    NUMERIC(12,2) NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'outstanding' CHECK (status IN ('outstanding','partial','paid')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_debts_org
  ON public.supplier_debts(org_id, status);

ALTER TABLE public.supplier_debts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'supplier_debts' AND policyname = 'supplier_debts_select') THEN
    CREATE POLICY "supplier_debts_select" ON public.supplier_debts FOR SELECT USING (org_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'supplier_debts' AND policyname = 'supplier_debts_insert') THEN
    CREATE POLICY "supplier_debts_insert" ON public.supplier_debts FOR INSERT WITH CHECK (org_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'supplier_debts' AND policyname = 'supplier_debts_update') THEN
    CREATE POLICY "supplier_debts_update" ON public.supplier_debts FOR UPDATE USING (org_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'supplier_debts' AND policyname = 'supplier_debts_delete') THEN
    CREATE POLICY "supplier_debts_delete" ON public.supplier_debts FOR DELETE USING (org_id = public.user_org_id());
  END IF;
END $$;

DROP TRIGGER IF EXISTS supplier_debts_set_updated_at ON public.supplier_debts;
CREATE TRIGGER supplier_debts_set_updated_at
  BEFORE UPDATE ON public.supplier_debts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 10. Debt Payments
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.debt_payments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id     UUID NOT NULL REFERENCES public.supplier_debts(id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  note        TEXT DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_debt_payments_debt
  ON public.debt_payments(debt_id);

ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'debt_payments' AND policyname = 'debt_payments_select') THEN
    CREATE POLICY "debt_payments_select" ON public.debt_payments FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.supplier_debts sd WHERE sd.id = debt_id AND sd.org_id = public.user_org_id())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'debt_payments' AND policyname = 'debt_payments_insert') THEN
    CREATE POLICY "debt_payments_insert" ON public.debt_payments FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM public.supplier_debts sd WHERE sd.id = debt_id AND sd.org_id = public.user_org_id())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'debt_payments' AND policyname = 'debt_payments_delete') THEN
    CREATE POLICY "debt_payments_delete" ON public.debt_payments FOR DELETE USING (
      EXISTS (SELECT 1 FROM public.supplier_debts sd WHERE sd.id = debt_id AND sd.org_id = public.user_org_id())
    );
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 11. Expenses
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  category    TEXT DEFAULT '',
  description TEXT DEFAULT '',
  amount      NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  vendor      TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_org
  ON public.expenses(org_id);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expenses' AND policyname = 'expenses_select') THEN
    CREATE POLICY "expenses_select" ON public.expenses FOR SELECT USING (org_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expenses' AND policyname = 'expenses_insert') THEN
    CREATE POLICY "expenses_insert" ON public.expenses FOR INSERT WITH CHECK (org_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expenses' AND policyname = 'expenses_update') THEN
    CREATE POLICY "expenses_update" ON public.expenses FOR UPDATE USING (org_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expenses' AND policyname = 'expenses_delete') THEN
    CREATE POLICY "expenses_delete" ON public.expenses FOR DELETE USING (org_id = public.user_org_id());
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 12. Organization Settings
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.org_settings (
  org_id              UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_name        TEXT NOT NULL DEFAULT 'My Company',
  address             TEXT DEFAULT '',
  phone               TEXT DEFAULT '',
  email               TEXT DEFAULT '',
  website             TEXT DEFAULT '',
  tax_id              TEXT DEFAULT '',
  currency            TEXT NOT NULL DEFAULT 'USD',
  tax_rate            NUMERIC(5,2) NOT NULL DEFAULT 0,
  date_format         TEXT NOT NULL DEFAULT 'MM/DD/YYYY',
  timezone            TEXT NOT NULL DEFAULT 'UTC',
  language            TEXT NOT NULL DEFAULT 'en',
  invoice_prefix      TEXT NOT NULL DEFAULT 'INV',
  po_prefix           TEXT NOT NULL DEFAULT 'PO',
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  low_stock_alerts    BOOLEAN NOT NULL DEFAULT true,
  order_notifications BOOLEAN NOT NULL DEFAULT true,
  report_emails       BOOLEAN NOT NULL DEFAULT false,
  auto_backup         BOOLEAN NOT NULL DEFAULT false,
  two_factor          BOOLEAN NOT NULL DEFAULT false,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.org_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'org_settings' AND policyname = 'org_settings_select') THEN
    CREATE POLICY "org_settings_select" ON public.org_settings FOR SELECT USING (org_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'org_settings' AND policyname = 'org_settings_insert') THEN
    CREATE POLICY "org_settings_insert" ON public.org_settings FOR INSERT WITH CHECK (org_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'org_settings' AND policyname = 'org_settings_update') THEN
    CREATE POLICY "org_settings_update" ON public.org_settings FOR UPDATE USING (org_id = public.user_org_id());
  END IF;
END $$;

DROP TRIGGER IF EXISTS org_settings_set_updated_at ON public.org_settings;
CREATE TRIGGER org_settings_set_updated_at
  BEFORE UPDATE ON public.org_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 13. Auto-create settings row for new organizations
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_org_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.org_settings (org_id)
  VALUES (NEW.id)
  ON CONFLICT (org_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS org_create_settings ON public.organizations;
CREATE TRIGGER org_create_settings
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.create_org_settings();

-- Create settings for existing organizations that don't have one
INSERT INTO public.org_settings (org_id)
SELECT id FROM public.organizations
WHERE id NOT IN (SELECT org_id FROM public.org_settings)
ON CONFLICT (org_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 14. Auto-create inventory entry when product is created
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_product_inventory()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.inventory (org_id, product_id, stock, min_stock)
  VALUES (NEW.org_id, NEW.id, 0, 10)
  ON CONFLICT (org_id, product_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS product_create_inventory ON public.products;
CREATE TRIGGER product_create_inventory
  AFTER INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.create_product_inventory();
