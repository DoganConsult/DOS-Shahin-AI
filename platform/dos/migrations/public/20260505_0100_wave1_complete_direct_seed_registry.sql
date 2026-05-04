-- Migration: 20260505_0100_wave1_complete_direct_seed_registry.sql
-- Wave 1 complete-direct-seed pack: idempotent registry rows for dynamic-ui,
-- foundation, and config-center component rosters (verified carbon_keys active).
-- ON CONFLICT merges carbon_key + metadata for drift correction.

BEGIN;

INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, approval_status, carbon_key, schema_version, metadata)
VALUES
  ('module.audit_trail_ledger.page', 'ibm-carbon', 'approved', 'table', '1',
   '{"source":"wave1-complete-direct-seed","wave":1,"modules":["foundation","config-center"]}'::jsonb),
  ('module.dashboard.page', 'ibm-carbon', 'approved', 'grid', '1',
   '{"source":"wave1-complete-direct-seed","wave":1,"modules":["config-center"],"archetype":"decision-dashboard"}'::jsonb),
  ('module.delegation_center.page', 'ibm-carbon', 'approved', 'table', '1',
   '{"source":"wave1-complete-direct-seed","wave":1,"modules":["foundation"],"archetype":"delegation-center"}'::jsonb),
  ('module.entry.page', 'ibm-carbon', 'approved', 'grid', '1',
   '{"source":"wave1-complete-direct-seed","wave":1,"modules":["dynamic-ui","foundation"]}'::jsonb),
  ('module.org_chart.page', 'ibm-carbon', 'approved', 'structured-list', '1',
   '{"source":"wave1-complete-direct-seed","wave":1,"modules":["foundation"],"archetype":"org-chart"}'::jsonb),
  ('module.ownership_map.page', 'ibm-carbon', 'approved', 'table', '1',
   '{"source":"wave1-complete-direct-seed","wave":1,"modules":["foundation"],"archetype":"ownership-map"}'::jsonb),
  ('module.posture.page', 'ibm-carbon', 'approved', 'grid', '1',
   '{"source":"wave1-complete-direct-seed","wave":1,"modules":["foundation"],"archetype":"posture-overview"}'::jsonb),
  ('module.records.page', 'ibm-carbon', 'approved', 'table', '1',
   '{"source":"wave1-complete-direct-seed","wave":1,"modules":["dynamic-ui","foundation","config-center"]}'::jsonb),
  ('module.settings.page', 'ibm-carbon', 'approved', 'tabs', '1',
   '{"source":"wave1-complete-direct-seed","wave":1,"modules":["foundation","config-center"],"archetype":"module-settings"}'::jsonb),
  ('module.trends.page', 'ibm-carbon', 'approved', 'tiles', '1',
   '{"source":"wave1-complete-direct-seed","wave":1,"modules":["config-center"],"archetype":"trend-intelligence"}'::jsonb),
  ('module.workflow_timeline.page', 'ibm-carbon', 'approved', 'progress-indicator', '1',
   '{"source":"wave1-complete-direct-seed","wave":1,"modules":["foundation"],"archetype":"workflow-timeline"}'::jsonb),
  ('module.workflows.page', 'ibm-carbon', 'approved', 'tabs', '1',
   '{"source":"wave1-complete-direct-seed","wave":1,"modules":["foundation"],"archetype":"workflow-control"}'::jsonb)
ON CONFLICT (component_key) DO UPDATE
  SET carbon_key      = EXCLUDED.carbon_key,
      approval_status = EXCLUDED.approval_status,
      metadata        = EXCLUDED.metadata,
      approved_at     = now();

COMMIT;
