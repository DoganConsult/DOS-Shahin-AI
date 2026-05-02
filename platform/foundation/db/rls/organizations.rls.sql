-- RLS policy for dos.organizations (foundation-owned).
-- Loader: ../migrations/20260425_0500_foundation_rls.sql
ALTER TABLE dos.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dos.organizations FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS foundation_tenant_read  ON dos.organizations;
DROP POLICY IF EXISTS foundation_tenant_write ON dos.organizations;

CREATE POLICY foundation_tenant_read ON dos.organizations FOR SELECT
  USING ( current_setting('app.current_tenant_id', true) IS NULL
       OR current_setting('app.current_tenant_id', true) = ''
       OR tenant_id::text = current_setting('app.current_tenant_id', true) );

CREATE POLICY foundation_tenant_write ON dos.organizations FOR ALL
  USING      ( tenant_id::text = current_setting('app.current_tenant_id', true) )
  WITH CHECK ( tenant_id::text = current_setting('app.current_tenant_id', true) );
