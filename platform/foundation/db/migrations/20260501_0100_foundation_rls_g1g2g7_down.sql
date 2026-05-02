-- Reverse of 20260501_0100_foundation_rls_g1g2g7.sql — drops RLS policies and disables RLS
-- on G1/G2/G7 foundation tables. Tables themselves are not dropped here.

BEGIN;

-- G7
DROP POLICY IF EXISTS foundation_tenant_read  ON dos.foundation_coi_declarations;
DROP POLICY IF EXISTS foundation_tenant_write ON dos.foundation_coi_declarations;
ALTER TABLE dos.foundation_coi_declarations NO FORCE  ROW LEVEL SECURITY;
ALTER TABLE dos.foundation_coi_declarations DISABLE   ROW LEVEL SECURITY;

DROP POLICY IF EXISTS foundation_tenant_read  ON dos.foundation_training_assignments;
DROP POLICY IF EXISTS foundation_tenant_write ON dos.foundation_training_assignments;
ALTER TABLE dos.foundation_training_assignments NO FORCE  ROW LEVEL SECURITY;
ALTER TABLE dos.foundation_training_assignments DISABLE   ROW LEVEL SECURITY;

DROP POLICY IF EXISTS foundation_tenant_read  ON dos.foundation_training_courses;
DROP POLICY IF EXISTS foundation_tenant_write ON dos.foundation_training_courses;
ALTER TABLE dos.foundation_training_courses NO FORCE  ROW LEVEL SECURITY;
ALTER TABLE dos.foundation_training_courses DISABLE   ROW LEVEL SECURITY;

DROP POLICY IF EXISTS foundation_tenant_read  ON dos.foundation_policy_acknowledgments;
DROP POLICY IF EXISTS foundation_tenant_write ON dos.foundation_policy_acknowledgments;
ALTER TABLE dos.foundation_policy_acknowledgments NO FORCE  ROW LEVEL SECURITY;
ALTER TABLE dos.foundation_policy_acknowledgments DISABLE   ROW LEVEL SECURITY;

-- G2
DROP POLICY IF EXISTS foundation_tenant_read  ON dos.foundation_sod_violations;
DROP POLICY IF EXISTS foundation_tenant_write ON dos.foundation_sod_violations;
ALTER TABLE dos.foundation_sod_violations NO FORCE  ROW LEVEL SECURITY;
ALTER TABLE dos.foundation_sod_violations DISABLE   ROW LEVEL SECURITY;

DROP POLICY IF EXISTS foundation_tenant_read  ON dos.foundation_sod_rules;
DROP POLICY IF EXISTS foundation_tenant_write ON dos.foundation_sod_rules;
ALTER TABLE dos.foundation_sod_rules NO FORCE  ROW LEVEL SECURITY;
ALTER TABLE dos.foundation_sod_rules DISABLE   ROW LEVEL SECURITY;

DROP POLICY IF EXISTS foundation_tenant_read  ON dos.foundation_position_authority;
DROP POLICY IF EXISTS foundation_tenant_write ON dos.foundation_position_authority;
ALTER TABLE dos.foundation_position_authority NO FORCE  ROW LEVEL SECURITY;
ALTER TABLE dos.foundation_position_authority DISABLE   ROW LEVEL SECURITY;

-- G1
DROP POLICY IF EXISTS foundation_tenant_read  ON dos.foundation_employee_lifecycle_workflows;
DROP POLICY IF EXISTS foundation_tenant_write ON dos.foundation_employee_lifecycle_workflows;
ALTER TABLE dos.foundation_employee_lifecycle_workflows NO FORCE  ROW LEVEL SECURITY;
ALTER TABLE dos.foundation_employee_lifecycle_workflows DISABLE   ROW LEVEL SECURITY;

DROP POLICY IF EXISTS foundation_tenant_read  ON dos.foundation_employee_lifecycle_tasks;
DROP POLICY IF EXISTS foundation_tenant_write ON dos.foundation_employee_lifecycle_tasks;
ALTER TABLE dos.foundation_employee_lifecycle_tasks NO FORCE  ROW LEVEL SECURITY;
ALTER TABLE dos.foundation_employee_lifecycle_tasks DISABLE   ROW LEVEL SECURITY;

DROP POLICY IF EXISTS foundation_tenant_read  ON dos.foundation_employee_lifecycle_transitions;
DROP POLICY IF EXISTS foundation_tenant_write ON dos.foundation_employee_lifecycle_transitions;
ALTER TABLE dos.foundation_employee_lifecycle_transitions NO FORCE  ROW LEVEL SECURITY;
ALTER TABLE dos.foundation_employee_lifecycle_transitions DISABLE   ROW LEVEL SECURITY;

DROP POLICY IF EXISTS foundation_tenant_read  ON dos.foundation_employee_lifecycle_state;
DROP POLICY IF EXISTS foundation_tenant_write ON dos.foundation_employee_lifecycle_state;
ALTER TABLE dos.foundation_employee_lifecycle_state NO FORCE  ROW LEVEL SECURITY;
ALTER TABLE dos.foundation_employee_lifecycle_state DISABLE   ROW LEVEL SECURITY;

COMMIT;
