-- Down migration for 20260430_1000_foundation_employee_lifecycle.sql
-- DESTRUCTIVE — drops state, transitions, workflows, tasks. Workflow seed
-- rows go with the table.

DROP TABLE IF EXISTS dos.foundation_employee_lifecycle_tasks;
DROP TABLE IF EXISTS dos.foundation_employee_lifecycle_transitions;
DROP TABLE IF EXISTS dos.foundation_employee_lifecycle_state;
DROP TABLE IF EXISTS dos.foundation_employee_lifecycle_workflows;
