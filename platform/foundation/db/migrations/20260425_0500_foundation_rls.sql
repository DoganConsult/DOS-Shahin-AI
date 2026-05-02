-- P8.9 — Enable row-level security on the foundation-owned dos.* tables
-- with tenant-scoped policies driven by app.current_tenant_id session variable.
--
-- The same pattern is used by governance/compliance modules; policies are
-- idempotent (DROP POLICY IF EXISTS before CREATE). tenant_id is stored as
-- TEXT/UUID in dos.* tables so the policy casts SESSION variable to
-- text to match. Apps set the variable via packages/dos-db/src/tenant.ts
-- which does:  SELECT set_config('app.current_tenant_id', $1, true)
-- at request ingress in every pooled connection.
--
-- Tables that do NOT have a tenant_id column (permissions, functional_roles,
-- role_permissions) are platform-global and intentionally not RLS-scoped.

BEGIN;

-- Helper macro executed per-table.
DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'organizations',
      'business_units',
      'positions',
      'position_assignments',
      'locations',
      'location_bu_map',
      'committees',
      'committee_members',
      'ownership_mappings',
      'invitations',
      'audit_trail'
    ]) AS table_name
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'dos' AND table_name = t.table_name
    ) THEN
      EXECUTE format('ALTER TABLE dos.%I ENABLE ROW LEVEL SECURITY', t.table_name);
      EXECUTE format('ALTER TABLE dos.%I FORCE ROW LEVEL SECURITY', t.table_name);

      EXECUTE format('DROP POLICY IF EXISTS foundation_tenant_read  ON dos.%I', t.table_name);
      EXECUTE format('DROP POLICY IF EXISTS foundation_tenant_write ON dos.%I', t.table_name);

      EXECUTE format(
        'CREATE POLICY foundation_tenant_read ON dos.%I FOR SELECT
           USING (
             current_setting(''app.current_tenant_id'', true) IS NULL
             OR current_setting(''app.current_tenant_id'', true) = ''''
             OR tenant_id::text = current_setting(''app.current_tenant_id'', true)
           )',
        t.table_name
      );

      EXECUTE format(
        'CREATE POLICY foundation_tenant_write ON dos.%I FOR ALL
           USING (
             current_setting(''app.current_tenant_id'', true) IS NULL
             OR current_setting(''app.current_tenant_id'', true) = ''''
             OR tenant_id::text = current_setting(''app.current_tenant_id'', true)
           )
           WITH CHECK (
             current_setting(''app.current_tenant_id'', true) IS NULL
             OR current_setting(''app.current_tenant_id'', true) = ''''
             OR tenant_id::text = current_setting(''app.current_tenant_id'', true)
           )',
        t.table_name
      );

      RAISE NOTICE 'Foundation RLS applied on dos.%', t.table_name;
    ELSE
      RAISE NOTICE 'Foundation RLS skipped (table missing): dos.%', t.table_name;
    END IF;
  END LOOP;
END$$;

COMMIT;
