-- DB_VISUAL_SHELL_SEED_WAVE
-- Forward-only. Adds the six canonical visual shell surfaces required
-- by the Option-A hybrid-static COMPONENT_MAP and seeds one binding
-- per active tenant for each. ShellHost stays render-only; every visible
-- shell pixel now flows from these rows.
--
-- Surfaces:
--   workspace.shell.brand              header  → DosShellBrand
--   workspace.shell.workspace-title    header  → DosShellWorkspaceTitle
--   workspace.shell.user-menu          header  → DosShellUserMenu
--   workspace.shell.settings-action    header  → DosShellSettingsAction
--   workspace.shell.sidebar-nav        sidebar → DosShellSidebarNav
--   workspace.shell.empty-state        main    → DosEmptyState
--
-- Shell-safe rule: the resolver's sensitive-zone perm gate already
-- exempts `workspace.frame.*` via `isShellFoundation`. This migration
-- intentionally relies on that exemption being widened to
-- `workspace.shell.*` (resolver patch lands in the same wave) so the
-- empty perms_required[] is acceptable for the main empty-state row.
-- Header / sidebar bindings sit in SAFE_EMPTY_PERMS_ZONES already.
--
-- Idempotent.

BEGIN;

-- 1) Allow the new component_keys in the workspace_shell_binding CHECK
--    constraint. Drop + re-add with the union of existing + new keys.
ALTER TABLE dos.workspace_shell_binding
  DROP CONSTRAINT IF EXISTS chk_workspace_component_key;

ALTER TABLE dos.workspace_shell_binding
  ADD CONSTRAINT chk_workspace_component_key CHECK (
    component_key = ANY (ARRAY[
      -- existing whitelist preserved
      'workspace.frame.ui-shell','workspace.frame.header','workspace.frame.header-name',
      'workspace.frame.header-navigation','workspace.frame.header-menu','workspace.frame.header-menu-item',
      'workspace.frame.header-global-bar','workspace.frame.header-global-action',
      'workspace.frame.side-nav','workspace.frame.side-nav-items','workspace.frame.side-nav-menu',
      'workspace.frame.side-nav-menu-item','workspace.frame.side-nav-link','workspace.frame.content',
      'workspace.nav.grid','workspace.nav.column','workspace.nav.layer','workspace.nav.breadcrumb',
      'workspace.nav.tabs','workspace.nav.tab','workspace.nav.tile','workspace.nav.clickable-tile',
      'workspace.nav.expandable-tile','workspace.nav.tag',
      'workspace.data.data-table','workspace.data.table-toolbar','workspace.data.table-toolbar-search',
      'workspace.data.table-toolbar-actions','workspace.data.table-batch-actions',
      'workspace.data.pagination','workspace.data.structured-list',
      'workspace.input.search','workspace.input.dropdown','workspace.input.combo-box',
      'workspace.input.multi-select','workspace.input.date-picker','workspace.input.text-input',
      'workspace.input.text-area','workspace.input.number-input','workspace.input.select',
      'workspace.input.checkbox','workspace.input.radio','workspace.input.toggle',
      'workspace.action.button','workspace.action.icon-button','workspace.action.overflow-menu',
      'workspace.action.overflow-menu-option','workspace.action.modal',
      'workspace.action.inline-notification','workspace.action.toast-notification',
      'workspace.polish.tooltip','workspace.polish.toggletip','workspace.polish.popover',
      'workspace.polish.progress-bar','workspace.polish.inline-loading','workspace.polish.skeleton-text',
      'workspace.polish.skeleton-placeholder','workspace.polish.context-menu',
      'workspace.polish.file-uploader','workspace.polish.accordion',
      -- new visual shell surfaces (Option A hybrid-static COMPONENT_MAP)
      'workspace.shell.brand','workspace.shell.workspace-title',
      'workspace.shell.user-menu','workspace.shell.settings-action',
      'workspace.shell.sidebar-nav','workspace.shell.empty-state'
    ])
  );

-- 2) Registry rows (vendor='ibm-carbon', approval_status='approved').
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, carbon_key, schema_version, metadata,
   approval_status, approved_at, renderer_key, component_type)
VALUES
  ('workspace.shell.brand',           'ibm-carbon', 'header-name',          '1',
   jsonb_build_object('zone','header','role','brand'),
   'approved', now(), 'shell.brand',           'shell.brand'),
  ('workspace.shell.workspace-title', 'ibm-carbon', 'header-name',          '1',
   jsonb_build_object('zone','header','role','title'),
   'approved', now(), 'shell.workspace-title', 'shell.workspace-title'),
  ('workspace.shell.user-menu',       'ibm-carbon', 'header-global-action', '1',
   jsonb_build_object('zone','header','role','user-menu'),
   'approved', now(), 'shell.user-menu',       'shell.user-menu'),
  ('workspace.shell.settings-action', 'ibm-carbon', 'header-global-action', '1',
   jsonb_build_object('zone','header','role','settings'),
   'approved', now(), 'shell.settings-action', 'shell.settings-action'),
  ('workspace.shell.sidebar-nav',     'ibm-carbon', 'side-nav-items',       '1',
   jsonb_build_object('zone','sidebar','role','primary-nav'),
   'approved', now(), 'shell.sidebar-nav',     'shell.sidebar-nav'),
  ('workspace.shell.empty-state',     'ibm-carbon', 'tile',                 '1',
   jsonb_build_object('zone','main','role','empty-state'),
   'approved', now(), 'shell.empty-state',     'shell.empty-state')
ON CONFLICT (component_key) DO UPDATE
  SET vendor          = EXCLUDED.vendor,
      carbon_key      = EXCLUDED.carbon_key,
      metadata        = EXCLUDED.metadata,
      approval_status = EXCLUDED.approval_status,
      approved_at     = EXCLUDED.approved_at,
      renderer_key    = EXCLUDED.renderer_key,
      component_type  = EXCLUDED.component_type;

-- 3) Per-tenant bindings — one row per (tenant, surface). Position is
--    chosen high enough not to collide with the existing frame rows
--    (1-14) but low enough to keep deterministic ordering.
WITH active_tenants AS (
  SELECT DISTINCT b.tenant_id
    FROM dos.workspace_shell_binding b
   WHERE b.enabled = true
), seeds(component_key, position, props) AS (
  VALUES
    ('workspace.shell.brand'::text,           100, jsonb_build_object('text','Dogan-AI OS','zone','header')),
    ('workspace.shell.workspace-title',       101, jsonb_build_object('text','Workspace','zone','header')),
    ('workspace.shell.settings-action',       102, jsonb_build_object('icon','settings','ariaLabel','Settings','zone','header')),
    ('workspace.shell.user-menu',             103, jsonb_build_object('label','Account','zone','header')),
    ('workspace.shell.sidebar-nav',           110, jsonb_build_object('items', jsonb_build_array(), 'zone','sidebar')),
    ('workspace.shell.empty-state',           120, jsonb_build_object(
      'title','Workspace ready',
      'description','Module surfaces will appear here once activated.',
      'icon','dashboard',
      'tone','info',
      'zone','main'
    ))
)
INSERT INTO dos.workspace_shell_binding
  (tenant_id, component_key, enabled, position, perms_required, props, version)
SELECT t.tenant_id, s.component_key, true, s.position, ARRAY[]::text[], s.props, 1
  FROM active_tenants t
 CROSS JOIN seeds s
ON CONFLICT (tenant_id, component_key) DO UPDATE
  SET enabled        = true,
      position       = EXCLUDED.position,
      perms_required = EXCLUDED.perms_required,
      props          = EXCLUDED.props;

COMMIT;
