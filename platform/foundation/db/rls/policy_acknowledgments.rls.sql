-- RLS policy for dos.foundation_policy_acknowledgments (foundation-owned).
ALTER TABLE dos.foundation_policy_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dos.foundation_policy_acknowledgments FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS foundation_tenant_read  ON dos.foundation_policy_acknowledgments;
DROP POLICY IF EXISTS foundation_tenant_write ON dos.foundation_policy_acknowledgments;

CREATE POLICY foundation_tenant_read ON dos.foundation_policy_acknowledgments FOR SELECT
  USING ( current_setting('app.current_tenant_id', true) IS NULL
       OR current_setting('app.current_tenant_id', true) = ''
       OR tenant_id::text = current_setting('app.current_tenant_id', true) );

CREATE POLICY foundation_tenant_write ON dos.foundation_policy_acknowledgments FOR ALL
  USING      ( tenant_id::text = current_setting('app.current_tenant_id', true) )
  WITH CHECK ( tenant_id::text = current_setting('app.current_tenant_id', true) );
