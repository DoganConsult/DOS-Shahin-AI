-- Down for 20260425_0500 — disable RLS and drop foundation tenant policies.
BEGIN;

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
      'audit_trail',
      'ownership_mappings',
      'invitations',
      'delegations'
    ]) AS tbl
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS foundation_tenant_read  ON dos.%I', t.tbl);
    EXECUTE format('DROP POLICY IF EXISTS foundation_tenant_write ON dos.%I', t.tbl);
    EXECUTE format('ALTER TABLE IF EXISTS dos.%I DISABLE ROW LEVEL SECURITY', t.tbl);
    EXECUTE format('ALTER TABLE IF EXISTS dos.%I NO FORCE ROW LEVEL SECURITY', t.tbl);
  END LOOP;
END$$;

COMMIT;
