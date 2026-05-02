-- RLS policy for dos.foundation_employee_lifecycle_workflows (foundation-owned).
-- tenant_id IS NULL  → platform default workflow template (read-only to all tenants).
-- tenant_id IS NOT NULL → tenant-owned override (read+write within own tenant only).
ALTER TABLE dos.foundation_employee_lifecycle_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE dos.foundation_employee_lifecycle_workflows FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS foundation_tenant_read  ON dos.foundation_employee_lifecycle_workflows;
DROP POLICY IF EXISTS foundation_tenant_write ON dos.foundation_employee_lifecycle_workflows;

CREATE POLICY foundation_tenant_read ON dos.foundation_employee_lifecycle_workflows FOR SELECT
  USING ( tenant_id IS NULL
       OR current_setting('app.current_tenant_id', true) IS NULL
       OR current_setting('app.current_tenant_id', true) = ''
       OR tenant_id::text = current_setting('app.current_tenant_id', true) );

CREATE POLICY foundation_tenant_write ON dos.foundation_employee_lifecycle_workflows FOR ALL
  USING      ( tenant_id IS NOT NULL AND tenant_id::text = current_setting('app.current_tenant_id', true) )
  WITH CHECK ( tenant_id IS NOT NULL AND tenant_id::text = current_setting('app.current_tenant_id', true) );
