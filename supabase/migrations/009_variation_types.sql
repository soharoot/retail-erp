-- 009_variation_types.sql
-- Adds: variation_types, variation_values tables
-- Allows managing reusable variation types (Taille, Couleur...) and their values (S, M, L / Noir, Blanc...)

-- 1. Variation Types
CREATE TABLE IF NOT EXISTS public.variation_types (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, name)
);

CREATE INDEX IF NOT EXISTS idx_variation_types_org ON public.variation_types(org_id);
ALTER TABLE public.variation_types ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'variation_types_org_policy') THEN
    CREATE POLICY variation_types_org_policy ON public.variation_types
      FOR ALL USING (org_id = public.user_org_id());
  END IF;
END $$;

-- 2. Variation Values
CREATE TABLE IF NOT EXISTS public.variation_values (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    variation_type_id   UUID NOT NULL REFERENCES public.variation_types(id) ON DELETE CASCADE,
    value               TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(variation_type_id, value)
);

CREATE INDEX IF NOT EXISTS idx_variation_values_org ON public.variation_values(org_id);
CREATE INDEX IF NOT EXISTS idx_variation_values_type ON public.variation_values(variation_type_id);
ALTER TABLE public.variation_values ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'variation_values_org_policy') THEN
    CREATE POLICY variation_values_org_policy ON public.variation_values
      FOR ALL USING (org_id = public.user_org_id());
  END IF;
END $$;
