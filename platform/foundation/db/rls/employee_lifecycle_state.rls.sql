-- RLS policy for dos.foundation_employee_lifecycle_state (foundation-owned).
ALTER TABLE dos.foundation_employee_lifecycle_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE dos.foundation_employee_lifecycle_state FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS foundation_tenant_read  ON dos.foundation_employee_lifecycle_state;
DROP POLICY IF EXISTS foundation_tenant_write ON dos.foundation_employee_lifecycle_state;

CREATE POLICY foundation_tenant_read ON dos.foundation_employee_lifecycle_state FOR SELECT
  USING ( current_setting('app.current_tenant_id', true) IS NULL
       OR current_setting('app.current_tenant_id', true) = ''
       OR tenant_id::text = current_setting('app.current_tenant_id', true) );

CREATE POLICY foundation_tenant_write ON dos.foundation_employee_lifecycle_state FOR ALL
  USING      ( tenant_id::text = current_setting('app.current_tenant_id', true) )
  WITH CHECK ( tenant_id::text = current_setting('app.current_tenant_id', true) );
