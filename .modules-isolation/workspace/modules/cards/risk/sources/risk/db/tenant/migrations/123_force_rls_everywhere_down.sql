-- ============================================================================
-- 123 DOWN: Lift FORCE ROW LEVEL SECURITY from tables that were forced by 123.
-- ============================================================================
-- Rolls back only the FORCE flag. Existing ENABLE ROW LEVEL SECURITY and
-- CREATE POLICY statements applied by 020/024/122 remain intact.
--
-- Note: this cannot distinguish "tables FORCED by 123" from "tables FORCED by
-- 020/024". That is acceptable — lifting FORCE from 020/024 tables would
-- only weaken defence-in-depth back to what 020/024 themselves would apply
-- on the next run (they call FORCE explicitly).
-- ============================================================================

SET search_path TO "__TENANT_SCHEMA__";

ALTER TABLE IF EXISTS __TENANT_SCHEMA__.risk_reviews NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS __TENANT_SCHEMA__.risk_approval_requests NO FORCE ROW LEVEL SECURITY;

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT c.relname
    FROM   pg_class c
    JOIN   pg_namespace n ON n.oid = c.relnamespace
    WHERE  n.nspname = current_schema()
      AND  c.relkind = 'r'
      AND  c.relforcerowsecurity = TRUE
  LOOP
    EXECUTE format('ALTER TABLE %I NO FORCE ROW LEVEL SECURITY', rec.relname);
  END LOOP;
END;
$$;
