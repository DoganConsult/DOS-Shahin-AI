ALTER TABLE dos.business_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE dos.business_units FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS foundation_tenant_read  ON dos.business_units;
DROP POLICY IF EXISTS foundation_tenant_write ON dos.business_units;

CREATE POLICY foundation_tenant_read ON dos.business_units FOR SELECT
  USING ( current_setting('app.current_tenant_id', true) IS NULL
       OR current_setting('app.current_tenant_id', true) = ''
       OR tenant_id::text = current_setting('app.current_tenant_id', true) );

CREATE POLICY foundation_tenant_write ON dos.business_units FOR ALL
  USING      ( tenant_id::text = current_setting('app.current_tenant_id', true) )
  WITH CHECK ( tenant_id::text = current_setting('app.current_tenant_id', true) );
