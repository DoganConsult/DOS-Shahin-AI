-- Workspace shell — real content wave (sidebar nav from entitled nav,
-- module cards from entitled modules, account/settings ShellAction
-- wiring from chrome.accountMenu).
--
-- Adds:
--   1) workspace.shell.module-cards registry row + per-tenant binding
--      (main zone). Resolver enriches props.items live from
--      tenant_module_entitlements ⨝ module_registry.
--   2) Baseline tenant_module_entitlements seed for every active tenant
--      that has an active product activation, joined with the
--      module_registry rows that share the activation's product key.
--      Without this seed every workspace renders empty (which is
--      doctrine-correct but demonstrates nothing live). The seed uses
--      source='platform_dna' so ops can distinguish it from paid /
--      trial entitlements.
--   3) Allow-list update for the new shell component_key.
--
-- Idempotent.

BEGIN;

-- 1) CHECK constraint — extend the canonical visual shell whitelist.
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
      'workspace.shell.module-cards'
    ])
  );

-- 2) Registry row.
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, carbon_key, schema_version, metadata,
   approval_status, approved_at, renderer_key, component_type)
VALUES
  ('workspace.shell.module-cards', 'ibm-carbon', 'tile', '1',
   jsonb_build_object('zone','main','role','module-cards'),
   'approved', now(), 'shell.module-cards', 'shell.module-cards')
ON CONFLICT (component_key) DO UPDATE
  SET vendor          = EXCLUDED.vendor,
      carbon_key      = EXCLUDED.carbon_key,
      metadata        = EXCLUDED.metadata,
      approval_status = EXCLUDED.approval_status,
      approved_at     = EXCLUDED.approved_at,
      renderer_key    = EXCLUDED.renderer_key,
      component_type  = EXCLUDED.component_type;

-- 3) Per-tenant binding for module-cards (main zone, position 121 — sits
--    just after the empty-state seed at 120 so when entitled modules
--    exist the cards render and the empty-state still serves as the
--    deterministic zero-content surface).
WITH active_tenants AS (
  SELECT DISTINCT b.tenant_id
    FROM dos.workspace_shell_binding b
   WHERE b.enabled = true
)
INSERT INTO dos.workspace_shell_binding
  (tenant_id, component_key, enabled, position, perms_required, props, version)
SELECT t.tenant_id, 'workspace.shell.module-cards', true, 121,
       ARRAY[]::text[],
       jsonb_build_object('items', jsonb_build_array(), 'zone','main'),
       1
  FROM active_tenants t
ON CONFLICT (tenant_id, component_key) DO UPDATE
  SET enabled        = true,
      position       = EXCLUDED.position,
      perms_required = EXCLUDED.perms_required,
      props          = EXCLUDED.props;

-- 4) Baseline entitlement seed — any active tenant × active product
--    activation × module_registry row sharing the product_key.
INSERT INTO dos.tenant_module_entitlements
  (entitlement_id, tenant_id, product_code, module_code,
   entitlement_status, source, limits_json, starts_at, metadata)
SELECT
  substr(md5(random()::text || clock_timestamp()::text), 1, 32),
  pa.tenant_id,
  pa.product_key,
  m.module_code,
  'active',
  'platform_dna',
  '{}'::jsonb,
  now(),
  jsonb_build_object('seededBy','20260508_0370')
FROM dos.tenant_product_activation pa
JOIN dos.module_registry m
  ON m.product_key = pa.product_key
JOIN dos.tenants t
  ON t.tenant_id = pa.tenant_id
WHERE pa.status = 'active'
  AND t.status = 'active'
  AND m.status IN ('active','available','unavailable')
ON CONFLICT (tenant_id, product_code, module_code)
  WHERE entitlement_status = 'active'
  DO NOTHING;

COMMIT;
