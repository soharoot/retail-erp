-- ============================================================
-- 004_offline_sync.sql — Add updated_at to user_data for LWW
-- ============================================================

-- 1. Add updated_at column (defaults to NOW for existing rows)
ALTER TABLE public.user_data
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. Auto-update timestamp on every write
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop if exists to make migration idempotent
DROP TRIGGER IF EXISTS user_data_set_updated_at ON public.user_data;

CREATE TRIGGER user_data_set_updated_at
  BEFORE UPDATE ON public.user_data
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
