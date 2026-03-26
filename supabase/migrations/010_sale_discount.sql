-- 010_sale_discount.sql
-- Adds discount column to sales table for POS remise feature

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS discount NUMERIC(12,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.sales.discount IS 'Discount (remise) amount in DA. total = subtotal + tax - discount';
