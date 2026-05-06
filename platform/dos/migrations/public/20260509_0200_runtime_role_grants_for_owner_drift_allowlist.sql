-- =============================================================================
-- Migration: 20260509_0200_runtime_role_grants_for_owner_drift_allowlist
-- Purpose:
--   Restore canonical runtime-role table privileges (SELECT/INSERT/UPDATE/DELETE)
--   to `dos_auth` and `dos_app` for exactly the six tables whose ownership was
--   transferred from `dos_auth` to `dos_migrator` by the prior single-object
--   ownership-drift remediations:
--
--     20260506_0531_ui_override_product_owner_to_migrator.sql
--     20260506_0539_workspace_shell_i18n_owner_to_migrator.sql
--     20260506_0549_ui_override_tenant_owner_to_migrator.sql
--     20260506_0559_dynamic_ui_owner_drift_allowlist.sql
--     20260508_0099_auth_mfa_owner_drift_allowlist.sql      (sibling wave)
--     20260508_0099b_tenant_security_policy_owner_drift_allowlist.sql
--
--   When PostgreSQL changes a relation's owner, the previous owner loses
--   the implicit owner-privilege set. The OWNER-TO transfers above moved
--   six relations from dos_auth → dos_migrator without re-granting the
--   runtime read+write privileges that `dos_auth` (auth-service,
--   ui-os-service, tenant-service, signup-bff) and `dos_app` rely on at
--   runtime.
--
--   Runtime-proven blocker:
--     [workspace-runtime] failed permission denied for table workspace_shell_binding
--     [template-binding] fetch failed { err: 'permission denied for table ui_route_template_binding' }
--
-- Allowlist (closed; only the six tables above):
--   1) dos.workspace_shell_binding         — workspace-shell.routes.ts SELECT
--   2) dos.workspace_shell_i18n            — workspace-shell.routes.ts SELECT
--   3) dos.ui_route_template_binding       — template-binding.routes.ts SELECT
--   4) dos.ui_override_product             — template-binding.routes.ts SELECT
--   5) dos.ui_override_tenant              — template-binding.routes.ts SELECT
--   6) dos.dynamic_ui_route_metadata       — UI-OS resolver SELECT
--
-- Granted privilege set: SELECT, INSERT, UPDATE, DELETE
--   matches the canonical pattern observed on healthy peers (e.g.
--   dos.dynamic_ui_component_registry, dos.tenants, dos.tenant_memberships,
--   dos.tenant_product_activation already grant exactly this set to
--   dos_auth + dos_app). Owner-only privileges (REFERENCES, TRIGGER,
--   TRUNCATE) remain reserved to dos_migrator.
--
-- Doctrine:
--   - Allowlist closed to the six runtime-proven blocked tables.
--   - No schema-wide GRANT sweep.
--   - No name-pattern matching.
--   - No manual writes to dos.platform_migrations.
--   - No skip / fake-green behavior.
--   - Idempotent: re-running re-grants the same set; PostgreSQL collapses
--     duplicate grants to a single ACL entry.
--   - Loud failure if a listed table is missing (prerequisite drift).
-- =============================================================================

BEGIN;

DO $$
DECLARE
  required_tables text[] := ARRAY[
    'workspace_shell_binding',
    'workspace_shell_i18n',
    'ui_route_template_binding',
    'ui_override_product',
    'ui_override_tenant',
    'dynamic_ui_route_metadata'
  ];
  required_roles  text[] := ARRAY['dos_auth','dos_app'];
  t text;
  r text;
  exists_table boolean;
  exists_role  boolean;
BEGIN
  FOREACH t IN ARRAY required_tables LOOP
    SELECT EXISTS (
      SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'dos' AND c.relname = t AND c.relkind = 'r'
    ) INTO exists_table;
    IF NOT exists_table THEN
      RAISE EXCEPTION
        'dos.% is missing; refusing to silently grant on a non-existent relation', t;
    END IF;
  END LOOP;

  FOREACH r IN ARRAY required_roles LOOP
    SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) INTO exists_role;
    IF NOT exists_role THEN
      RAISE EXCEPTION
        'role % does not exist on this cluster; refusing to silently skip', r;
    END IF;
  END LOOP;

  -- Apply the canonical runtime-role grant set.
  FOREACH t IN ARRAY required_tables LOOP
    FOREACH r IN ARRAY required_roles LOOP
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON dos.%I TO %I',
        t, r
      );
    END LOOP;
    RAISE NOTICE 'granted SELECT,INSERT,UPDATE,DELETE on dos.% to %', t, required_roles;
  END LOOP;
END $$;

-- Assertion: dos_auth must hold SELECT on every listed relation.
DO $$
DECLARE
  required_tables text[] := ARRAY[
    'workspace_shell_binding',
    'workspace_shell_i18n',
    'ui_route_template_binding',
    'ui_override_product',
    'ui_override_tenant',
    'dynamic_ui_route_metadata'
  ];
  t text;
  has_select boolean;
BEGIN
  FOREACH t IN ARRAY required_tables LOOP
    SELECT has_table_privilege('dos_auth', 'dos.'||quote_ident(t), 'SELECT') INTO has_select;
    IF NOT has_select THEN
      RAISE EXCEPTION
        'POST-GRANT ASSERTION FAILED: dos_auth lacks SELECT on dos.%', t;
    END IF;
  END LOOP;
END $$;

COMMIT;
