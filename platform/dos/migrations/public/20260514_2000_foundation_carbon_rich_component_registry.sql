-- =====================================================================
-- Foundation Module — Carbon-Rich Component Registry
-- Adds foundation.page.* and foundation.widget.* entries so that
-- every Foundation page archetype and widget primitive has a named,
-- typed, approved Carbon binding in dynamic_ui_component_registry.
--
-- vendor         : ibm-carbon
-- approval_status: approved
-- schema_version : 1.0.0
-- Idempotent     : ON CONFLICT (component_key) DO NOTHING
-- =====================================================================

BEGIN;

INSERT INTO dos.dynamic_ui_component_registry
  (component_key, carbon_key, renderer_key, vendor, approval_status,
   component_type, schema_version, metadata, bundle_url, approved_at, created_at)
VALUES

-- ── Page archetypes ──────────────────────────────────────────────────

('foundation.page.list',
 'data_table', 'foundation.renderer.list-page',
 'ibm-carbon', 'approved', 'page-template', '1.0.0',
 '{"zone":"main","catalog_only":false,"shell_renderable":true,
   "archetype":"intelligent-register",
   "carbon_primitives":["DataTable","Toolbar","TableSearch","TableBatchActions","Pagination"],
   "description":"Carbon DataTable list page with toolbar, search, filter and pagination"}'::jsonb,
 NULL, NOW(), NOW()),

('foundation.page.org-chart',
 'treeview', 'foundation.renderer.org-chart-page',
 'ibm-carbon', 'approved', 'page-template', '1.0.0',
 '{"zone":"main","catalog_only":false,"shell_renderable":true,
   "archetype":"org-chart",
   "carbon_primitives":["TreeView","StructuredList","Tile","Tabs"],
   "description":"Carbon TreeView hierarchy page with structured-list detail panel"}'::jsonb,
 NULL, NOW(), NOW()),

('foundation.page.workflow',
 'progress-indicator', 'foundation.renderer.workflow-page',
 'ibm-carbon', 'approved', 'page-template', '1.0.0',
 '{"zone":"main","catalog_only":false,"shell_renderable":true,
   "archetype":"workflow-control",
   "carbon_primitives":["ProgressIndicator","Tabs","DataTable","Tag","InlineNotification"],
   "description":"Carbon ProgressIndicator workflow page with tabs and status tags"}'::jsonb,
 NULL, NOW(), NOW()),

('foundation.page.delegation',
 'data_table', 'foundation.renderer.delegation-page',
 'ibm-carbon', 'approved', 'page-template', '1.0.0',
 '{"zone":"main","catalog_only":false,"shell_renderable":true,
   "archetype":"delegation-center",
   "carbon_primitives":["DataTable","ProgressIndicator","ComposedModal","Tag","Toolbar"],
   "description":"Carbon DataTable delegation page with approval workflow and modal"}'::jsonb,
 NULL, NOW(), NOW()),

('foundation.page.governance',
 'data_table', 'foundation.renderer.governance-page',
 'ibm-carbon', 'approved', 'page-template', '1.0.0',
 '{"zone":"main","catalog_only":false,"shell_renderable":true,
   "archetype":"ownership-map",
   "carbon_primitives":["DataTable","Tabs","ChartDonut","StructuredList","Tag"],
   "description":"Carbon governance pivot page with ownership data-table and donut distribution"}'::jsonb,
 NULL, NOW(), NOW()),

('foundation.page.dashboard',
 'grid', 'foundation.renderer.dashboard-page',
 'ibm-carbon', 'approved', 'page-template', '1.0.0',
 '{"zone":"main","catalog_only":false,"shell_renderable":true,
   "archetype":"command-home",
   "carbon_primitives":["Grid","Tile","AspectRatio","ChartLine","ChartDonut","Tag","InlineNotification"],
   "description":"Carbon tile-grid dashboard with KPI cards, line and donut charts"}'::jsonb,
 NULL, NOW(), NOW()),

('foundation.page.posture',
 'grid', 'foundation.renderer.posture-page',
 'ibm-carbon', 'approved', 'page-template', '1.0.0',
 '{"zone":"main","catalog_only":false,"shell_renderable":true,
   "archetype":"posture-overview",
   "carbon_primitives":["Grid","Tile","ChartGauge","ChartDonut","ActionableNotification","Tag"],
   "description":"Carbon posture diagnostic tile-grid with gauge and actionable notifications"}'::jsonb,
 NULL, NOW(), NOW()),

('foundation.page.audit',
 'data_table', 'foundation.renderer.audit-page',
 'ibm-carbon', 'approved', 'page-template', '1.0.0',
 '{"zone":"main","catalog_only":false,"shell_renderable":true,
   "archetype":"audit-trail-ledger",
   "carbon_primitives":["DataTable","Tag","ChartBar","ChartLine","InlineNotification","Toolbar"],
   "description":"Carbon audit log data-table with severity tags and trend charts"}'::jsonb,
 NULL, NOW(), NOW()),

('foundation.page.settings',
 'forms', 'foundation.renderer.settings-page',
 'ibm-carbon', 'approved', 'page-template', '1.0.0',
 '{"zone":"main","catalog_only":false,"shell_renderable":true,
   "archetype":"module-settings",
   "carbon_primitives":["Tabs","Form","TextInput","Dropdown","Toggle","StructuredList","InlineNotification"],
   "description":"Carbon tabbed settings form page with toggle inputs and structured sections"}'::jsonb,
 NULL, NOW(), NOW()),

('foundation.page.reports',
 'grid', 'foundation.renderer.reports-page',
 'ibm-carbon', 'approved', 'page-template', '1.0.0',
 '{"zone":"main","catalog_only":false,"shell_renderable":true,
   "archetype":"audit-trail-ledger",
   "carbon_primitives":["Grid","Tile","ChartBar","ChartLine","ChartDonut","Tag","Button"],
   "description":"Carbon report tile-grid with downloadable chart tiles and export actions"}'::jsonb,
 NULL, NOW(), NOW()),

('foundation.page.form',
 'forms', 'foundation.renderer.form-page',
 'ibm-carbon', 'approved', 'page-template', '1.0.0',
 '{"zone":"main","catalog_only":false,"shell_renderable":true,
   "archetype":"guided-create",
   "carbon_primitives":["ProgressIndicator","Form","TextInput","Dropdown","MultiSelect","DatePicker","Toggle","ComposedModal"],
   "description":"Carbon multi-step guided create form with progress indicator and modal confirmation"}'::jsonb,
 NULL, NOW(), NOW()),

-- ── Widget primitives ─────────────────────────────────────────────────

('foundation.widget.kpi-tile',
 'tile', 'foundation.renderer.kpi-tile',
 'ibm-carbon', 'approved', 'widget', '1.0.0',
 '{"zone":"kpi-bar","catalog_only":false,"shell_renderable":true,
   "carbon_primitives":["Tile","AspectRatio","Tag"],
   "slots":["metric","label","trend","delta"],
   "description":"Carbon KPI metric tile with trend delta and status tag"}'::jsonb,
 NULL, NOW(), NOW()),

('foundation.widget.chart-bar',
 'chart.bar.simple', 'foundation.renderer.chart-bar',
 'ibm-carbon', 'approved', 'widget', '1.0.0',
 '{"zone":"charts","catalog_only":false,"shell_renderable":true,
   "carbon_primitives":["SimpleBarChart"],
   "description":"Carbon Charts simple bar chart for counts/trends"}'::jsonb,
 NULL, NOW(), NOW()),

('foundation.widget.chart-donut',
 'chart.donut', 'foundation.renderer.chart-donut',
 'ibm-carbon', 'approved', 'widget', '1.0.0',
 '{"zone":"charts","catalog_only":false,"shell_renderable":true,
   "carbon_primitives":["DonutChart"],
   "description":"Carbon Charts donut chart for distribution/composition"}'::jsonb,
 NULL, NOW(), NOW()),

('foundation.widget.chart-line',
 'chart.line', 'foundation.renderer.chart-line',
 'ibm-carbon', 'approved', 'widget', '1.0.0',
 '{"zone":"charts","catalog_only":false,"shell_renderable":true,
   "carbon_primitives":["LineChart"],
   "description":"Carbon Charts line chart for time-series trends"}'::jsonb,
 NULL, NOW(), NOW()),

('foundation.widget.chart-gauge',
 'chart.gauge', 'foundation.renderer.chart-gauge',
 'ibm-carbon', 'approved', 'widget', '1.0.0',
 '{"zone":"charts","catalog_only":false,"shell_renderable":true,
   "carbon_primitives":["GaugeChart"],
   "description":"Carbon Charts gauge chart for posture/compliance score"}'::jsonb,
 NULL, NOW(), NOW()),

('foundation.widget.structured-list',
 'structured-list', 'foundation.renderer.structured-list',
 'ibm-carbon', 'approved', 'widget', '1.0.0',
 '{"zone":"detail","catalog_only":false,"shell_renderable":true,
   "carbon_primitives":["StructuredList","StructuredListHead","StructuredListBody","StructuredListRow"],
   "description":"Carbon StructuredList for static detail rows and property panels"}'::jsonb,
 NULL, NOW(), NOW()),

('foundation.widget.tag-cluster',
 'tag', 'foundation.renderer.tag-cluster',
 'ibm-carbon', 'approved', 'widget', '1.0.0',
 '{"zone":"status","catalog_only":false,"shell_renderable":true,
   "carbon_primitives":["Tag"],
   "description":"Carbon Tag cluster for status, severity and category labels"}'::jsonb,
 NULL, NOW(), NOW()),

('foundation.widget.notification-inline',
 'inline-notification', 'foundation.renderer.notification-inline',
 'ibm-carbon', 'approved', 'widget', '1.0.0',
 '{"zone":"notifications","catalog_only":false,"shell_renderable":true,
   "carbon_primitives":["InlineNotification"],
   "description":"Carbon InlineNotification for surface-level status and warnings"}'::jsonb,
 NULL, NOW(), NOW()),

('foundation.widget.notification-actionable',
 'notification', 'foundation.renderer.notification-actionable',
 'ibm-carbon', 'approved', 'widget', '1.0.0',
 '{"zone":"notifications","catalog_only":false,"shell_renderable":true,
   "carbon_primitives":["ActionableNotification"],
   "description":"Carbon ActionableNotification for guided remediation prompts"}'::jsonb,
 NULL, NOW(), NOW()),

('foundation.widget.modal',
 'modal', 'foundation.renderer.modal',
 'ibm-carbon', 'approved', 'widget', '1.0.0',
 '{"zone":"modal","catalog_only":false,"shell_renderable":true,
   "carbon_primitives":["ComposedModal","ModalHeader","ModalBody","ModalFooter"],
   "description":"Carbon ComposedModal for confirmations, details and guided flows"}'::jsonb,
 NULL, NOW(), NOW()),

('foundation.widget.progress-indicator',
 'progress-indicator', 'foundation.renderer.progress-indicator',
 'ibm-carbon', 'approved', 'widget', '1.0.0',
 '{"zone":"wizard","catalog_only":false,"shell_renderable":true,
   "carbon_primitives":["ProgressIndicator","ProgressStep"],
   "description":"Carbon ProgressIndicator for multi-step form wizards and workflow stages"}'::jsonb,
 NULL, NOW(), NOW()),

('foundation.widget.skeleton',
 'skeleton-text', 'foundation.renderer.skeleton',
 'ibm-carbon', 'approved', 'widget', '1.0.0',
 '{"zone":"skeleton","catalog_only":false,"shell_renderable":true,
   "carbon_primitives":["SkeletonText","SkeletonPlaceholder"],
   "description":"Carbon Skeleton loaders for page and widget loading states"}'::jsonb,
 NULL, NOW(), NOW()),

('foundation.widget.page-header',
 'product-wc.page-header', 'foundation.renderer.page-header',
 'ibm-carbon', 'approved', 'widget', '1.0.0',
 '{"zone":"header","catalog_only":false,"shell_renderable":true,
   "carbon_primitives":["PageHeader","Breadcrumb","BreadcrumbItem","Tag"],
   "description":"IBM Products PageHeader with breadcrumb, eyebrow, title and status tags"}'::jsonb,
 NULL, NOW(), NOW()),

('foundation.widget.tabs',
 'tabs', 'foundation.renderer.tabs',
 'ibm-carbon', 'approved', 'widget', '1.0.0',
 '{"zone":"nav","catalog_only":false,"shell_renderable":true,
   "carbon_primitives":["Tabs","TabList","Tab","TabPanels","TabPanel"],
   "description":"Carbon Tabs for sub-page navigation and content pivoting"}'::jsonb,
 NULL, NOW(), NOW()),

('foundation.widget.toolbar',
 'table_toolbar', 'foundation.renderer.toolbar',
 'ibm-carbon', 'approved', 'widget', '1.0.0',
 '{"zone":"toolbar","catalog_only":false,"shell_renderable":true,
   "carbon_primitives":["TableToolbar","TableToolbarContent","TableToolbarSearch","TableToolbarMenu","Button"],
   "description":"Carbon DataTable Toolbar with search, filters and primary action button"}'::jsonb,
 NULL, NOW(), NOW()),

('foundation.widget.form-section',
 'forms', 'foundation.renderer.form-section',
 'ibm-carbon', 'approved', 'widget', '1.0.0',
 '{"zone":"form","catalog_only":false,"shell_renderable":true,
   "carbon_primitives":["Form","FormGroup","TextInput","NumberInput","Dropdown","MultiSelect","DatePicker","Toggle","FluidForm"],
   "description":"Carbon Form section with labelled input fields for create/edit pages"}'::jsonb,
 NULL, NOW(), NOW()),

('foundation.widget.data-table',
 'data_table', 'foundation.renderer.data-table',
 'ibm-carbon', 'approved', 'widget', '1.0.0',
 '{"zone":"main","catalog_only":false,"shell_renderable":true,
   "carbon_primitives":["DataTable","Table","TableHead","TableBody","TableRow","TableCell","Pagination"],
   "description":"Carbon DataTable widget for standalone tabular data display"}'::jsonb,
 NULL, NOW(), NOW())

ON CONFLICT (component_key) DO NOTHING;

-- ── Assertion ──────────────────────────────────────────────────────────
DO $$
DECLARE
  v_page_count   int;
  v_widget_count int;
BEGIN
  SELECT count(*) INTO v_page_count
    FROM dos.dynamic_ui_component_registry
   WHERE component_key LIKE 'foundation.page.%'
     AND vendor = 'ibm-carbon' AND approval_status = 'approved';

  SELECT count(*) INTO v_widget_count
    FROM dos.dynamic_ui_component_registry
   WHERE component_key LIKE 'foundation.widget.%'
     AND vendor = 'ibm-carbon' AND approval_status = 'approved';

  IF v_page_count < 11 THEN
    RAISE EXCEPTION 'FAIL: expected >=11 foundation.page.* registry rows, found %', v_page_count;
  END IF;
  IF v_widget_count < 17 THEN
    RAISE EXCEPTION 'FAIL: expected >=17 foundation.widget.* registry rows, found %', v_widget_count;
  END IF;

  RAISE NOTICE 'OK: % foundation.page.* + % foundation.widget.* component registry rows',
    v_page_count, v_widget_count;
END $$;

COMMIT;
