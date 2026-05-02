-- 0152 DOWN — Remove the stacked-line chart row.
BEGIN;
DELETE FROM dos.ui_carbon_components WHERE carbon_key = 'chart.line.stacked';
DELETE FROM dos.schema_migrations WHERE filename = '20260502_0152_carbon_charts_complete_to_26.sql';
COMMIT;
