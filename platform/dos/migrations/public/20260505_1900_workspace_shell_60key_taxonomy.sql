-- Phase WS-7 — Workspace-shell 60-key taxonomy expansion (v3.0).
-- Replaces old 30-key layout (groups 1-7) with 60-key taxonomy (bands A-F).
-- Forward-only, idempotent.

BEGIN;

-- ─── 0. Drop old CHECK constraint ──────────────────────────────────────────
ALTER TABLE dos.workspace_shell_binding DROP CONSTRAINT IF EXISTS chk_workspace_component_key;

-- ─── 1. Delete stale registry rows (old shell.*/page.*/workspace.* keys) ──
DELETE FROM dos.dynamic_ui_component_registry
 WHERE component_key IN (
   'shell.app','shell.desktop','shell.mobile','shell.desktop-sidebar',
   'workspace.header','workspace.sidebar','workspace.mobile-nav',
   'shell.mobile-drawer','shell.workspace-nav','shell.nav-section','shell.nav-item',
   'workspace.command-search','workspace.inbox-center','workspace.quick-create',
   'workspace.context-panel','shell.account-menu',
   'workspace.status-bar','workspace.action-queue','workspace.agent-strip',
   'shell.banner-strip','shell.toast-outlet',
   'page.layout','page.masthead','page.header','page.tabs','page.widget-frame',
   'workspace.selectable-tile','workspace.clickable-tile','workspace.expandable-tile','workspace.ai-tile'
 );

-- ─── 2. Delete stale binding rows ──────────────────────────────────────────
DELETE FROM dos.workspace_shell_binding
 WHERE component_key NOT LIKE 'workspace.frame.%'
   AND component_key NOT LIKE 'workspace.nav.%'
   AND component_key NOT LIKE 'workspace.data.%'
   AND component_key NOT LIKE 'workspace.input.%'
   AND component_key NOT LIKE 'workspace.action.%'
   AND component_key NOT LIKE 'workspace.polish.%';

-- ─── 3. UPSERT 60 registry rows ────────────────────────────────────────────
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, bundle_url, schema_version, vendor, approval_status, carbon_key, metadata)
VALUES
  ('workspace.frame.ui-shell','/ws/frame/ui-shell.js',1,'ibm-carbon','approved','ui-shell','{"band":"A","position":1}'::jsonb),
  ('workspace.frame.header','/ws/frame/header.js',1,'ibm-carbon','approved','header','{"band":"A","position":2}'::jsonb),
  ('workspace.frame.header-name','/ws/frame/header-name.js',1,'ibm-carbon','approved','header-name','{"band":"A","position":3}'::jsonb),
  ('workspace.frame.header-navigation','/ws/frame/header-navigation.js',1,'ibm-carbon','approved','header-navigation','{"band":"A","position":4}'::jsonb),
  ('workspace.frame.header-menu','/ws/frame/header-menu.js',1,'ibm-carbon','approved','header-menu','{"band":"A","position":5}'::jsonb),
  ('workspace.frame.header-menu-item','/ws/frame/header-menu-item.js',1,'ibm-carbon','approved','header-menu-item','{"band":"A","position":6}'::jsonb),
  ('workspace.frame.header-global-bar','/ws/frame/header-global-bar.js',1,'ibm-carbon','approved','header-global-bar','{"band":"A","position":7}'::jsonb),
  ('workspace.frame.header-global-action','/ws/frame/header-global-action.js',1,'ibm-carbon','approved','header-global-action','{"band":"A","position":8}'::jsonb),
  ('workspace.frame.side-nav','/ws/frame/side-nav.js',1,'ibm-carbon','approved','side-nav','{"band":"A","position":9}'::jsonb),
  ('workspace.frame.side-nav-items','/ws/frame/side-nav-items.js',1,'ibm-carbon','approved','side-nav-items','{"band":"A","position":10}'::jsonb),
  ('workspace.frame.side-nav-menu','/ws/frame/side-nav-menu.js',1,'ibm-carbon','approved','side-nav-menu','{"band":"A","position":11}'::jsonb),
  ('workspace.frame.side-nav-menu-item','/ws/frame/side-nav-menu-item.js',1,'ibm-carbon','approved','side-nav-menu-item','{"band":"A","position":12}'::jsonb),
  ('workspace.frame.side-nav-link','/ws/frame/side-nav-link.js',1,'ibm-carbon','approved','side-nav-link','{"band":"A","position":13}'::jsonb),
  ('workspace.frame.content','/ws/frame/content.js',1,'ibm-carbon','approved','content','{"band":"A","position":14}'::jsonb),
  ('workspace.nav.grid','/ws/nav/grid.js',1,'ibm-carbon','approved','grid','{"band":"B","position":15}'::jsonb),
  ('workspace.nav.column','/ws/nav/column.js',1,'ibm-carbon','approved','column','{"band":"B","position":16}'::jsonb),
  ('workspace.nav.layer','/ws/nav/layer.js',1,'ibm-carbon','approved','layer','{"band":"B","position":17}'::jsonb),
  ('workspace.nav.breadcrumb','/ws/nav/breadcrumb.js',1,'ibm-carbon','approved','breadcrumb','{"band":"B","position":18}'::jsonb),
  ('workspace.nav.tabs','/ws/nav/tabs.js',1,'ibm-carbon','approved','tabs','{"band":"B","position":19}'::jsonb),
  ('workspace.nav.tab','/ws/nav/tab.js',1,'ibm-carbon','approved','tab','{"band":"B","position":20}'::jsonb),
  ('workspace.nav.tile','/ws/nav/tile.js',1,'ibm-carbon','approved','tile','{"band":"B","position":21}'::jsonb),
  ('workspace.nav.clickable-tile','/ws/nav/clickable-tile.js',1,'ibm-carbon','approved','clickable-tile','{"band":"B","position":22}'::jsonb),
  ('workspace.nav.expandable-tile','/ws/nav/expandable-tile.js',1,'ibm-carbon','approved','expandable-tile','{"band":"B","position":23}'::jsonb),
  ('workspace.nav.tag','/ws/nav/tag.js',1,'ibm-carbon','approved','tag','{"band":"B","position":24}'::jsonb),
  ('workspace.data.data-table','/ws/data/data-table.js',1,'ibm-carbon','approved','data_table','{"band":"C","position":25}'::jsonb),
  ('workspace.data.table-toolbar','/ws/data/table-toolbar.js',1,'ibm-carbon','approved','table_toolbar','{"band":"C","position":26}'::jsonb),
  ('workspace.data.table-toolbar-search','/ws/data/table-toolbar-search.js',1,'ibm-carbon','approved','table_toolbar_search','{"band":"C","position":27}'::jsonb),
  ('workspace.data.table-toolbar-actions','/ws/data/table-toolbar-actions.js',1,'ibm-carbon','approved','table_toolbar_actions','{"band":"C","position":28}'::jsonb),
  ('workspace.data.table-batch-actions','/ws/data/table-batch-actions.js',1,'ibm-carbon','approved','table_batch_actions','{"band":"C","position":29}'::jsonb),
  ('workspace.data.pagination','/ws/data/pagination.js',1,'ibm-carbon','approved','pagination','{"band":"C","position":30}'::jsonb),
  ('workspace.data.structured-list','/ws/data/structured-list.js',1,'ibm-carbon','approved','structured-list','{"band":"C","position":31}'::jsonb),
  ('workspace.input.search','/ws/input/search.js',1,'ibm-carbon','approved','search','{"band":"D","position":32}'::jsonb),
  ('workspace.input.dropdown','/ws/input/dropdown.js',1,'ibm-carbon','approved','dropdown','{"band":"D","position":33}'::jsonb),
  ('workspace.input.combo-box','/ws/input/combo-box.js',1,'ibm-carbon','approved','combo_box','{"band":"D","position":34}'::jsonb),
  ('workspace.input.multi-select','/ws/input/multi-select.js',1,'ibm-carbon','approved','multi_select','{"band":"D","position":35}'::jsonb),
  ('workspace.input.date-picker','/ws/input/date-picker.js',1,'ibm-carbon','approved','date_picker','{"band":"D","position":36}'::jsonb),
  ('workspace.input.text-input','/ws/input/text-input.js',1,'ibm-carbon','approved','text_input','{"band":"D","position":37}'::jsonb),
  ('workspace.input.text-area','/ws/input/text-area.js',1,'ibm-carbon','approved','text_area','{"band":"D","position":38}'::jsonb),
  ('workspace.input.number-input','/ws/input/number-input.js',1,'ibm-carbon','approved','number-input','{"band":"D","position":39}'::jsonb),
  ('workspace.input.select','/ws/input/select.js',1,'ibm-carbon','approved','select','{"band":"D","position":40}'::jsonb),
  ('workspace.input.checkbox','/ws/input/checkbox.js',1,'ibm-carbon','approved','checkbox','{"band":"D","position":41}'::jsonb),
  ('workspace.input.radio','/ws/input/radio.js',1,'ibm-carbon','approved','radio','{"band":"D","position":42}'::jsonb),
  ('workspace.input.toggle','/ws/input/toggle.js',1,'ibm-carbon','approved','toggle','{"band":"D","position":43}'::jsonb),
  ('workspace.action.button','/ws/action/button.js',1,'ibm-carbon','approved','button','{"band":"E","position":44}'::jsonb),
  ('workspace.action.icon-button','/ws/action/icon-button.js',1,'ibm-carbon','approved','icon_button','{"band":"E","position":45}'::jsonb),
  ('workspace.action.overflow-menu','/ws/action/overflow-menu.js',1,'ibm-carbon','approved','overflow-menu','{"band":"E","position":46}'::jsonb),
  ('workspace.action.overflow-menu-option','/ws/action/overflow-menu-option.js',1,'ibm-carbon','approved','overflow-menu-option','{"band":"E","position":47}'::jsonb),
  ('workspace.action.modal','/ws/action/modal.js',1,'ibm-carbon','approved','modal','{"band":"E","position":48}'::jsonb),
  ('workspace.action.inline-notification','/ws/action/inline-notification.js',1,'ibm-carbon','approved','inline-notification','{"band":"E","position":49}'::jsonb),
  ('workspace.action.toast-notification','/ws/action/toast-notification.js',1,'ibm-carbon','approved','toast-notification','{"band":"E","position":50}'::jsonb),
  ('workspace.polish.tooltip','/ws/polish/tooltip.js',1,'ibm-carbon','approved','tooltip','{"band":"F","position":51}'::jsonb),
  ('workspace.polish.toggletip','/ws/polish/toggletip.js',1,'ibm-carbon','approved','toggletip','{"band":"F","position":52}'::jsonb),
  ('workspace.polish.popover','/ws/polish/popover.js',1,'ibm-carbon','approved','popover','{"band":"F","position":53}'::jsonb),
  ('workspace.polish.progress-bar','/ws/polish/progress-bar.js',1,'ibm-carbon','approved','progress-bar','{"band":"F","position":54}'::jsonb),
  ('workspace.polish.inline-loading','/ws/polish/inline-loading.js',1,'ibm-carbon','approved','inline-loading','{"band":"F","position":55}'::jsonb),
  ('workspace.polish.skeleton-text','/ws/polish/skeleton-text.js',1,'ibm-carbon','approved','skeleton-text','{"band":"F","position":56}'::jsonb),
  ('workspace.polish.skeleton-placeholder','/ws/polish/skeleton-placeholder.js',1,'ibm-carbon','approved','skeleton-placeholder','{"band":"F","position":57}'::jsonb),
  ('workspace.polish.context-menu','/ws/polish/context-menu.js',1,'ibm-carbon','approved','context-menu','{"band":"F","position":58}'::jsonb),
  ('workspace.polish.file-uploader','/ws/polish/file-uploader.js',1,'ibm-carbon','approved','file-uploader','{"band":"F","position":59}'::jsonb),
  ('workspace.polish.accordion','/ws/polish/accordion.js',1,'ibm-carbon','approved','accordion','{"band":"F","position":60}'::jsonb)
ON CONFLICT (component_key) DO UPDATE SET
  bundle_url=EXCLUDED.bundle_url, schema_version=EXCLUDED.schema_version,
  vendor=EXCLUDED.vendor, approval_status=EXCLUDED.approval_status,
  carbon_key=EXCLUDED.carbon_key, metadata=EXCLUDED.metadata,
  approved_at=COALESCE(dos.dynamic_ui_component_registry.approved_at, now());

-- ─── 4. Add new CHECK constraint ───────────────────────────────────────────
ALTER TABLE dos.workspace_shell_binding ADD CONSTRAINT chk_workspace_component_key CHECK (
  component_key IN (
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
    'workspace.polish.file-uploader','workspace.polish.accordion'
  )
);

-- ─── 5. Seed 60 bindings per tenant ────────────────────────────────────────
INSERT INTO dos.workspace_shell_binding (tenant_id, component_key, position, perms_required, props)
SELECT t.tenant_id, ck.component_key, ck.pos, ck.perms, '{}'::jsonb
  FROM dos.tenants t
 CROSS JOIN (VALUES
  ('workspace.frame.ui-shell',1,ARRAY[]::text[]),('workspace.frame.header',2,ARRAY[]::text[]),
  ('workspace.frame.header-name',3,ARRAY[]::text[]),('workspace.frame.header-navigation',4,ARRAY[]::text[]),
  ('workspace.frame.header-menu',5,ARRAY[]::text[]),('workspace.frame.header-menu-item',6,ARRAY[]::text[]),
  ('workspace.frame.header-global-bar',7,ARRAY[]::text[]),('workspace.frame.header-global-action',8,ARRAY[]::text[]),
  ('workspace.frame.side-nav',9,ARRAY[]::text[]),('workspace.frame.side-nav-items',10,ARRAY[]::text[]),
  ('workspace.frame.side-nav-menu',11,ARRAY[]::text[]),('workspace.frame.side-nav-menu-item',12,ARRAY[]::text[]),
  ('workspace.frame.side-nav-link',13,ARRAY[]::text[]),('workspace.frame.content',14,ARRAY[]::text[]),
  ('workspace.nav.grid',15,ARRAY[]::text[]),('workspace.nav.column',16,ARRAY[]::text[]),
  ('workspace.nav.layer',17,ARRAY[]::text[]),('workspace.nav.breadcrumb',18,ARRAY[]::text[]),
  ('workspace.nav.tabs',19,ARRAY[]::text[]),('workspace.nav.tab',20,ARRAY[]::text[]),
  ('workspace.nav.tile',21,ARRAY[]::text[]),('workspace.nav.clickable-tile',22,ARRAY[]::text[]),
  ('workspace.nav.expandable-tile',23,ARRAY[]::text[]),('workspace.nav.tag',24,ARRAY[]::text[]),
  ('workspace.data.data-table',25,ARRAY[]::text[]),('workspace.data.table-toolbar',26,ARRAY[]::text[]),
  ('workspace.data.table-toolbar-search',27,ARRAY[]::text[]),('workspace.data.table-toolbar-actions',28,ARRAY[]::text[]),
  ('workspace.data.table-batch-actions',29,ARRAY[]::text[]),('workspace.data.pagination',30,ARRAY[]::text[]),
  ('workspace.data.structured-list',31,ARRAY[]::text[]),
  ('workspace.input.search',32,ARRAY[]::text[]),('workspace.input.dropdown',33,ARRAY[]::text[]),
  ('workspace.input.combo-box',34,ARRAY[]::text[]),('workspace.input.multi-select',35,ARRAY[]::text[]),
  ('workspace.input.date-picker',36,ARRAY[]::text[]),('workspace.input.text-input',37,ARRAY[]::text[]),
  ('workspace.input.text-area',38,ARRAY[]::text[]),('workspace.input.number-input',39,ARRAY[]::text[]),
  ('workspace.input.select',40,ARRAY[]::text[]),('workspace.input.checkbox',41,ARRAY[]::text[]),
  ('workspace.input.radio',42,ARRAY[]::text[]),('workspace.input.toggle',43,ARRAY[]::text[]),
  ('workspace.action.button',44,ARRAY[]::text[]),('workspace.action.icon-button',45,ARRAY[]::text[]),
  ('workspace.action.overflow-menu',46,ARRAY[]::text[]),('workspace.action.overflow-menu-option',47,ARRAY[]::text[]),
  ('workspace.action.modal',48,ARRAY[]::text[]),('workspace.action.inline-notification',49,ARRAY[]::text[]),
  ('workspace.action.toast-notification',50,ARRAY[]::text[]),
  ('workspace.polish.tooltip',51,ARRAY[]::text[]),('workspace.polish.toggletip',52,ARRAY[]::text[]),
  ('workspace.polish.popover',53,ARRAY[]::text[]),('workspace.polish.progress-bar',54,ARRAY[]::text[]),
  ('workspace.polish.inline-loading',55,ARRAY[]::text[]),('workspace.polish.skeleton-text',56,ARRAY[]::text[]),
  ('workspace.polish.skeleton-placeholder',57,ARRAY[]::text[]),('workspace.polish.context-menu',58,ARRAY[]::text[]),
  ('workspace.polish.file-uploader',59,ARRAY[]::text[]),('workspace.polish.accordion',60,ARRAY[]::text[])
) AS ck(component_key, pos, perms)
ON CONFLICT (tenant_id, component_key) DO NOTHING;

-- ─── 6. Sanity checks ──────────────────────────────────────────────────────
DO $$
DECLARE v_reg INTEGER; v_bind INTEGER; v_tenants INTEGER;
BEGIN
  SELECT count(*) INTO v_reg FROM dos.dynamic_ui_component_registry
   WHERE component_key LIKE 'workspace.%';
  SELECT count(*) INTO v_bind FROM dos.workspace_shell_binding;
  SELECT count(*) INTO v_tenants FROM dos.tenants;
  IF v_reg < 60 THEN RAISE EXCEPTION 'registry: expected >=60, got %', v_reg; END IF;
  IF v_bind < v_tenants * 60 THEN RAISE EXCEPTION 'bindings: expected >= % (% tenants x 60), got %', v_tenants*60, v_tenants, v_bind; END IF;
  RAISE NOTICE 'WS-7 OK: registry=%, bindings=%, tenants=%', v_reg, v_bind, v_tenants;
END $$;

COMMIT;
