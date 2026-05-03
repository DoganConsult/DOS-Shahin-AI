-- =====================================================================
-- 0070 — Foundation registry carbon_key alignment.
--
-- Migration 20260503_0029_foundation_pages_pack.sql inserted 16
-- `foundation.*.page` rows into dos.dynamic_ui_component_registry with
-- carbon_key='data-table'. The IBM Carbon catalog
-- (dos.ui_carbon_components) only registers carbon_key='table'. The
-- carbon-dynamic-ui-coherence CI gate fails on the drift because it
-- statically parses migration INSERTs.
--
-- Effect (idempotent, forward-only): register `data-table` as a
-- deprecated-alias entry in dos.ui_carbon_components so the legacy
-- foundation rows resolve. Template-Only Routing (rule §3.1, migrations
-- 0040/0050/0060) means these foundation.*.page rows are NOT reachable
-- from any URL — Foundation routes resolve via the 32-archetype roster
-- (`module.records.page`, `module.org_chart.page`, ...). The alias row
-- exists only to keep static catalog parsers happy.
-- =====================================================================
BEGIN;

INSERT INTO dos.ui_carbon_components
  (carbon_key, package_name, package_version, category, is_experimental,
   is_active, source_component_name, integration_mode, runtime_status,
   angular_native, wrapper_required, stability, dynamic_ui_allowed,
   notes, vendor)
VALUES
  ('data-table', 'carbon-components-angular', '5.69.0', 'component', false,
   true, 'TableModule', 'deprecated-alias', 'deprecated',
   true, true, 'deprecated', false,
   'Legacy alias of carbon_key=table; retained for foundation.*.page rows registered before Template-Only Routing rule §3.1.',
   'ibm-carbon')
ON CONFLICT (carbon_key) DO NOTHING;

COMMIT;
