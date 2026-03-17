-- ═══════════════════════════════════════════════════════════════
-- 008_categories_variations.sql
-- Adds: categories, sub_categories, product_variations tables
-- Alters: products (add category_id, sub_category_id)
--         purchase_items (add variation_id)
--         sale_items (add variation_id)
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1. Categories
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, name)
);

CREATE INDEX IF NOT EXISTS idx_categories_org ON public.categories(org_id);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'categories_select') THEN
    CREATE POLICY "categories_select" ON public.categories FOR SELECT USING (org_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'categories_insert') THEN
    CREATE POLICY "categories_insert" ON public.categories FOR INSERT WITH CHECK (org_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'categories_update') THEN
    CREATE POLICY "categories_update" ON public.categories FOR UPDATE USING (org_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'categories_delete') THEN
    CREATE POLICY "categories_delete" ON public.categories FOR DELETE USING (org_id = public.user_org_id());
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 2. Sub-categories
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sub_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(category_id, name)
);

CREATE INDEX IF NOT EXISTS idx_sub_categories_org ON public.sub_categories(org_id);
CREATE INDEX IF NOT EXISTS idx_sub_categories_category ON public.sub_categories(category_id);

ALTER TABLE public.sub_categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sub_categories' AND policyname = 'sub_categories_select') THEN
    CREATE POLICY "sub_categories_select" ON public.sub_categories FOR SELECT USING (org_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sub_categories' AND policyname = 'sub_categories_insert') THEN
    CREATE POLICY "sub_categories_insert" ON public.sub_categories FOR INSERT WITH CHECK (org_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sub_categories' AND policyname = 'sub_categories_update') THEN
    CREATE POLICY "sub_categories_update" ON public.sub_categories FOR UPDATE USING (org_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sub_categories' AND policyname = 'sub_categories_delete') THEN
    CREATE POLICY "sub_categories_delete" ON public.sub_categories FOR DELETE USING (org_id = public.user_org_id());
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 3. Product Variations
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.product_variations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variation_type  TEXT NOT NULL,     -- e.g. "Taille", "Couleur", "Stockage"
  variation_value TEXT NOT NULL,     -- e.g. "S", "Noir", "128Go"
  stock           INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  sku             TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, variation_type, variation_value)
);

CREATE INDEX IF NOT EXISTS idx_product_variations_org ON public.product_variations(org_id);
CREATE INDEX IF NOT EXISTS idx_product_variations_product ON public.product_variations(product_id);

ALTER TABLE public.product_variations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_variations' AND policyname = 'product_variations_select') THEN
    CREATE POLICY "product_variations_select" ON public.product_variations FOR SELECT USING (org_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_variations' AND policyname = 'product_variations_insert') THEN
    CREATE POLICY "product_variations_insert" ON public.product_variations FOR INSERT WITH CHECK (org_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_variations' AND policyname = 'product_variations_update') THEN
    CREATE POLICY "product_variations_update" ON public.product_variations FOR UPDATE USING (org_id = public.user_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_variations' AND policyname = 'product_variations_delete') THEN
    CREATE POLICY "product_variations_delete" ON public.product_variations FOR DELETE USING (org_id = public.user_org_id());
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 4. Alter products: add category_id, sub_category_id
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id),
  ADD COLUMN IF NOT EXISTS sub_category_id UUID REFERENCES public.sub_categories(id);

-- ─────────────────────────────────────────────────────────────
-- 5. Alter purchase_items: add variation_id
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.purchase_items
  ADD COLUMN IF NOT EXISTS variation_id UUID REFERENCES public.product_variations(id);

-- ─────────────────────────────────────────────────────────────
-- 6. Alter sale_items: add variation_id
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS variation_id UUID REFERENCES public.product_variations(id);
