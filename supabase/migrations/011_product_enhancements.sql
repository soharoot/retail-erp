-- 011_product_enhancements.sql
-- Add unit types, barcodes, per-variation pricing, and decimal stock support

-- Products: add unit type + barcode
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'piece'
    CHECK (unit IN ('piece','kg','metre')),
  ADD COLUMN IF NOT EXISTS barcode TEXT;

-- Variations: add per-variation pricing + barcode
ALTER TABLE public.product_variations
  ADD COLUMN IF NOT EXISTS price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS cost NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS barcode TEXT;

-- Widen quantity/stock columns to NUMERIC for kg/metre decimal support
ALTER TABLE public.sale_items ALTER COLUMN quantity TYPE NUMERIC(12,3);
ALTER TABLE public.inventory ALTER COLUMN stock TYPE NUMERIC(12,3);
ALTER TABLE public.product_variations ALTER COLUMN stock TYPE NUMERIC(12,3);
