-- RLS policy for dos.foundation_training_assignments (foundation-owned).
ALTER TABLE dos.foundation_training_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dos.foundation_training_assignments FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS foundation_tenant_read  ON dos.foundation_training_assignments;
DROP POLICY IF EXISTS foundation_tenant_write ON dos.foundation_training_assignments;

CREATE POLICY foundation_tenant_read ON dos.foundation_training_assignments FOR SELECT
  USING ( current_setting('app.current_tenant_id', true) IS NULL
       OR current_setting('app.current_tenant_id', true) = ''
       OR tenant_id::text = current_setting('app.current_tenant_id', true) );

CREATE POLICY foundation_tenant_write ON dos.foundation_training_assignments FOR ALL
  USING      ( tenant_id::text = current_setting('app.current_tenant_id', true) )
  WITH CHECK ( tenant_id::text = current_setting('app.current_tenant_id', true) );
