-- =====================================================================
-- Platform-Admin DNA enrollment (20260502_0140) — Patch 1
--
-- Seeds the 8 platform DNA layers as Dynamic-UI catalog rows + mounts
-- the platform-admin workspace top-level navigation. Idempotent.
--
-- 6NF COMPLIANCE — per platform/config-center/ops/normalization/
-- normalization-framework.md:
--   • Tables targeted (dos.dynamic_ui_modules, dos.dynamic_ui_navigation)
--     were already exploded to 6NF by migration 0133.
--   • Every seeded column is SCALAR / single-valued — no TEXT[], no JSONB
--     of entity-grade refs, no compound facts. Each non-key attribute
--     depends ONLY on its primary key (module_code for catalog; id for nav).
--   • Multi-valued relationships (module → roles, module → tenants, nav →
--     permissions) live in dedicated junction tables (e.g.
--     dos.dynamic_ui_module_status, future dos.platform_admin_module_roles)
--     and are NOT collapsed onto these rows.
--   • Pre-flight assertion below fails the migration if either target
--     table later regrows an array column, locking in the invariant.
--
-- DNA layers seeded (product_key = 'platform', platform_key groups them):
--   1. dauth                — DAuth (identity, session, MFA, SoD)
--   2. config-center        — Config OS
--   3. tenant-management    — Tenant lifecycle, memberships, branding
--   4. multi-tenant-mgmt    — Cross-tenant operations / RLS / search-path
--   5. foundation           — Org, identity, lifecycle DNA
--   6. dos-platform         — Platform DOS plane (registry, lifecycle)
--   7. dnoc                 — Network/observability ops
--   8. dsoc                 — Security ops
--   9. ai-platform          — AI-OS (gateway + engine + governance)
--
-- All rows are platform-default (tenant_id = NULL). Per-tenant overrides
-- still go through dos.dynamic_ui_module_status.
-- =====================================================================

BEGIN;

-- ── 0. 6NF pre-flight assertion ──────────────────────────────────────
-- Hard-fail the seed if either target table contains an array column,
-- which would mean a prior migration re-introduced a multi-valued
-- attribute and broke the 6NF invariant we depend on for tenant/role
-- isolation. Using DO/RAISE so the failure is loud and atomic.
DO $$
DECLARE
  bad_col TEXT;
BEGIN
  SELECT format('%I.%I.%I', table_schema, table_name, column_name)
    INTO bad_col
    FROM information_schema.columns
   WHERE table_schema = 'dos'
     AND table_name IN ('dynamic_ui_modules', 'dynamic_ui_navigation')
     AND data_type = 'ARRAY'
   LIMIT 1;
  IF bad_col IS NOT NULL THEN
    RAISE EXCEPTION
      'Patch 1 6NF violation: array column % present on a target table; explode to child table before seeding.',
      bad_col;
  END IF;
END $$;

-- ── 1. Catalog ───────────────────────────────────────────────────────
INSERT INTO dos.dynamic_ui_modules
  (module_code, platform_key, product_key, display_name, default_route,
   registry_status, default_tenant_enrollment_status, canonical_source)
VALUES
  ('dauth',             'identity',  'platform', 'DAuth — Identity & Access',     '/admin/dauth',             'active', 'active', 'platform/dauth'),
  ('config-center',     'config',    'platform', 'Config Center',                 '/admin/config-center',     'active', 'active', 'platform/config-center'),
  ('tenant-management', 'tenancy',   'platform', 'Tenant Management',             '/admin/tenants',           'active', 'active', 'services/tenant-service'),
  ('multi-tenant-mgmt', 'tenancy',   'platform', 'Multi-Tenant Operations',       '/admin/multi-tenant',      'active', 'active', 'platform/dos'),
  ('foundation-admin',  'foundation','platform', 'Foundation (DNA)',              '/admin/foundation',        'active', 'active', 'platform/foundation'),
  ('dos-platform',      'dos',       'platform', 'DOS Platform Plane',            '/admin/dos',               'active', 'active', 'platform/dos'),
  ('dnoc',              'ops',       'platform', 'DNOC — Network & Observability','/admin/dnoc',              'active', 'active', 'platform/dnoc'),
  ('dsoc',              'ops',       'platform', 'DSOC — Security Ops',           '/admin/dsoc',              'active', 'active', 'platform/dsoc'),
  ('ai-platform',       'ai',       'platform',  'AI-OS Platform',                '/admin/ai',                'active', 'active', 'platform/ai')
ON CONFLICT (module_code) DO UPDATE
   SET display_name      = EXCLUDED.display_name,
       default_route     = EXCLUDED.default_route,
       platform_key      = EXCLUDED.platform_key,
       product_key       = EXCLUDED.product_key,
       canonical_source  = EXCLUDED.canonical_source,
       registry_status   = EXCLUDED.registry_status,
       default_tenant_enrollment_status = EXCLUDED.default_tenant_enrollment_status,
       updated_at        = NOW();

-- ── 2. Platform-admin navigation (groups + items) ───────────────────
-- Strategy: insert each (label, route) only when no row with the same
-- (module_code, label, route) exists at platform-default (tenant_id IS NULL).
-- Two parent groups: "Identity & Tenancy" and "Platform Operations".

-- 2a. Group: Identity & Tenancy
INSERT INTO dos.dynamic_ui_navigation (tenant_id, module_code, label, route, sort_order, parent_id, readiness)
SELECT NULL, 'dauth', 'Identity & Tenancy', '#identity-tenancy', 100, NULL, 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM dos.dynamic_ui_navigation
   WHERE tenant_id IS NULL AND module_code = 'dauth' AND route = '#identity-tenancy'
);

-- 2b. Group: Platform Operations
INSERT INTO dos.dynamic_ui_navigation (tenant_id, module_code, label, route, sort_order, parent_id, readiness)
SELECT NULL, 'dos-platform', 'Platform Operations', '#platform-ops', 200, NULL, 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM dos.dynamic_ui_navigation
   WHERE tenant_id IS NULL AND module_code = 'dos-platform' AND route = '#platform-ops'
);

-- 2c. Group: AI Platform
INSERT INTO dos.dynamic_ui_navigation (tenant_id, module_code, label, route, sort_order, parent_id, readiness)
SELECT NULL, 'ai-platform', 'AI Platform', '#ai-platform', 300, NULL, 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM dos.dynamic_ui_navigation
   WHERE tenant_id IS NULL AND module_code = 'ai-platform' AND route = '#ai-platform'
);

-- 2d. Children — Identity & Tenancy
WITH parent AS (
  SELECT id FROM dos.dynamic_ui_navigation
   WHERE tenant_id IS NULL AND module_code = 'dauth' AND route = '#identity-tenancy' LIMIT 1
)
INSERT INTO dos.dynamic_ui_navigation (tenant_id, module_code, label, route, sort_order, parent_id, readiness)
SELECT NULL, x.module_code, x.label, x.route, x.sort_order, parent.id, 'active'
  FROM parent, (VALUES
    ('dauth',             'DAuth (Identity, MFA, SoD)',  '/admin/dauth',         110),
    ('tenant-management', 'Tenants',                     '/admin/tenants',       120),
    ('multi-tenant-mgmt', 'Multi-Tenant Operations',     '/admin/multi-tenant',  130),
    ('foundation-admin',  'Foundation (Org/Lifecycle)',  '/admin/foundation',    140),
    ('config-center',     'Config Center',               '/admin/config-center', 150)
  ) AS x(module_code, label, route, sort_order)
 WHERE NOT EXISTS (
   SELECT 1 FROM dos.dynamic_ui_navigation n
    WHERE n.tenant_id IS NULL AND n.module_code = x.module_code AND n.route = x.route
 );

-- 2e. Children — Platform Operations
WITH parent AS (
  SELECT id FROM dos.dynamic_ui_navigation
   WHERE tenant_id IS NULL AND module_code = 'dos-platform' AND route = '#platform-ops' LIMIT 1
)
INSERT INTO dos.dynamic_ui_navigation (tenant_id, module_code, label, route, sort_order, parent_id, readiness)
SELECT NULL, x.module_code, x.label, x.route, x.sort_order, parent.id, 'active'
  FROM parent, (VALUES
    ('dos-platform', 'DOS Platform Plane',     '/admin/dos',         210),
    ('dnoc',         'DNOC (Observability)',   '/admin/dnoc',        220),
    ('dsoc',         'DSOC (Security Ops)',    '/admin/dsoc',        230)
  ) AS x(module_code, label, route, sort_order)
 WHERE NOT EXISTS (
   SELECT 1 FROM dos.dynamic_ui_navigation n
    WHERE n.tenant_id IS NULL AND n.module_code = x.module_code AND n.route = x.route
 );

-- 2f. Children — AI Platform
WITH parent AS (
  SELECT id FROM dos.dynamic_ui_navigation
   WHERE tenant_id IS NULL AND module_code = 'ai-platform' AND route = '#ai-platform' LIMIT 1
)
INSERT INTO dos.dynamic_ui_navigation (tenant_id, module_code, label, route, sort_order, parent_id, readiness)
SELECT NULL, x.module_code, x.label, x.route, x.sort_order, parent.id, 'active'
  FROM parent, (VALUES
    ('ai-platform', 'AI Gateway',     '/admin/ai/gateway',    310),
    ('ai-platform', 'AI Engine',      '/admin/ai/engine',     320),
    ('ai-platform', 'AI Governance',  '/admin/ai/governance', 330)
  ) AS x(module_code, label, route, sort_order)
 WHERE NOT EXISTS (
   SELECT 1 FROM dos.dynamic_ui_navigation n
    WHERE n.tenant_id IS NULL AND n.module_code = x.module_code AND n.route = x.route
 );

COMMIT;
