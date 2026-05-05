-- =============================================================================
-- Migration: 20260505_2100_workspace_shell_default_props.sql
-- Purpose:   F1 props-seeding wave — populate default props on the
--            zero-prop rows in dos.workspace_shell_binding so the
--            workspace shell renders its baseline chrome (brand,
--            homeRoute, workspaceTitle) for every tenant.
--
-- Doctrine:
--   - DB-driven only: no FE/resolver hardcodes are added.
--   - Idempotent: only seeds rows where props='{}'::jsonb.
--   - Per-tenant values pulled from dos.tenants (tenant_code, tenant_name).
--   - Tenant-level overrides land in props later via the publisher;
--     this migration writes the floor only.
--
-- Scope (this slice):
--   header zone, root frame:
--     workspace.frame.header  -> {brand, tenantName, homeRoute,
--                                 workspaceTitle, logoHref}
--   sidebar zone, root frame:
--     workspace.frame.side-nav -> {homeRoute, ariaLabel}
--   main zone, shell root:
--     workspace.frame.ui-shell -> {homeRoute}
--
-- Lower-band keys (header-name, header-menu, side-nav-menu-item, …) are
-- left at '{}' intentionally — they inherit chrome from their parent
-- composition. Subsequent F1.x slices seed status-bar / right-rail / fab
-- payloads; this migration is the minimum viable shell-render seed.
--
-- Self-asserts at end: every header/side-nav/ui-shell row for an active
-- tenant must now carry non-empty props.
-- =============================================================================

BEGIN;

-- ── Header root chrome ───────────────────────────────────────────────────
UPDATE dos.workspace_shell_binding b
   SET props = jsonb_build_object(
         'brand',          COALESCE(t.tenant_name, t.tenant_code),
         'tenantName',     COALESCE(t.tenant_name, t.tenant_code),
         'productName',    'Shahin AI',
         'homeRoute',      '/',
         'workspaceTitle', COALESCE(t.tenant_name, t.tenant_code),
         'logoHref',       '/'
       )
  FROM dos.tenants t
 WHERE b.tenant_id = t.tenant_id
   AND b.component_key = 'workspace.frame.header'
   AND b.props = '{}'::jsonb
   AND t.status = 'active';

-- ── Sidebar root chrome ──────────────────────────────────────────────────
UPDATE dos.workspace_shell_binding b
   SET props = jsonb_build_object(
         'homeRoute', '/',
         'ariaLabel', jsonb_build_object(
            'i18nKey',  'workspace.sidebar.aria',
            'fallback', 'Workspace navigation'
         )
       )
  FROM dos.tenants t
 WHERE b.tenant_id = t.tenant_id
   AND b.component_key = 'workspace.frame.side-nav'
   AND b.props = '{}'::jsonb
   AND t.status = 'active';

-- ── Shell root ui-shell ──────────────────────────────────────────────────
UPDATE dos.workspace_shell_binding b
   SET props = jsonb_build_object(
         'homeRoute', '/'
       )
  FROM dos.tenants t
 WHERE b.tenant_id = t.tenant_id
   AND b.component_key = 'workspace.frame.ui-shell'
   AND b.props = '{}'::jsonb
   AND t.status = 'active';

-- ── Self-assertion ───────────────────────────────────────────────────────
DO $$
DECLARE
  empty_header  int;
  empty_sidenav int;
  empty_shell   int;
BEGIN
  SELECT count(*) INTO empty_header
    FROM dos.workspace_shell_binding b
    JOIN dos.tenants t USING (tenant_id)
   WHERE t.status = 'active'
     AND b.component_key = 'workspace.frame.header'
     AND b.props = '{}'::jsonb;
  SELECT count(*) INTO empty_sidenav
    FROM dos.workspace_shell_binding b
    JOIN dos.tenants t USING (tenant_id)
   WHERE t.status = 'active'
     AND b.component_key = 'workspace.frame.side-nav'
     AND b.props = '{}'::jsonb;
  SELECT count(*) INTO empty_shell
    FROM dos.workspace_shell_binding b
    JOIN dos.tenants t USING (tenant_id)
   WHERE t.status = 'active'
     AND b.component_key = 'workspace.frame.ui-shell'
     AND b.props = '{}'::jsonb;
  IF empty_header + empty_sidenav + empty_shell > 0 THEN
    RAISE EXCEPTION
      'workspace shell default-props seed incomplete: header=% side-nav=% ui-shell=%',
      empty_header, empty_sidenav, empty_shell;
  END IF;
  RAISE NOTICE 'workspace shell default-props OK — header/side-nav/ui-shell fully seeded for all active tenants';
END $$;

COMMIT;
