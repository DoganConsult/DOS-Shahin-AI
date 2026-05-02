-- Foundation RLS extension — G1 (employee lifecycle), G2 (authority + SoD), G7 (compliance fabric).
-- Applies the per-table policies declared under db/rls/*.rls.sql for tables introduced in
-- 20260430_1000 / 20260430_1100 / 20260430_1200. foundation_authority_kinds is a platform-global
-- reference catalog (no tenant_id) and intentionally not RLS-scoped, matching the existing
-- platform pattern for permissions / functional_roles / role_permissions.

BEGIN;

-- G1 — Employee Lifecycle ----------------------------------------------------
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

ALTER TABLE dos.foundation_employee_lifecycle_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dos.foundation_employee_lifecycle_transitions FORCE  ROW LEVEL SECURITY;
DROP POLICY IF EXISTS foundation_tenant_read  ON dos.foundation_employee_lifecycle_transitions;
DROP POLICY IF EXISTS foundation_tenant_write ON dos.foundation_employee_lifecycle_transitions;
CREATE POLICY foundation_tenant_read ON dos.foundation_employee_lifecycle_transitions FOR SELECT
  USING ( current_setting('app.current_tenant_id', true) IS NULL
       OR current_setting('app.current_tenant_id', true) = ''
       OR tenant_id::text = current_setting('app.current_tenant_id', true) );
CREATE POLICY foundation_tenant_write ON dos.foundation_employee_lifecycle_transitions FOR ALL
  USING      ( tenant_id::text = current_setting('app.current_tenant_id', true) )
  WITH CHECK ( tenant_id::text = current_setting('app.current_tenant_id', true) );

ALTER TABLE dos.foundation_employee_lifecycle_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE dos.foundation_employee_lifecycle_tasks FORCE  ROW LEVEL SECURITY;
DROP POLICY IF EXISTS foundation_tenant_read  ON dos.foundation_employee_lifecycle_tasks;
DROP POLICY IF EXISTS foundation_tenant_write ON dos.foundation_employee_lifecycle_tasks;
CREATE POLICY foundation_tenant_read ON dos.foundation_employee_lifecycle_tasks FOR SELECT
  USING ( current_setting('app.current_tenant_id', true) IS NULL
       OR current_setting('app.current_tenant_id', true) = ''
       OR tenant_id::text = current_setting('app.current_tenant_id', true) );
CREATE POLICY foundation_tenant_write ON dos.foundation_employee_lifecycle_tasks FOR ALL
  USING      ( tenant_id::text = current_setting('app.current_tenant_id', true) )
  WITH CHECK ( tenant_id::text = current_setting('app.current_tenant_id', true) );

-- workflows: tenant_id NULL = platform default (read-only to all), NOT NULL = tenant-owned.
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

-- G2 — Authority + SoD --------------------------------------------------------
-- foundation_authority_kinds: platform-global reference (no tenant_id); intentionally not RLS-scoped.

ALTER TABLE dos.foundation_position_authority ENABLE ROW LEVEL SECURITY;
ALTER TABLE dos.foundation_position_authority FORCE  ROW LEVEL SECURITY;
DROP POLICY IF EXISTS foundation_tenant_read  ON dos.foundation_position_authority;
DROP POLICY IF EXISTS foundation_tenant_write ON dos.foundation_position_authority;
CREATE POLICY foundation_tenant_read ON dos.foundation_position_authority FOR SELECT
  USING ( current_setting('app.current_tenant_id', true) IS NULL
       OR current_setting('app.current_tenant_id', true) = ''
       OR tenant_id::text = current_setting('app.current_tenant_id', true) );
CREATE POLICY foundation_tenant_write ON dos.foundation_position_authority FOR ALL
  USING      ( tenant_id::text = current_setting('app.current_tenant_id', true) )
  WITH CHECK ( tenant_id::text = current_setting('app.current_tenant_id', true) );

-- sod_rules: nullable tenant_id (platform defaults + tenant overrides).
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

-- G7 — Compliance Fabric ------------------------------------------------------
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

-- training_courses: nullable tenant_id (platform defaults + tenant overrides).
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

ALTER TABLE dos.foundation_coi_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dos.foundation_coi_declarations FORCE  ROW LEVEL SECURITY;
DROP POLICY IF EXISTS foundation_tenant_read  ON dos.foundation_coi_declarations;
DROP POLICY IF EXISTS foundation_tenant_write ON dos.foundation_coi_declarations;
CREATE POLICY foundation_tenant_read ON dos.foundation_coi_declarations FOR SELECT
  USING ( current_setting('app.current_tenant_id', true) IS NULL
       OR current_setting('app.current_tenant_id', true) = ''
       OR tenant_id::text = current_setting('app.current_tenant_id', true) );
CREATE POLICY foundation_tenant_write ON dos.foundation_coi_declarations FOR ALL
  USING      ( tenant_id::text = current_setting('app.current_tenant_id', true) )
  WITH CHECK ( tenant_id::text = current_setting('app.current_tenant_id', true) );

COMMIT;
