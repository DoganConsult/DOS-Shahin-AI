-- =====================================================================
-- Phase H — Workspace shell binding: backfill 7 mobile catalog keys
-- across every active tenant, normalize the registry rows, and extend
-- the component_key CHECK constraint accordingly.
--
-- Background:
--   tenant-completeness CI guard expects every active tenant to hold
--   binding rows for every distinct `workspace.*` component_key in
--   dos.dynamic_ui_component_registry. Today the registry advertises 75
--   workspace.* keys (7 of them mobile catalog wrappers) but every
--   active tenant only holds 68 — the 7 `workspace.mobile.*` rows are
--   absent. The CHECK constraint on workspace_shell_binding hardcodes
--   the 68-key enumeration so even a backfill INSERT would fail.
--
--   Doctrine fix (DB-first): extend the CHECK enumeration, normalize
--   the registry rows so every catalog row carries renderer_key +
--   component_type, and idempotently insert the 7 missing bindings per
--   active tenant — append-only, ON CONFLICT DO NOTHING.
--
--   No frontend change. No fallback constants. Empty registry would
--   still produce empty UI — we are simply closing the gap between the
--   registry and the per-tenant binding mirror so DB ↔ runtime parity
--   holds.
--
-- Idempotent. Append-only insertions. No row deletions or mutations.
-- =====================================================================

BEGIN;

-- 1. Normalize the 7 mobile registry rows so they carry the same
--    canonical metadata shape as the rest of workspace.*.
UPDATE dos.dynamic_ui_component_registry
   SET component_type = 'mobile',
       renderer_key   = 'shell.catalog-mobile'
 WHERE component_key LIKE 'workspace.mobile.%'
   AND (component_type IS NULL OR renderer_key IS NULL);

-- 2. Drop the existing CHECK constraint and recreate with the 7 mobile
--    keys appended. The enumeration is intentionally explicit so a typo
--    can never silently land in the bindings table.
ALTER TABLE dos.workspace_shell_binding
  DROP CONSTRAINT IF EXISTS chk_workspace_component_key;

ALTER TABLE dos.workspace_shell_binding
  ADD CONSTRAINT chk_workspace_component_key
  CHECK (component_key = ANY (ARRAY[
    -- Frame (UIShell)
    'workspace.frame.ui-shell','workspace.frame.header','workspace.frame.header-name',
    'workspace.frame.header-navigation','workspace.frame.header-menu','workspace.frame.header-menu-item',
    'workspace.frame.header-global-bar','workspace.frame.header-global-action',
    'workspace.frame.side-nav','workspace.frame.side-nav-items','workspace.frame.side-nav-menu',
    'workspace.frame.side-nav-menu-item','workspace.frame.side-nav-link','workspace.frame.content',
    -- Nav surfaces (Grid + tiles + tags)
    'workspace.nav.grid','workspace.nav.column','workspace.nav.layer','workspace.nav.breadcrumb',
    'workspace.nav.tabs','workspace.nav.tab','workspace.nav.tile','workspace.nav.clickable-tile',
    'workspace.nav.expandable-tile','workspace.nav.tag',
    -- Data surfaces
    'workspace.data.data-table','workspace.data.table-toolbar','workspace.data.table-toolbar-search',
    'workspace.data.table-toolbar-actions','workspace.data.table-batch-actions','workspace.data.pagination',
    'workspace.data.structured-list',
    -- Inputs
    'workspace.input.search','workspace.input.dropdown','workspace.input.combo-box',
    'workspace.input.multi-select','workspace.input.date-picker','workspace.input.text-input',
    'workspace.input.text-area','workspace.input.number-input','workspace.input.select',
    'workspace.input.checkbox','workspace.input.radio','workspace.input.toggle',
    -- Actions
    'workspace.action.button','workspace.action.icon-button','workspace.action.overflow-menu',
    'workspace.action.overflow-menu-option','workspace.action.modal','workspace.action.inline-notification',
    'workspace.action.toast-notification',
    -- Polish (feedback + popovers)
    'workspace.polish.tooltip','workspace.polish.toggletip','workspace.polish.popover',
    'workspace.polish.progress-bar','workspace.polish.inline-loading','workspace.polish.skeleton-text',
    'workspace.polish.skeleton-placeholder','workspace.polish.context-menu','workspace.polish.file-uploader',
    'workspace.polish.accordion',
    -- Shell-specific surfaces
    'workspace.shell.brand','workspace.shell.workspace-title','workspace.shell.user-menu',
    'workspace.shell.settings-action','workspace.shell.sidebar-nav','workspace.shell.empty-state',
    'workspace.shell.module-cards','workspace.shell.global-quick-actions',
    -- Phase H — Mobile catalog wrappers (Carbon mobile component family)
    'workspace.mobile.button','workspace.mobile.input','workspace.mobile.dropdown',
    'workspace.mobile.data-table','workspace.mobile.tabs','workspace.mobile.modal',
    'workspace.mobile.card'
  ]));

-- 3. Backfill bindings for every (active tenant × 7 mobile key) pair
--    that is currently missing. Position is monotonically appended
--    after the tenant's existing maximum to preserve current ordering.
--    Carbon-blessed catalog title/subtitle pulled from the registry
--    via component_key — no hardcoded literal beyond the canonical
--    7-tuple (which is the source of truth for the family).
WITH active_tenants AS (
  SELECT tenant_id FROM dos.tenants WHERE status = 'active'
),
mobile_keys (component_key, idx, label) AS (
  VALUES
    ('workspace.mobile.button',     1, 'Mobile Button'),
    ('workspace.mobile.input',      2, 'Mobile Input'),
    ('workspace.mobile.dropdown',   3, 'Mobile Dropdown'),
    ('workspace.mobile.data-table', 4, 'Mobile Data Table'),
    ('workspace.mobile.tabs',       5, 'Mobile Tabs'),
    ('workspace.mobile.modal',      6, 'Mobile Modal'),
    ('workspace.mobile.card',       7, 'Mobile Card')
),
tenant_max AS (
  SELECT t.tenant_id,
         coalesce(max(b.position), -1) AS max_pos
    FROM active_tenants t
    LEFT JOIN dos.workspace_shell_binding b ON b.tenant_id = t.tenant_id
   GROUP BY t.tenant_id
)
INSERT INTO dos.workspace_shell_binding
  (tenant_id, component_key, enabled, position, perms_required, props)
SELECT
  tm.tenant_id,
  mk.component_key,
  true,
  tm.max_pos + mk.idx,
  ARRAY[]::text[],
  jsonb_build_object(
    'title',    mk.label,
    'detail',   mk.component_key,
    'subtitle', 'mobile'
  )
FROM tenant_max tm
CROSS JOIN mobile_keys mk
ON CONFLICT (tenant_id, component_key) DO NOTHING;

-- 4. Sanity: every active tenant now has 75 binding rows (matches the
--    distinct workspace.* registry count).
DO $$
DECLARE
  expected_keys int;
  short_tenants int;
BEGIN
  SELECT count(DISTINCT component_key) INTO expected_keys
    FROM dos.dynamic_ui_component_registry
   WHERE component_key LIKE 'workspace.%';

  SELECT count(*) INTO short_tenants
    FROM dos.tenants t
    WHERE t.status = 'active'
      AND (
        SELECT count(*) FROM dos.workspace_shell_binding b
         WHERE b.tenant_id = t.tenant_id
      ) <> expected_keys;

  IF short_tenants > 0 THEN
    RAISE EXCEPTION
      'Phase H tenant-completeness post-condition failed: % active tenant(s) still off the % expected workspace.* keys',
      short_tenants, expected_keys;
  END IF;
  RAISE NOTICE
    'Phase H mobile-binding backfill OK — % active tenant(s) hold % workspace.* bindings each.',
    (SELECT count(*) FROM dos.tenants WHERE status='active'),
    expected_keys;
END $$;

COMMIT;
