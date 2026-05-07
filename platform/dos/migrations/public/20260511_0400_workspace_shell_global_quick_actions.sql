-- Workspace shell — header global quick actions (command palette + inbox).
--
-- Adds:
--   1) workspace.shell.global-quick-actions registry + CHECK allow-list entry
--   2) Per-tenant binding at header position 102 (before settings / user-menu)
--   3) Chrome JSON for typed ShellAction payloads (normalized server-side)
--
-- Canonical ordering for header trailing controls after this migration:
--   brand 100, workspace-title 101, global-quick-actions 102,
--   settings-action 103, user-menu 104
--
-- Idempotent.

BEGIN;

-- 1) Extend component_key CHECK whitelist.
ALTER TABLE dos.workspace_shell_binding
  DROP CONSTRAINT IF EXISTS chk_workspace_component_key;

ALTER TABLE dos.workspace_shell_binding
  ADD CONSTRAINT chk_workspace_component_key CHECK (
    component_key = ANY (ARRAY[
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
      'workspace.shell.brand','workspace.shell.workspace-title',
      'workspace.shell.user-menu','workspace.shell.settings-action',
      'workspace.shell.sidebar-nav','workspace.shell.empty-state',
      'workspace.shell.module-cards',
      'workspace.shell.global-quick-actions'
    ])
  );

-- 2) Registry row — renderer_key matches COMPONENT_MAP in @dos/ui-system.
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, carbon_key, schema_version, metadata,
   approval_status, approved_at, renderer_key, component_type)
VALUES
  ('workspace.shell.global-quick-actions', 'ibm-carbon', 'header-global-action', '1',
   jsonb_build_object('zone','header','role','global-quick-actions'),
   'approved', now(), 'shell.global-quick-actions', 'shell.global-quick-actions')
ON CONFLICT (component_key) DO UPDATE
  SET vendor          = EXCLUDED.vendor,
      carbon_key      = EXCLUDED.carbon_key,
      metadata        = EXCLUDED.metadata,
      approval_status = EXCLUDED.approval_status,
      approved_at     = EXCLUDED.approved_at,
      renderer_key    = EXCLUDED.renderer_key,
      component_type  = EXCLUDED.component_type;

-- 3) Normalize trailing header positions so quick-actions slot precedes settings/user.
UPDATE dos.workspace_shell_binding
   SET position = 103
 WHERE component_key = 'workspace.shell.settings-action';

UPDATE dos.workspace_shell_binding
   SET position = 104
 WHERE component_key = 'workspace.shell.user-menu';

-- 4) Per-tenant binding — props scaffold; resolver overlays chrome + actions.
WITH active_tenants AS (
  SELECT DISTINCT b.tenant_id
    FROM dos.workspace_shell_binding b
   WHERE b.enabled = true
)
INSERT INTO dos.workspace_shell_binding
  (tenant_id, component_key, enabled, position, perms_required, props, version)
SELECT t.tenant_id,
       'workspace.shell.global-quick-actions'::text,
       true,
       102,
       ARRAY[]::text[],
       jsonb_build_object('zone','header','placement','trailing'),
       1
  FROM active_tenants t
ON CONFLICT (tenant_id, component_key) DO UPDATE
  SET enabled        = true,
      position       = EXCLUDED.position,
      perms_required = EXCLUDED.perms_required,
      props          = EXCLUDED.props;

-- 5) Chrome — typed ShellAction JSON (camelCase wire shape after resolver merge).
WITH active_tenants AS (
  SELECT DISTINCT b.tenant_id
    FROM dos.workspace_shell_binding b
   WHERE b.enabled = true
), seeds(chrome_key, value_json) AS (
  VALUES
    ('shell.header.commandSearch.action'::text, '{"kind":"open_command"}'::jsonb),
    ('shell.header.inbox.action'::text, '{"kind":"open_context_tab","tab":"activity"}'::jsonb)
)
INSERT INTO dos.ui_workspace_chrome (tenant_id, chrome_key, value_json, enabled, version)
SELECT t.tenant_id, s.chrome_key, s.value_json, true, 1
  FROM active_tenants t
 CROSS JOIN seeds s
ON CONFLICT (tenant_id, chrome_key) DO UPDATE
  SET value_json = EXCLUDED.value_json,
      enabled    = true,
      updated_at = now();

COMMIT;
