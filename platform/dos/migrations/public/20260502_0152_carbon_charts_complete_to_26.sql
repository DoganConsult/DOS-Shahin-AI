-- 0152 — Complete @carbon/charts-angular catalog to canonical 26.
--
-- Source of truth: carbondesignsystem.com states "a library that currently
-- consists of 26 different chart types". Migration 0150 seeded 25 chart
-- rows, missing stacked-line. This row closes the gap.
-- =====================================================================
BEGIN;

INSERT INTO dos.ui_carbon_components
  (carbon_key, package_name, package_version, source_component_name,
   category, is_experimental, is_active,
   integration_mode, runtime_status, angular_native, wrapper_required,
   stability, dynamic_ui_allowed, notes)
VALUES
  ('chart.line.stacked', '@carbon/charts-angular', '1.27.8', 'StackedLineChart',
     'chart', FALSE, TRUE,
     'angular-chart', 'active', TRUE, TRUE,
     'stable', FALSE,
     'Renders via DosCarbonChartComponent.chartType=line.stacked. 26th canonical Carbon Charts type per carbondesignsystem.com.')
ON CONFLICT (carbon_key) DO UPDATE
  SET package_name        = EXCLUDED.package_name,
      package_version     = EXCLUDED.package_version,
      source_component_name = EXCLUDED.source_component_name,
      category            = EXCLUDED.category,
      integration_mode    = EXCLUDED.integration_mode,
      runtime_status      = EXCLUDED.runtime_status,
      angular_native      = EXCLUDED.angular_native,
      wrapper_required    = EXCLUDED.wrapper_required,
      stability           = EXCLUDED.stability,
      dynamic_ui_allowed  = EXCLUDED.dynamic_ui_allowed,
      notes               = EXCLUDED.notes,
      is_active           = TRUE;

DO $$
DECLARE n INTEGER;
BEGIN
  SELECT COUNT(*) INTO n FROM dos.ui_carbon_components WHERE package_name='@carbon/charts-angular';
  IF n <> 26 THEN
    RAISE EXCEPTION '0152: chart catalog total drift — got %, want exactly 26', n;
  END IF;
  RAISE NOTICE 'OK — @carbon/charts-angular total = 26 (canonical)';
END $$;

INSERT INTO dos.schema_migrations (filename, checksum, applied_by)
SELECT '20260502_0152_carbon_charts_complete_to_26.sql', 'inline-0152', 'system'
 WHERE NOT EXISTS (
   SELECT 1 FROM dos.schema_migrations WHERE filename = '20260502_0152_carbon_charts_complete_to_26.sql'
 );

COMMIT;
