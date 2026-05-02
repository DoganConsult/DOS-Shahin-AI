ALTER TABLE dos.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dos.locations FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS foundation_tenant_read  ON dos.locations;
DROP POLICY IF EXISTS foundation_tenant_write ON dos.locations;

CREATE POLICY foundation_tenant_read ON dos.locations FOR SELECT
  USING ( current_setting('app.current_tenant_id', true) IS NULL
       OR current_setting('app.current_tenant_id', true) = ''
       OR tenant_id::text = current_setting('app.current_tenant_id', true) );

CREATE POLICY foundation_tenant_write ON dos.locations FOR ALL
  USING      ( tenant_id::text = current_setting('app.current_tenant_id', true) )
  WITH CHECK ( tenant_id::text = current_setting('app.current_tenant_id', true) );
