-- Phase WS-Catalog — Truth-up Carbon shell-component catalog.
-- Owner: Platform DNA / ui-os-service.
--
-- Adds the shell-level IBM Carbon component_keys mandated by the Workspace
-- Host policy to dos.ui_carbon_components. Two classes only:
--   1. Real Carbon Angular exports        → runtime_status='active'
--   2. Semantic shell keys / React-only   → runtime_status='wrapper-required'
--                                           (a @dos/ui-system wrapper owns
--                                            the alias; FK from
--                                            dynamic_ui_component_registry
--                                            stays valid)
--
-- Also rebinds workspace.mobile-nav from the wrong 'tiles' carbon_key to the
-- shell-correct 'side-nav' key now that the latter exists in the catalog.
--
-- Forward-only and idempotent (ON CONFLICT DO UPDATE).
-- Paired down: 20260504_0200_workspace_shell_carbon_catalog_down.sql.

BEGIN;

-- ─── 1. Active rows — direct 1:1 carbon-components-angular exports ────────
-- Verified against node_modules/carbon-components-angular/<pkg>/**/*.d.ts:
--   ui-shell/header/header.component.d.ts            → Header
--   ui-shell/header/header-navigation.component.d.ts → HeaderNavigation
--   ui-shell/header/header-menu.component.d.ts       → HeaderMenu
--   ui-shell/sidenav/sidenav.component.d.ts          → SideNav
--   ui-shell/sidenav/sidenav-menu.component.d.ts     → SideNavMenu
--   layout/column.directive.d.ts                     → ColumnDirective
--   skeleton/skeleton-text.component.d.ts            → SkeletonText
--   skeleton/skeleton-placeholder.component.d.ts     → SkeletonPlaceholder
--   notification/notification.component.d.ts         → Notification (kind=inline)
--   notification/toast.component.d.ts                → Toast
INSERT INTO dos.ui_carbon_components
  (carbon_key, package_name, package_version, category, vendor,
   integration_mode, runtime_status, angular_native, wrapper_required,
   stability, dynamic_ui_allowed, source_component_name, notes)
VALUES
  ('header',               'carbon-components-angular', '5.69.0', 'shell',     'ibm-carbon',
   'native-angular', 'active', true, false, 'stable', true, 'Header',
   'Workspace shell header. cds-header.'),
  ('header-navigation',    'carbon-components-angular', '5.69.0', 'shell',     'ibm-carbon',
   'native-angular', 'active', true, false, 'stable', true, 'HeaderNavigation',
   'Workspace shell top navigation. cds-header-navigation.'),
  ('header-menu',          'carbon-components-angular', '5.69.0', 'shell',     'ibm-carbon',
   'native-angular', 'active', true, false, 'stable', true, 'HeaderMenu',
   'Workspace shell header menu group. cds-header-menu.'),
  ('side-nav',             'carbon-components-angular', '5.69.0', 'shell',     'ibm-carbon',
   'native-angular', 'active', true, false, 'stable', true, 'SideNav',
   'Workspace shell sidebar container. cds-sidenav.'),
  ('side-nav-menu',        'carbon-components-angular', '5.69.0', 'shell',     'ibm-carbon',
   'native-angular', 'active', true, false, 'stable', true, 'SideNavMenu',
   'Workspace shell sidebar group. cds-sidenav-menu.'),
  ('column',               'carbon-components-angular', '5.69.0', 'layout',    'ibm-carbon',
   'native-angular', 'active', true, false, 'stable', true, 'ColumnDirective',
   'Carbon grid column. cdsCol.'),
  ('skeleton-text',        'carbon-components-angular', '5.69.0', 'component', 'ibm-carbon',
   'native-angular', 'active', true, false, 'stable', true, 'SkeletonText',
   'Loading skeleton — text lines. cds-skeleton-text.'),
  ('skeleton-placeholder', 'carbon-components-angular', '5.69.0', 'component', 'ibm-carbon',
   'native-angular', 'active', true, false, 'stable', true, 'SkeletonPlaceholder',
   'Loading skeleton — placeholder. cds-skeleton-placeholder.'),
  ('inline-notification',  'carbon-components-angular', '5.69.0', 'component', 'ibm-carbon',
   'native-angular', 'active', true, false, 'stable', true, 'Notification',
   'Inline notification. cds-notification (kind=inline).'),
  ('toast-notification',   'carbon-components-angular', '5.69.0', 'component', 'ibm-carbon',
   'native-angular', 'active', true, false, 'stable', true, 'Toast',
   'Toast notification. cds-toast.')
ON CONFLICT (carbon_key) DO UPDATE SET
  category              = EXCLUDED.category,
  integration_mode      = EXCLUDED.integration_mode,
  runtime_status        = EXCLUDED.runtime_status,
  angular_native        = EXCLUDED.angular_native,
  wrapper_required      = EXCLUDED.wrapper_required,
  stability             = EXCLUDED.stability,
  dynamic_ui_allowed    = EXCLUDED.dynamic_ui_allowed,
  source_component_name = EXCLUDED.source_component_name,
  notes                 = EXCLUDED.notes,
  is_active             = true;

-- ─── 2. Wrapper-required rows — semantic shell keys with no 1:1 export ────
-- These are NOT separate Angular classes. A @dos/ui-system wrapper owns each
-- alias and composes the underlying Carbon primitive (named in `notes`).
-- Until the wrapper exists the registry MUST NOT bind to these keys (the
-- runtime_status='wrapper-required' contract enforces that).
--
-- overflow-menu / overflow-menu-option are React-only in IBM Carbon; we use
-- integration_mode='react-only-reference' to record the upstream gap and
-- 'wrapper-required' so a DOS wrapper substitutes (menu-button + popover
-- pattern) rather than ever loading the React variant.
INSERT INTO dos.ui_carbon_components
  (carbon_key, package_name, package_version, category, vendor,
   integration_mode, runtime_status, angular_native, wrapper_required,
   stability, dynamic_ui_allowed, source_component_name, notes)
VALUES
  ('header-name',          'carbon-components-angular', '5.69.0', 'shell',     'ibm-carbon',
   'native-angular',        'wrapper-required', false, true, 'stable', true, NULL,
   'Semantic alias. Renders via Header [name] input — no separate class. Wrapper: @dos/ui-system shell.'),
  ('header-menu-item',     'carbon-components-angular', '5.69.0', 'shell',     'ibm-carbon',
   'native-angular',        'wrapper-required', false, true, 'stable', true, NULL,
   'Semantic alias of HeaderItem inside HeaderMenu. Wrapper: @dos/ui-system shell.'),
  ('header-global-bar',    'carbon-components-angular', '5.69.0', 'shell',     'ibm-carbon',
   'native-angular',        'wrapper-required', false, true, 'stable', true, NULL,
   'Semantic alias of HeaderGlobal. Wrapper: @dos/ui-system shell.'),
  ('header-global-action', 'carbon-components-angular', '5.69.0', 'shell',     'ibm-carbon',
   'native-angular',        'wrapper-required', false, true, 'stable', true, NULL,
   'Semantic alias of HeaderAction. Wrapper: @dos/ui-system shell.'),
  ('side-nav-items',       'carbon-components-angular', '5.69.0', 'shell',     'ibm-carbon',
   'native-angular',        'wrapper-required', false, true, 'stable', true, NULL,
   'Structural slot inside SideNav. No separate Angular class. Wrapper: @dos/ui-system shell.'),
  ('side-nav-menu-item',   'carbon-components-angular', '5.69.0', 'shell',     'ibm-carbon',
   'native-angular',        'wrapper-required', false, true, 'stable', true, NULL,
   'Semantic alias of SideNavItem inside SideNavMenu. Wrapper: @dos/ui-system shell.'),
  ('side-nav-link',        'carbon-components-angular', '5.69.0', 'shell',     'ibm-carbon',
   'native-angular',        'wrapper-required', false, true, 'stable', true, NULL,
   'Semantic alias of SideNavItem with router/href. Wrapper: @dos/ui-system shell.'),
  ('content',              'carbon-components-angular', '5.69.0', 'layout',    'ibm-carbon',
   'native-angular',        'wrapper-required', false, true, 'stable', true, NULL,
   'Page content slot — Carbon ships the .cds--content class only. Wrapper: @dos/ui-system content slot.'),
  ('overflow-menu',        'carbon-components-angular', '5.69.0', 'component', 'ibm-carbon',
   'react-only-reference',  'wrapper-required', false, true, 'stable', true, NULL,
   'OverflowMenu is React-only in IBM Carbon. Wrapper: @dos/ui-system uses MenuButton+popover.'),
  ('overflow-menu-option', 'carbon-components-angular', '5.69.0', 'component', 'ibm-carbon',
   'react-only-reference',  'wrapper-required', false, true, 'stable', true, NULL,
   'OverflowMenuOption is React-only in IBM Carbon. Wrapper: @dos/ui-system menu-item primitive.')
ON CONFLICT (carbon_key) DO UPDATE SET
  category              = EXCLUDED.category,
  integration_mode      = EXCLUDED.integration_mode,
  runtime_status        = EXCLUDED.runtime_status,
  angular_native        = EXCLUDED.angular_native,
  wrapper_required      = EXCLUDED.wrapper_required,
  stability             = EXCLUDED.stability,
  dynamic_ui_allowed    = EXCLUDED.dynamic_ui_allowed,
  source_component_name = EXCLUDED.source_component_name,
  notes                 = EXCLUDED.notes,
  is_active             = true;

-- ─── 3. Registry rebind — workspace.mobile-nav: 'tiles' → 'side-nav' ──────
-- Only the row whose carbon_key currently points to a non-shell key (tiles)
-- is updated. workspace.action-queue / workspace.agent-strip stay on 'tiles'
-- pending the broader workspace-shell wrapper plan (out of scope here).
UPDATE dos.dynamic_ui_component_registry
   SET carbon_key = 'side-nav',
       metadata   = COALESCE(metadata, '{}'::jsonb)
                    || jsonb_build_object('carbon_primitive','SideNav')
 WHERE component_key = 'workspace.mobile-nav'
   AND carbon_key    = 'tiles';

COMMIT;
