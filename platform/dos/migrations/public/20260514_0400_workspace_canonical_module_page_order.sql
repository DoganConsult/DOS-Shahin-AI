-- =====================================================================
-- 20260514_0400 — Canonical workspace module + Foundation page ordering
-- ---------------------------------------------------------------------
-- Doctrine: ZERO STATIC / ZERO LEGACY / ZERO FALLBACK / DB-as-source.
-- This migration encodes the published Shahin-AI workspace product
-- contract so the SPA never has to invent module/page order, default
-- landing routes, or sidebar entry expansion.
--
-- Source of truth references:
--   §1 Default opened item: /workspace-home → Foundation → /foundation/overview
--   §2 Best Shahin module order (18 modules)
--   §3 Universal page order pattern (Overview/Records/Workflows/Reports/Settings)
--   §4 Foundation 24-page canonical order
--   §5 Sidebar rule (Foundation first, only active module expanded)
--
-- Idempotent: safe to re-run. Uses ALTER TABLE IF NOT EXISTS, UPDATE
-- by primary key, and JSONB jsonb_set guarded by current value.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Module-level ordering: ensure column exists, then assign canonical
--    sort_order per the 18-module spec.
-- ---------------------------------------------------------------------
ALTER TABLE dos.module_registry
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 999;

CREATE INDEX IF NOT EXISTS ix_module_registry_sort_order
  ON dos.module_registry (sort_order);

UPDATE dos.module_registry m
   SET sort_order = v.sort_order,
       updated_at = now()
  FROM (VALUES
    ('foundation',    10),
    ('governance',    20),
    ('policy',        21),
    ('risk',          30),
    ('compliance',    40),
    ('controls',      50),
    ('evidence',      60),
    ('audit',         70),
    ('incident',      80),
    ('vendor',        90),
    ('asset',        100),
    ('bcp',          110),
    ('privacy',      120),
    ('training',     130),
    ('reporting',    140),
    ('analytics',    141),
    ('ai',           150),
    ('ai-os',        151),
    ('ai-platform',  152),
    ('ai-governance',153),
    ('workflow',     160),
    ('config-center',170),
    ('admin',        180),
    ('dauth',        181),
    ('dnoc',         182),
    ('dsoc',         183)
  ) AS v(module_code, sort_order)
 WHERE m.module_code = v.module_code
   AND COALESCE(m.sort_order, 999) <> v.sort_order;

-- ---------------------------------------------------------------------
-- 2. Foundation page ordering: assign sort_order 1..24 to the canonical
--    Foundation pages. Anything not in the canonical 24 is pushed to
--    sort_order >= 100 so it remains routable but does not pollute the
--    primary sidebar.
-- ---------------------------------------------------------------------
UPDATE dos.ui_module_nav_item i
   SET sort_order = v.sort_order,
       updated_at = now()
  FROM (VALUES
    ('foundation.overview',          1),
    ('foundation.organization',      2),
    ('foundation.business-units',    3),
    ('foundation.departments',       4),
    ('foundation.positions',         5),
    ('foundation.users',             6),
    ('foundation.teams',             7),
    ('foundation.roles',             8),
    ('foundation.locations',         9),
    ('foundation.committees',       10),
    ('foundation.delegations',      11),
    ('foundation.ownership-mapping',12),
    ('foundation.access-review',    13),
    ('foundation.policies',         14),
    ('foundation.data-processing',  15),
    ('foundation.reference-data',   16),
    ('foundation.audit',            17),
    ('foundation.settings',         18),
    ('foundation.permissions',      19),
    ('foundation.ownership',        20),
    ('foundation.sod',              21),
    ('foundation.hierarchy-viz',    22),
    ('foundation.user-lifecycle',   23),
    ('foundation.diagnostics',      24)
  ) AS v(item_id, sort_order)
 WHERE i.module_code = 'foundation'
   AND i.item_id = v.item_id
   AND i.sort_order <> v.sort_order;

-- Bump every other foundation item to >= 100 so canonical order wins.
UPDATE dos.ui_module_nav_item
   SET sort_order = sort_order + 100,
       updated_at = now()
 WHERE module_code = 'foundation'
   AND item_id NOT IN (
     'foundation.overview','foundation.organization','foundation.business-units',
     'foundation.departments','foundation.positions','foundation.users',
     'foundation.teams','foundation.roles','foundation.locations',
     'foundation.committees','foundation.delegations','foundation.ownership-mapping',
     'foundation.access-review','foundation.policies','foundation.data-processing',
     'foundation.reference-data','foundation.audit','foundation.settings',
     'foundation.permissions','foundation.ownership','foundation.sod',
     'foundation.hierarchy-viz','foundation.user-lifecycle','foundation.diagnostics'
   )
   AND sort_order < 100;

-- ---------------------------------------------------------------------
-- 3. Default landing route: every workspace_shell_binding that exposes
--    homeRoute must point to /workspace-home (not bare /). Same value
--    cascades to ui-shell, header, side-nav frame primitives.
-- ---------------------------------------------------------------------
UPDATE dos.workspace_shell_binding
   SET props = jsonb_set(COALESCE(props, '{}'::jsonb), '{homeRoute}', to_jsonb('/workspace-home'::text), true)
 WHERE component_key IN (
         'workspace.frame.ui-shell',
         'workspace.frame.header',
         'workspace.frame.side-nav',
         'workspace.shell.brand',
         'workspace.shell.workspace-title'
       )
   AND COALESCE(props->>'homeRoute', '') <> '/workspace-home';

-- ---------------------------------------------------------------------
-- 4. Default Foundation page: when a user lands on /foundation (no sub-
--    path), redirect to /foundation/overview. Implemented as a route
--    metadata redirect so frontend never has to hardcode.
-- ---------------------------------------------------------------------
UPDATE dos.dynamic_ui_route_metadata
   SET render_mode = 'redirect',
       template_binding_required = false,
       metadata = jsonb_set(
                    jsonb_set(
                      COALESCE(metadata, '{}'::jsonb),
                      '{renderMode}', '"redirect"'::jsonb, true
                    ),
                    '{redirect}',
                    jsonb_build_object(
                      'default',       '/foundation/overview',
                      'authenticated', '/foundation/overview'
                    ),
                    true
                  ),
       updated_at = now()
 WHERE route = '/foundation'
   AND COALESCE(metadata->'redirect'->>'authenticated', '') <> '/foundation/overview';

-- ---------------------------------------------------------------------
-- 5. Sidebar policy: only the active module is expanded. Encoded as a
--    workspace policy hint that the SPA SideNav reads from
--    workspace_shell_binding.props.policy on the sidebar-nav surface.
-- ---------------------------------------------------------------------
UPDATE dos.workspace_shell_binding
   SET props = jsonb_set(
                 COALESCE(props, '{}'::jsonb),
                 '{policy}',
                 jsonb_build_object(
                   'expandActiveOnly', true,
                   'defaultModuleCode', 'foundation',
                   'defaultRoute', '/foundation/overview'
                 ),
                 true
               )
 WHERE component_key = 'workspace.shell.sidebar-nav'
   AND COALESCE(props->'policy'->>'expandActiveOnly','') <> 'true';

-- ---------------------------------------------------------------------
-- 6. Validation assertions (fail loudly if any seed step missed).
-- ---------------------------------------------------------------------
DO $$
DECLARE
  foundation_overview_order INT;
  foundation_module_order   INT;
  home_route_unset_count    INT;
  foundation_redirect_route TEXT;
BEGIN
  SELECT sort_order INTO foundation_overview_order
    FROM dos.ui_module_nav_item
   WHERE module_code='foundation' AND item_id='foundation.overview';
  IF foundation_overview_order IS NULL OR foundation_overview_order <> 1 THEN
    RAISE EXCEPTION 'foundation.overview sort_order must be 1, got %', foundation_overview_order;
  END IF;

  SELECT sort_order INTO foundation_module_order
    FROM dos.module_registry WHERE module_code='foundation';
  IF foundation_module_order IS NULL OR foundation_module_order <> 10 THEN
    RAISE EXCEPTION 'foundation module sort_order must be 10, got %', foundation_module_order;
  END IF;

  SELECT count(*) INTO home_route_unset_count
    FROM dos.workspace_shell_binding
   WHERE component_key IN ('workspace.frame.ui-shell','workspace.frame.header','workspace.frame.side-nav')
     AND COALESCE(props->>'homeRoute','') <> '/workspace-home';
  IF home_route_unset_count > 0 THEN
    RAISE EXCEPTION 'workspace_shell_binding rows with non-canonical homeRoute: %', home_route_unset_count;
  END IF;

  SELECT metadata->'redirect'->>'authenticated'
    INTO foundation_redirect_route
    FROM dos.dynamic_ui_route_metadata
   WHERE route='/foundation';
  IF foundation_redirect_route IS DISTINCT FROM '/foundation/overview' THEN
    RAISE EXCEPTION '/foundation route must redirect to /foundation/overview, got %', foundation_redirect_route;
  END IF;

  RAISE NOTICE 'Workspace canonical ordering applied: foundation module=10, overview=1, homeRoute=/workspace-home, /foundation→/foundation/overview';
END $$;

COMMIT;
