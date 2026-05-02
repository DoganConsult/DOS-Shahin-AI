-- RLS policy for dos.foundation_training_courses (foundation-owned).
-- tenant_id IS NULL → platform default course (read-only to all tenants).
-- tenant_id IS NOT NULL → tenant-owned course.
ALTER TABLE dos.foundation_training_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE dos.foundation_training_courses FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS foundation_tenant_read  ON dos.foundation_training_courses;
DROP POLICY IF EXISTS foundation_tenant_write ON dos.foundation_training_courses;

CREATE POLICY foundation_tenant_read ON dos.foundation_training_courses FOR SELECT
  USING ( tenant_id IS NULL
       OR current_setting('app.current_tenant_id', true) IS NULL
       OR current_setting('app.current_tenant_id', true) = ''
       OR tenant_id::text = current_setting('app.current_tenant_id', true) );

CREATE POLICY foundation_tenant_write ON dos.foundation_training_courses FOR ALL
  USING      ( tenant_id IS NOT NULL AND tenant_id::text = current_setting('app.current_tenant_id', true) )
  WITH CHECK ( tenant_id IS NOT NULL AND tenant_id::text = current_setting('app.current_tenant_id', true) );
