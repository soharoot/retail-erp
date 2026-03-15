-- ═══════════════════════════════════════════════════════════════
-- 003_activity_logs.sql — Activity Log System
-- Creates: activity_logs table + RLS + seeds activity.view permission
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1. Activity Logs Table
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name   TEXT,
  action      TEXT        NOT NULL,
  module      TEXT        NOT NULL,
  description TEXT        NOT NULL,
  metadata    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast org + time queries
CREATE INDEX IF NOT EXISTS activity_logs_org_id_created_at_idx
  ON public.activity_logs (org_id, created_at DESC);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 2. RLS Policies
-- ─────────────────────────────────────────────────────────────

-- Org members can view their org's activity logs
CREATE POLICY "activity_logs: org members can view"
  ON public.activity_logs FOR SELECT
  USING (org_id = public.user_org_id());

-- Authenticated users can insert logs for their own org
CREATE POLICY "activity_logs: members can insert"
  ON public.activity_logs FOR INSERT
  WITH CHECK (org_id = public.user_org_id() OR auth.role() IS NULL);

-- No UPDATE or DELETE — logs are immutable

-- ─────────────────────────────────────────────────────────────
-- 3. Seed activity.view permission
-- ─────────────────────────────────────────────────────────────

INSERT INTO public.permissions (code, module, action, description)
VALUES ('activity.view', 'activity', 'view', 'View activity logs')
ON CONFLICT (code) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 4. Assign activity.view to Admin role in every existing org
-- ─────────────────────────────────────────────────────────────

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Admin'
  AND p.code = 'activity.view'
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
