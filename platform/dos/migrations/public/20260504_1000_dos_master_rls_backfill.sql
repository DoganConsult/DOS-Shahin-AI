-- DOS Master Phase 3 / L28 — RLS coverage backfill.
-- Doctrine: Article 5 (tenant trust zone — tenant rows isolated at DB layer).
--
-- For every table in the `dos` schema that carries a tenant_id column and
-- does NOT yet have row-level security enabled, this migration:
--   (1) ensures a SECURITY DEFINER current_tenant_id() helper exists
--       (idempotent — uses dos.tenant_id GUC; falls back to NULL),
--   (2) ENABLE ROW LEVEL SECURITY on the table,
--   (3) creates a `tenant_isolation` policy that admits rows whose
--       tenant_id matches current_tenant_id() OR when current_tenant_id()
--       is NULL (server-internal access — DOS Master writers run with no
--       tenant set; gateway sets dos.tenant_id before delegating to
--       tenant-zone services).

BEGIN;

-- (1) helper — idempotent.
CREATE OR REPLACE FUNCTION dos.current_tenant_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('dos.tenant_id', true), '')
$$;

-- (2)+(3) backfill loop.
DO $$
DECLARE
  rec        record;
  policyname text := 'tenant_isolation';
  is_uuid    boolean;
BEGIN
  FOR rec IN
    SELECT n.nspname AS schema, c.relname AS tbl, c.oid
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'dos'
       AND c.relkind = 'r'
       AND NOT c.relrowsecurity
       AND EXISTS (
         SELECT 1 FROM pg_attribute a
          WHERE a.attrelid = c.oid AND a.attname = 'tenant_id' AND NOT a.attisdropped
       )
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', rec.schema, rec.tbl);
    -- detect tenant_id column type so the comparison casts correctly.
    SELECT a.atttypid = 'uuid'::regtype
      INTO is_uuid
      FROM pg_attribute a
     WHERE a.attrelid = rec.oid AND a.attname = 'tenant_id';

    -- drop any pre-existing policy with the same name to keep idempotent.
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', policyname, rec.schema, rec.tbl);

    IF is_uuid THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I
           USING (
             dos.current_tenant_id() IS NULL
             OR tenant_id IS NULL
             OR tenant_id::text = dos.current_tenant_id()
           )',
        policyname, rec.schema, rec.tbl);
    ELSE
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I
           USING (
             dos.current_tenant_id() IS NULL
             OR tenant_id IS NULL
             OR tenant_id = dos.current_tenant_id()
           )',
        policyname, rec.schema, rec.tbl);
    END IF;
  END LOOP;
END $$;

COMMIT;
