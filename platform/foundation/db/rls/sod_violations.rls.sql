-- RLS policy for dos.foundation_sod_violations (foundation-owned).
ALTER TABLE dos.foundation_sod_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dos.foundation_sod_violations FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS foundation_tenant_read  ON dos.foundation_sod_violations;
DROP POLICY IF EXISTS foundation_tenant_write ON dos.foundation_sod_violations;

CREATE POLICY foundation_tenant_read ON dos.foundation_sod_violations FOR SELECT
  USING ( current_setting('app.current_tenant_id', true) IS NULL
       OR current_setting('app.current_tenant_id', true) = ''
       OR tenant_id::text = current_setting('app.current_tenant_id', true) );

CREATE POLICY foundation_tenant_write ON dos.foundation_sod_violations FOR ALL
  USING      ( tenant_id::text = current_setting('app.current_tenant_id', true) )
  WITH CHECK ( tenant_id::text = current_setting('app.current_tenant_id', true) );
