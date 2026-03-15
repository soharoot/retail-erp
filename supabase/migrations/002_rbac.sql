-- ═══════════════════════════════════════════════════════════════
-- 002_rbac.sql — Role-Based Access Control
-- Creates: organizations, permissions, roles, role_permissions,
--          org_members. Modifies: profiles, user_data.
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1. Organizations
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL DEFAULT 'My Organization',
  owner_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 2. Permissions (global seed — not per-org)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,
  module      TEXT NOT NULL,
  action      TEXT NOT NULL,
  description TEXT
);

-- Permissions are global reference data — everyone can read, nobody writes via client
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "permissions: anyone can read"
  ON public.permissions FOR SELECT
  USING (true);

-- Seed all 31 permissions
INSERT INTO public.permissions (code, module, action, description) VALUES
  ('dashboard.view',      'dashboard',      'view',   'View dashboard'),
  ('products.view',       'products',       'view',   'View products'),
  ('products.manage',     'products',       'manage', 'Create, edit, delete products'),
  ('inventory.view',      'inventory',      'view',   'View inventory'),
  ('inventory.manage',    'inventory',      'manage', 'Manage inventory adjustments'),
  ('sales.view',          'sales',          'view',   'View sales'),
  ('sales.manage',        'sales',          'manage', 'Create, edit, delete sales'),
  ('purchases.view',      'purchases',      'view',   'View purchase orders'),
  ('purchases.manage',    'purchases',      'manage', 'Create, edit, delete purchase orders'),
  ('suppliers.view',      'suppliers',      'view',   'View suppliers'),
  ('suppliers.manage',    'suppliers',      'manage', 'Create, edit, delete suppliers'),
  ('supplier_debts.view', 'supplier_debts', 'view',   'View supplier debts'),
  ('supplier_debts.manage','supplier_debts','manage', 'Manage supplier debt payments'),
  ('customers.view',      'customers',      'view',   'View customers'),
  ('customers.manage',    'customers',      'manage', 'Create, edit, delete customers'),
  ('invoicing.view',      'invoicing',      'view',   'View invoices'),
  ('invoicing.manage',    'invoicing',      'manage', 'Create, edit, delete invoices'),
  ('financial.view',      'financial',      'view',   'View financial reports'),
  ('financial.manage',    'financial',      'manage', 'Manage financial entries'),
  ('hr.view',             'hr',             'view',   'View HR / employees'),
  ('hr.manage',           'hr',             'manage', 'Manage employees and payroll'),
  ('projects.view',       'projects',       'view',   'View projects'),
  ('projects.manage',     'projects',       'manage', 'Create, edit, delete projects'),
  ('crm.view',            'crm',            'view',   'View CRM / leads'),
  ('crm.manage',          'crm',            'manage', 'Manage CRM leads and deals'),
  ('reports.view',        'reports',        'view',   'View reports'),
  ('settings.view',       'settings',       'view',   'View settings'),
  ('settings.manage',     'settings',       'manage', 'Modify system settings'),
  ('users.view',          'users',          'view',   'View user management'),
  ('users.manage',        'users',          'manage', 'Manage users, roles, and permissions')
ON CONFLICT (code) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 3. Roles (per-organization)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  is_system   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, name)
);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 4. Role ↔ Permission junction
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id       UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 5. Organization members
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.org_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id       UUID REFERENCES public.roles(id) ON DELETE SET NULL,
  invited_email TEXT,
  invited_by    UUID REFERENCES auth.users(id),
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 6. Modify profiles — add org_id, drop old role column
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- ─────────────────────────────────────────────────────────────
-- 7. Modify user_data — add org_id for multi-tenant data sharing
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.user_data ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- ─────────────────────────────────────────────────────────────
-- 8. Helper: check if current user has a given permission
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.user_has_permission(perm_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_members om
    JOIN public.role_permissions rp ON rp.role_id = om.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE om.user_id = auth.uid()
      AND om.status = 'active'
      AND p.code = perm_code
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- 9. Helper: get current user's org_id
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.user_org_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT org_id FROM public.org_members
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;
$$;

-- ─────────────────────────────────────────────────────────────
-- 9b. Helper: get all role IDs in current user's org
--     SECURITY DEFINER bypasses RLS chain in role_permissions policy
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.user_org_role_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT r.id FROM public.roles r
  JOIN public.org_members om ON om.org_id = r.org_id
  WHERE om.user_id = auth.uid() AND om.status = 'active';
$$;

-- ─────────────────────────────────────────────────────────────
-- 10. Helper: setup default roles + permissions for an org
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.setup_org_roles(p_org_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_role_id   UUID;
  v_manager_role_id UUID;
  v_employee_role_id UUID;
  v_viewer_role_id  UUID;
BEGIN
  -- Create 4 system roles
  INSERT INTO public.roles (org_id, name, description, is_system) VALUES
    (p_org_id, 'Admin',    'Full access to all modules',          true),
    (p_org_id, 'Manager',  'Access to most modules',              true),
    (p_org_id, 'Employee', 'Limited access to assigned modules',  true),
    (p_org_id, 'Viewer',   'Read-only access to basic modules',   true)
  ON CONFLICT (org_id, name) DO NOTHING;

  SELECT id INTO v_admin_role_id    FROM public.roles WHERE org_id = p_org_id AND name = 'Admin';
  SELECT id INTO v_manager_role_id  FROM public.roles WHERE org_id = p_org_id AND name = 'Manager';
  SELECT id INTO v_employee_role_id FROM public.roles WHERE org_id = p_org_id AND name = 'Employee';
  SELECT id INTO v_viewer_role_id   FROM public.roles WHERE org_id = p_org_id AND name = 'Viewer';

  -- Admin: ALL permissions (NULL guard prevents crash if role insert was blocked)
  IF v_admin_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_admin_role_id, id FROM public.permissions
    ON CONFLICT DO NOTHING;
  END IF;

  -- Manager: all view + most manage (not users.manage, settings.manage)
  IF v_manager_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_manager_role_id, id FROM public.permissions
    WHERE code NOT IN ('users.manage', 'settings.manage')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Employee: view for basic modules + manage for sales, products, inventory, customers
  IF v_employee_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_employee_role_id, id FROM public.permissions
    WHERE code IN (
      'dashboard.view',
      'products.view', 'products.manage',
      'inventory.view', 'inventory.manage',
      'sales.view', 'sales.manage',
      'customers.view', 'customers.manage',
      'purchases.view',
      'suppliers.view',
      'invoicing.view',
      'projects.view',
      'crm.view'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Viewer: view-only for basic modules
  IF v_viewer_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_viewer_role_id, id FROM public.permissions
    WHERE code IN (
      'dashboard.view',
      'products.view',
      'inventory.view',
      'sales.view',
      'customers.view',
      'reports.view'
    )
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 11. Updated handle_new_user trigger
--     Creates profile + org + roles + admin membership
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name  TEXT;
  v_org_id     UUID;
  v_admin_role UUID;
  v_existing_invite UUID;
  v_invite_org UUID;
  v_invite_role UUID;
BEGIN
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Check if this email was invited to an existing org
  SELECT om.id, om.org_id, om.role_id
  INTO v_existing_invite, v_invite_org, v_invite_role
  FROM public.org_members om
  WHERE om.invited_email = NEW.email
    AND om.status = 'invited'
    AND om.user_id IS NULL
  LIMIT 1;

  IF v_existing_invite IS NOT NULL THEN
    -- ── Invited user: join existing org ──
    UPDATE public.org_members
    SET user_id = NEW.id, status = 'active'
    WHERE id = v_existing_invite;

    INSERT INTO public.profiles (id, full_name, avatar_url, org_id)
    VALUES (
      NEW.id,
      v_full_name,
      NEW.raw_user_meta_data->>'avatar_url',
      v_invite_org
    )
    ON CONFLICT (id) DO UPDATE SET org_id = v_invite_org;

  ELSE
    -- ── New user: create organization + become admin ──
    INSERT INTO public.organizations (name, owner_id)
    VALUES (v_full_name || '''s Organization', NEW.id)
    RETURNING id INTO v_org_id;

    -- Setup default roles
    PERFORM public.setup_org_roles(v_org_id);

    -- Get Admin role id
    SELECT id INTO v_admin_role
    FROM public.roles
    WHERE org_id = v_org_id AND name = 'Admin';

    -- Create org membership as admin
    INSERT INTO public.org_members (org_id, user_id, role_id, status)
    VALUES (v_org_id, NEW.id, v_admin_role, 'active');

    -- Create profile
    INSERT INTO public.profiles (id, full_name, avatar_url, org_id)
    VALUES (
      NEW.id,
      v_full_name,
      NEW.raw_user_meta_data->>'avatar_url',
      v_org_id
    )
    ON CONFLICT (id) DO UPDATE SET org_id = v_org_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Re-create trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- 12. RLS Policies
-- ─────────────────────────────────────────────────────────────

-- ── organizations ──
-- Use user_org_id() (SECURITY DEFINER) to avoid RLS chain issues
CREATE POLICY "orgs: members can view own org"
  ON public.organizations FOR SELECT
  USING (id = public.user_org_id());

CREATE POLICY "orgs: owner can update"
  ON public.organizations FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ── roles ──
-- Use user_org_id() (SECURITY DEFINER) to avoid RLS chain issues
CREATE POLICY "roles: org members can view"
  ON public.roles FOR SELECT
  USING (org_id = public.user_org_id());

CREATE POLICY "roles: users.manage can insert"
  ON public.roles FOR INSERT
  WITH CHECK (public.user_has_permission('users.manage'));

CREATE POLICY "roles: users.manage can update"
  ON public.roles FOR UPDATE
  USING (public.user_has_permission('users.manage'))
  WITH CHECK (public.user_has_permission('users.manage'));

CREATE POLICY "roles: users.manage can delete"
  ON public.roles FOR DELETE
  USING (public.user_has_permission('users.manage') AND is_system = false);

-- ── role_permissions ──
-- Use user_org_role_ids() (SECURITY DEFINER) to avoid RLS chain issues
CREATE POLICY "role_perms: org members can view"
  ON public.role_permissions FOR SELECT
  USING (role_id = ANY(ARRAY(SELECT public.user_org_role_ids())));

CREATE POLICY "role_perms: users.manage can insert"
  ON public.role_permissions FOR INSERT
  WITH CHECK (public.user_has_permission('users.manage'));

CREATE POLICY "role_perms: users.manage can delete"
  ON public.role_permissions FOR DELETE
  USING (public.user_has_permission('users.manage'));

-- ── org_members ──
-- Use user_id = auth.uid() (own row) OR user_org_id() (SECURITY DEFINER) for org view
CREATE POLICY "members: org members can view"
  ON public.org_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR org_id = public.user_org_id()
  );

CREATE POLICY "members: users.manage can insert"
  ON public.org_members FOR INSERT
  WITH CHECK (public.user_has_permission('users.manage'));

CREATE POLICY "members: users.manage can update"
  ON public.org_members FOR UPDATE
  USING (public.user_has_permission('users.manage'))
  WITH CHECK (public.user_has_permission('users.manage'));

CREATE POLICY "members: users.manage can delete"
  ON public.org_members FOR DELETE
  USING (public.user_has_permission('users.manage'));

-- ── user_data (UPDATED policies) ──
-- Drop old per-user policies
DROP POLICY IF EXISTS "Users can view own data"   ON public.user_data;
DROP POLICY IF EXISTS "Users can insert own data"  ON public.user_data;
DROP POLICY IF EXISTS "Users can update own data"  ON public.user_data;
DROP POLICY IF EXISTS "Users can delete own data"  ON public.user_data;

-- New org-level policies
CREATE POLICY "user_data: org members can view"
  ON public.user_data FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND status = 'active')
    OR (org_id IS NULL AND user_id = auth.uid())  -- backward compat for un-migrated data
  );

CREATE POLICY "user_data: org members can insert"
  ON public.user_data FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND status = 'active')
    OR (org_id IS NULL AND user_id = auth.uid())
  );

CREATE POLICY "user_data: org members can update"
  ON public.user_data FOR UPDATE
  USING (
    org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND status = 'active')
    OR (org_id IS NULL AND user_id = auth.uid())
  );

CREATE POLICY "user_data: org members can delete"
  ON public.user_data FOR DELETE
  USING (
    org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND status = 'active')
    OR (org_id IS NULL AND user_id = auth.uid())
  );

-- ── profiles (UPDATED policies) ──
DROP POLICY IF EXISTS "profiles: read own"   ON public.profiles;
DROP POLICY IF EXISTS "profiles: update own" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Read own profile
CREATE POLICY "profiles: read own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Read org member profiles (so admin can see staff names)
CREATE POLICY "profiles: read org members"
  ON public.profiles FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

-- Update own profile
CREATE POLICY "profiles: update own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────
-- 13. Migrate existing users (if any exist before this migration)
--     Creates an org for each existing user that doesn't have one
-- ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  r RECORD;
  v_org_id UUID;
  v_admin_role UUID;
BEGIN
  -- For each profile without an org_id
  FOR r IN SELECT p.id, p.full_name FROM public.profiles p WHERE p.org_id IS NULL
  LOOP
    -- Create org
    INSERT INTO public.organizations (name, owner_id)
    VALUES (COALESCE(r.full_name, 'My') || '''s Organization', r.id)
    RETURNING id INTO v_org_id;

    -- Setup roles
    PERFORM public.setup_org_roles(v_org_id);

    -- Get admin role
    SELECT id INTO v_admin_role FROM public.roles WHERE org_id = v_org_id AND name = 'Admin';

    -- Create membership
    INSERT INTO public.org_members (org_id, user_id, role_id, status)
    VALUES (v_org_id, r.id, v_admin_role, 'active')
    ON CONFLICT (org_id, user_id) DO NOTHING;

    -- Update profile
    UPDATE public.profiles SET org_id = v_org_id WHERE id = r.id;

    -- Migrate user_data rows
    UPDATE public.user_data SET org_id = v_org_id WHERE user_id = r.id AND org_id IS NULL;
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 14. Update user_data unique constraint for org-level keying
-- ─────────────────────────────────────────────────────────────

-- Add new unique constraint (org_id, data_key)
-- Keep old constraint for backward compat during transition
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_data_org_key
  ON public.user_data (org_id, data_key)
  WHERE org_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 15. Missing INSERT policies (required for signup trigger)
-- ─────────────────────────────────────────────────────────────

-- auth.role() IS NULL  = no JWT = trigger/system context → allow
-- auth.role() = 'anon' = anonymous API user            → block
-- auth.role() = 'authenticated' = logged-in user       → check permission

-- profiles: allow own insert or trigger context
DROP POLICY IF EXISTS "profiles: insert own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles: can insert"  ON public.profiles;
CREATE POLICY "profiles: can insert"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR auth.role() IS NULL);

-- organizations: allow owner insert or trigger context
DROP POLICY IF EXISTS "orgs: owner can insert" ON public.organizations;
DROP POLICY IF EXISTS "orgs: can insert"       ON public.organizations;
CREATE POLICY "orgs: can insert"
  ON public.organizations FOR INSERT
  WITH CHECK (owner_id = auth.uid() OR auth.role() IS NULL);

-- roles: allow users.manage or trigger context
DROP POLICY IF EXISTS "roles: users.manage can insert" ON public.roles;
DROP POLICY IF EXISTS "roles: can insert"              ON public.roles;
CREATE POLICY "roles: can insert"
  ON public.roles FOR INSERT
  WITH CHECK (public.user_has_permission('users.manage') OR auth.role() IS NULL);

-- role_permissions: allow users.manage or trigger context
DROP POLICY IF EXISTS "role_perms: users.manage can insert" ON public.role_permissions;
DROP POLICY IF EXISTS "role_perms: can insert"              ON public.role_permissions;
CREATE POLICY "role_perms: can insert"
  ON public.role_permissions FOR INSERT
  WITH CHECK (public.user_has_permission('users.manage') OR auth.role() IS NULL);

-- org_members: allow own membership, users.manage, or trigger context
DROP POLICY IF EXISTS "members: users.manage can insert" ON public.org_members;
DROP POLICY IF EXISTS "members: can insert"              ON public.org_members;
CREATE POLICY "members: can insert"
  ON public.org_members FOR INSERT
  WITH CHECK (
    public.user_has_permission('users.manage')
    OR user_id = auth.uid()
    OR auth.role() IS NULL
  );
