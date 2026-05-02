-- 0153 DOWN — Remove the four @carbon/themes rows.
BEGIN;
DELETE FROM dos.ui_carbon_components WHERE package_name = '@carbon/themes';
DELETE FROM dos.schema_migrations WHERE filename = '20260502_0153_carbon_themes_catalog.sql';
COMMIT;
