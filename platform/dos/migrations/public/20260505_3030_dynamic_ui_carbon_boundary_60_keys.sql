BEGIN;

WITH required(carbon_key, component_use, category, runtime_status) AS (
  VALUES
    ('ui_shell', 'UIShell', 'shell', 'active'),
    ('header', 'Header', 'shell', 'active'),
    ('header_name', 'HeaderName', 'shell', 'active'),
    ('header_navigation', 'HeaderNavigation', 'shell', 'active'),
    ('header_menu', 'HeaderMenu', 'shell', 'active'),
    ('header_menu_item', 'HeaderMenuItem', 'shell', 'active'),
    ('header_global_bar', 'HeaderGlobalBar', 'shell', 'active'),
    ('header_global_action', 'HeaderGlobalAction', 'shell', 'active'),
    ('side_nav', 'SideNav', 'shell', 'active'),
    ('side_nav_items', 'SideNavItems', 'shell', 'active'),
    ('side_nav_menu', 'SideNavMenu', 'shell', 'active'),
    ('side_nav_menu_item', 'SideNavMenuItem', 'shell', 'active'),
    ('side_nav_link', 'SideNavLink', 'shell', 'active'),
    ('content', 'Content', 'shell', 'active'),
    ('grid', 'Grid', 'layout', 'active'),
    ('column', 'Column', 'layout', 'active'),
    ('layer', 'Layer', 'layout', 'active'),
    ('breadcrumb', 'Breadcrumb', 'component', 'active'),
    ('tabs', 'Tabs', 'component', 'active'),
    ('tab', 'Tab', 'component', 'active'),
    ('tile', 'Tile', 'component', 'active'),
    ('clickable_tile', 'ClickableTile', 'component', 'active'),
    ('expandable_tile', 'ExpandableTile', 'component', 'active'),
    ('tag', 'Tag', 'component', 'active'),
    ('data_table', 'DataTable', 'component', 'active'),
    ('table_toolbar', 'TableToolbar', 'component', 'active'),
    ('table_toolbar_search', 'TableToolbarSearch', 'component', 'active'),
    ('table_toolbar_actions', 'TableToolbarActions', 'component', 'active'),
    ('table_batch_actions', 'TableBatchActions', 'component', 'active'),
    ('pagination', 'Pagination', 'component', 'active'),
    ('structured_list', 'StructuredList', 'component', 'active'),
    ('search', 'Search', 'component', 'active'),
    ('dropdown', 'Dropdown', 'component', 'active'),
    ('combo_box', 'ComboBox', 'component', 'active'),
    ('multi_select', 'MultiSelect', 'component', 'active'),
    ('date_picker', 'DatePicker', 'component', 'active'),
    ('text_input', 'TextInput', 'component', 'active'),
    ('text_area', 'TextArea', 'component', 'active'),
    ('number_input', 'NumberInput', 'component', 'active'),
    ('select', 'Select', 'component', 'active'),
    ('checkbox', 'Checkbox', 'component', 'active'),
    ('radio', 'Radio', 'component', 'active'),
    ('toggle', 'Toggle', 'component', 'active'),
    ('button', 'Button', 'component', 'active'),
    ('icon_button', 'IconButton', 'component', 'active'),
    ('overflow_menu', 'OverflowMenu', 'component', 'active'),
    ('overflow_menu_option', 'OverflowMenuOption', 'component', 'active'),
    ('modal', 'Modal', 'component', 'active'),
    ('inline_notification', 'InlineNotification', 'component', 'active'),
    ('toast_notification', 'ToastNotification', 'component', 'active'),
    ('tooltip', 'Tooltip', 'component', 'active'),
    ('toggletip', 'Toggletip', 'component', 'active'),
    ('popover', 'Popover', 'component', 'active'),
    ('progress_bar', 'ProgressBar', 'component', 'active'),
    ('inline_loading', 'InlineLoading', 'component', 'active'),
    ('skeleton_text', 'SkeletonText', 'component', 'active'),
    ('skeleton_placeholder', 'SkeletonPlaceholder', 'component', 'active'),
    ('context_menu', 'ContextMenu', 'component', 'active'),
    ('file_uploader', 'FileUploader', 'component', 'active'),
    ('accordion', 'Accordion', 'component', 'active')
)
INSERT INTO dos.ui_carbon_components
  (carbon_key, package_name, package_version, category, is_experimental,
   is_active, source_component_name, integration_mode, runtime_status,
   angular_native, wrapper_required, stability, dynamic_ui_allowed, notes, vendor)
SELECT
  carbon_key,
  'carbon-components-angular',
  '5.69.0',
  category,
  false,
  true,
  component_use,
  'native-angular',
  runtime_status,
  true,
  true,
  'stable',
  true,
  'Dynamic UI Carbon boundary public contract key',
  'ibm-carbon'
FROM required
ON CONFLICT (carbon_key) DO UPDATE SET
  package_name = EXCLUDED.package_name,
  package_version = EXCLUDED.package_version,
  category = EXCLUDED.category,
  is_experimental = EXCLUDED.is_experimental,
  is_active = EXCLUDED.is_active,
  source_component_name = EXCLUDED.source_component_name,
  integration_mode = EXCLUDED.integration_mode,
  runtime_status = EXCLUDED.runtime_status,
  angular_native = EXCLUDED.angular_native,
  wrapper_required = EXCLUDED.wrapper_required,
  stability = EXCLUDED.stability,
  dynamic_ui_allowed = EXCLUDED.dynamic_ui_allowed,
  notes = EXCLUDED.notes,
  vendor = EXCLUDED.vendor;

WITH required(carbon_key, component_use, boundary_level, family, sort_order) AS (
  VALUES
    ('ui_shell', 'UIShell', 'workspace', 'workspace-shell-frame', 1),
    ('header', 'Header', 'workspace', 'workspace-shell-frame', 2),
    ('header_name', 'HeaderName', 'workspace', 'workspace-shell-frame', 3),
    ('header_navigation', 'HeaderNavigation', 'workspace', 'workspace-shell-frame', 4),
    ('header_menu', 'HeaderMenu', 'workspace', 'workspace-shell-frame', 5),
    ('header_menu_item', 'HeaderMenuItem', 'workspace', 'workspace-shell-frame', 6),
    ('header_global_bar', 'HeaderGlobalBar', 'workspace', 'workspace-shell-frame', 7),
    ('header_global_action', 'HeaderGlobalAction', 'workspace', 'workspace-shell-frame', 8),
    ('side_nav', 'SideNav', 'workspace', 'workspace-shell-frame', 9),
    ('side_nav_items', 'SideNavItems', 'workspace', 'workspace-shell-frame', 10),
    ('side_nav_menu', 'SideNavMenu', 'workspace', 'workspace-shell-frame', 11),
    ('side_nav_menu_item', 'SideNavMenuItem', 'workspace', 'workspace-shell-frame', 12),
    ('side_nav_link', 'SideNavLink', 'workspace', 'workspace-shell-frame', 13),
    ('content', 'Content', 'workspace', 'workspace-shell-frame', 14),
    ('grid', 'Grid', 'page', 'layout', 15),
    ('column', 'Column', 'page', 'layout', 16),
    ('layer', 'Layer', 'page', 'layout', 17),
    ('breadcrumb', 'Breadcrumb', 'page', 'navigation-context', 18),
    ('tabs', 'Tabs', 'page', 'tabs', 19),
    ('tab', 'Tab', 'page', 'tabs', 20),
    ('tile', 'Tile', 'page', 'panel', 21),
    ('clickable_tile', 'ClickableTile', 'page', 'panel', 22),
    ('expandable_tile', 'ExpandableTile', 'page', 'panel', 23),
    ('tag', 'Tag', 'page', 'status-label', 24),
    ('data_table', 'DataTable', 'page', 'data', 25),
    ('table_toolbar', 'TableToolbar', 'page', 'data', 26),
    ('table_toolbar_search', 'TableToolbarSearch', 'page', 'data', 27),
    ('table_toolbar_actions', 'TableToolbarActions', 'page', 'data', 28),
    ('table_batch_actions', 'TableBatchActions', 'page', 'data', 29),
    ('pagination', 'Pagination', 'page', 'data', 30),
    ('structured_list', 'StructuredList', 'page', 'data', 31),
    ('search', 'Search', 'page', 'input', 32),
    ('dropdown', 'Dropdown', 'page', 'input', 33),
    ('combo_box', 'ComboBox', 'page', 'input', 34),
    ('multi_select', 'MultiSelect', 'page', 'input', 35),
    ('date_picker', 'DatePicker', 'page', 'input', 36),
    ('text_input', 'TextInput', 'page', 'input', 37),
    ('text_area', 'TextArea', 'page', 'input', 38),
    ('number_input', 'NumberInput', 'page', 'input', 39),
    ('select', 'Select', 'page', 'input', 40),
    ('checkbox', 'Checkbox', 'page', 'input', 41),
    ('radio', 'Radio', 'page', 'input', 42),
    ('toggle', 'Toggle', 'page', 'input', 43),
    ('button', 'Button', 'page', 'action', 44),
    ('icon_button', 'IconButton', 'page', 'action', 45),
    ('overflow_menu', 'OverflowMenu', 'page', 'action', 46),
    ('overflow_menu_option', 'OverflowMenuOption', 'page', 'action', 47),
    ('modal', 'Modal', 'page', 'overlay', 48),
    ('inline_notification', 'InlineNotification', 'page', 'feedback', 49),
    ('toast_notification', 'ToastNotification', 'page', 'feedback', 50),
    ('tooltip', 'Tooltip', 'page', 'polish', 51),
    ('toggletip', 'Toggletip', 'page', 'polish', 52),
    ('popover', 'Popover', 'page', 'polish', 53),
    ('progress_bar', 'ProgressBar', 'page', 'polish', 54),
    ('inline_loading', 'InlineLoading', 'page', 'polish', 55),
    ('skeleton_text', 'SkeletonText', 'page', 'polish', 56),
    ('skeleton_placeholder', 'SkeletonPlaceholder', 'page', 'polish', 57),
    ('context_menu', 'ContextMenu', 'page', 'polish', 58),
    ('file_uploader', 'FileUploader', 'page', 'polish', 59),
    ('accordion', 'Accordion', 'page', 'polish', 60)
)
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, bundle_url, schema_version, vendor, approval_status, carbon_key, metadata, approved_at)
SELECT
  carbon_key,
  '/carbon/' || carbon_key || '.bundle.js',
  '1',
  'ibm-carbon',
  'approved',
  carbon_key,
  jsonb_build_object(
    'componentUse', component_use,
    'boundary_level', boundary_level,
    'family', family,
    'sort_order', sort_order,
    'public_contract', 'dynamic-ui-carbon-boundary-v1'
  ),
  now()
FROM required
ON CONFLICT (component_key) DO UPDATE SET
  bundle_url = EXCLUDED.bundle_url,
  schema_version = EXCLUDED.schema_version,
  vendor = EXCLUDED.vendor,
  approval_status = EXCLUDED.approval_status,
  carbon_key = EXCLUDED.carbon_key,
  metadata = EXCLUDED.metadata,
  approved_at = COALESCE(dos.dynamic_ui_component_registry.approved_at, now());

DO $$
DECLARE
  missing_catalog integer;
  missing_registry integer;
BEGIN
  WITH required(carbon_key) AS (
    VALUES
      ('ui_shell'),('header'),('header_name'),('header_navigation'),('header_menu'),('header_menu_item'),('header_global_bar'),('header_global_action'),('side_nav'),('side_nav_items'),('side_nav_menu'),('side_nav_menu_item'),('side_nav_link'),('content'),('grid'),('column'),('layer'),('breadcrumb'),('tabs'),('tab'),('tile'),('clickable_tile'),('expandable_tile'),('tag'),('data_table'),('table_toolbar'),('table_toolbar_search'),('table_toolbar_actions'),('table_batch_actions'),('pagination'),('structured_list'),('search'),('dropdown'),('combo_box'),('multi_select'),('date_picker'),('text_input'),('text_area'),('number_input'),('select'),('checkbox'),('radio'),('toggle'),('button'),('icon_button'),('overflow_menu'),('overflow_menu_option'),('modal'),('inline_notification'),('toast_notification'),('tooltip'),('toggletip'),('popover'),('progress_bar'),('inline_loading'),('skeleton_text'),('skeleton_placeholder'),('context_menu'),('file_uploader'),('accordion')
  )
  SELECT count(*) INTO missing_catalog
  FROM required r
  LEFT JOIN dos.ui_carbon_components c ON c.carbon_key = r.carbon_key
  WHERE c.carbon_key IS NULL
     OR c.vendor <> 'ibm-carbon'
     OR c.is_active IS DISTINCT FROM true
     OR c.runtime_status NOT IN ('active', 'wrapper-required');

  WITH required(carbon_key) AS (
    VALUES
      ('ui_shell'),('header'),('header_name'),('header_navigation'),('header_menu'),('header_menu_item'),('header_global_bar'),('header_global_action'),('side_nav'),('side_nav_items'),('side_nav_menu'),('side_nav_menu_item'),('side_nav_link'),('content'),('grid'),('column'),('layer'),('breadcrumb'),('tabs'),('tab'),('tile'),('clickable_tile'),('expandable_tile'),('tag'),('data_table'),('table_toolbar'),('table_toolbar_search'),('table_toolbar_actions'),('table_batch_actions'),('pagination'),('structured_list'),('search'),('dropdown'),('combo_box'),('multi_select'),('date_picker'),('text_input'),('text_area'),('number_input'),('select'),('checkbox'),('radio'),('toggle'),('button'),('icon_button'),('overflow_menu'),('overflow_menu_option'),('modal'),('inline_notification'),('toast_notification'),('tooltip'),('toggletip'),('popover'),('progress_bar'),('inline_loading'),('skeleton_text'),('skeleton_placeholder'),('context_menu'),('file_uploader'),('accordion')
  )
  SELECT count(*) INTO missing_registry
  FROM required r
  LEFT JOIN dos.dynamic_ui_component_registry d
    ON d.component_key = r.carbon_key
   AND d.carbon_key = r.carbon_key
   AND d.vendor = 'ibm-carbon'
   AND d.approval_status = 'approved'
  WHERE d.component_key IS NULL;

  IF missing_catalog <> 0 THEN
    RAISE EXCEPTION 'dynamic-ui-carbon-boundary catalog assertion failed: % missing/invalid', missing_catalog;
  END IF;
  IF missing_registry <> 0 THEN
    RAISE EXCEPTION 'dynamic-ui-carbon-boundary registry assertion failed: % missing/invalid', missing_registry;
  END IF;
END $$;

COMMIT;
