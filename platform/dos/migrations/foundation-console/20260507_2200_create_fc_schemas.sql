-- Foundation-Console: create isolated schemas + runtime role.
-- Idempotent. Safe re-run. Adds nothing destructive to legacy dos.* schema.
--
-- Scope:
--   - fc_ui_os.*       owned by Foundation Console's UI-OS service
--   - fc_dynamic_ui.*  owned by Foundation Console's Dynamic UI service
--   - fc_app           runtime role used by Foundation Console services
--
-- Legacy dos.* schema remains untouched and continues serving the
-- Shahin app + legacy ui-os-service during the freeze window.

BEGIN;

-- ── Schemas ────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS fc_ui_os;
COMMENT ON SCHEMA fc_ui_os IS
  'Foundation Console UI-OS runtime tables. Owned by foundation-ui-os service. No legacy normalization.';

CREATE SCHEMA IF NOT EXISTS fc_dynamic_ui;
COMMENT ON SCHEMA fc_dynamic_ui IS
  'Foundation Console Dynamic UI tables (component registry, contracts, modules). Owned by foundation-dynamic-ui service.';

-- ── Runtime role ───────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'fc_app') THEN
    CREATE ROLE fc_app LOGIN PASSWORD 'fc_app_pass_change_me';
  END IF;
END
$$;

-- Grant usage on the new schemas only. No access to legacy dos.*.
GRANT USAGE ON SCHEMA fc_ui_os       TO fc_app;
GRANT USAGE ON SCHEMA fc_dynamic_ui  TO fc_app;

-- Future-proof default privileges for tables/sequences created later
-- by the migrator (so fc_app sees them without re-grant per migration).
ALTER DEFAULT PRIVILEGES IN SCHEMA fc_ui_os
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO fc_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA fc_ui_os
  GRANT USAGE, SELECT ON SEQUENCES TO fc_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA fc_dynamic_ui
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO fc_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA fc_dynamic_ui
  GRANT USAGE, SELECT ON SEQUENCES TO fc_app;

-- ── Migration tracker (per-schema, isolated from legacy) ───────────────
CREATE TABLE IF NOT EXISTS fc_ui_os.schema_migrations (
  id           text PRIMARY KEY,
  applied_at   timestamptz NOT NULL DEFAULT now(),
  checksum     text,
  description  text
);

CREATE TABLE IF NOT EXISTS fc_dynamic_ui.schema_migrations (
  id           text PRIMARY KEY,
  applied_at   timestamptz NOT NULL DEFAULT now(),
  checksum     text,
  description  text
);

INSERT INTO fc_ui_os.schema_migrations (id, description)
  VALUES ('20260507_2200_create_fc_schemas',
          'Bootstrap fc_ui_os + fc_dynamic_ui + fc_app role')
ON CONFLICT (id) DO NOTHING;

INSERT INTO fc_dynamic_ui.schema_migrations (id, description)
  VALUES ('20260507_2200_create_fc_schemas',
          'Bootstrap fc_dynamic_ui')
ON CONFLICT (id) DO NOTHING;

-- ── Validation assertions ──────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'fc_ui_os') THEN
    RAISE EXCEPTION 'fc_ui_os schema not created';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'fc_dynamic_ui') THEN
    RAISE EXCEPTION 'fc_dynamic_ui schema not created';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'fc_app') THEN
    RAISE EXCEPTION 'fc_app role not created';
  END IF;
END
$$;

COMMIT;
