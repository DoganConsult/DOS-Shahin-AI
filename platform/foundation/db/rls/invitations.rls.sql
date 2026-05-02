ALTER TABLE dos.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dos.invitations FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS foundation_tenant_read  ON dos.invitations;
DROP POLICY IF EXISTS foundation_tenant_write ON dos.invitations;

CREATE POLICY foundation_tenant_read ON dos.invitations FOR SELECT
  USING ( current_setting('app.current_tenant_id', true) IS NULL
       OR current_setting('app.current_tenant_id', true) = ''
       OR tenant_id::text = current_setting('app.current_tenant_id', true) );

CREATE POLICY foundation_tenant_write ON dos.invitations FOR ALL
  USING      ( tenant_id::text = current_setting('app.current_tenant_id', true) )
  WITH CHECK ( tenant_id::text = current_setting('app.current_tenant_id', true) );
