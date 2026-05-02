-- RLS policy for dos.foundation_sod_rules (foundation-owned).
-- tenant_id IS NULL → platform default rule (visible to all tenants, read-only).
-- tenant_id IS NOT NULL → tenant-owned override.
ALTER TABLE dos.foundation_sod_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE dos.foundation_sod_rules FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS foundation_tenant_read  ON dos.foundation_sod_rules;
DROP POLICY IF EXISTS foundation_tenant_write ON dos.foundation_sod_rules;

CREATE POLICY foundation_tenant_read ON dos.foundation_sod_rules FOR SELECT
  USING ( tenant_id IS NULL
       OR current_setting('app.current_tenant_id', true) IS NULL
       OR current_setting('app.current_tenant_id', true) = ''
       OR tenant_id::text = current_setting('app.current_tenant_id', true) );

CREATE POLICY foundation_tenant_write ON dos.foundation_sod_rules FOR ALL
  USING      ( tenant_id IS NOT NULL AND tenant_id::text = current_setting('app.current_tenant_id', true) )
  WITH CHECK ( tenant_id IS NOT NULL AND tenant_id::text = current_setting('app.current_tenant_id', true) );
