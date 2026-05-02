-- Compliance — honest readiness flags for navigation + routes.
-- Until W6 wires the actual UI library, every Compliance entry is STUB.
-- W6 will flip individual rows to PARTIAL/READY as their component_keys land
-- in the Angular COMPONENT_MAP and pass smoke render tests.
--
-- Source of truth for readiness states: Dynamic UI/src/contracts/readiness.ts
-- (READY | PARTIAL | STUB | BLOCKED).

UPDATE dos.dynamic_ui_navigation
   SET readiness = 'STUB'
 WHERE module_code = 'compliance'
   AND tenant_id IS NULL
   AND (readiness IS NULL OR readiness = '');

UPDATE dos.dynamic_ui_routes
   SET readiness = 'STUB'
 WHERE module_code = 'compliance'
   AND tenant_id IS NULL
   AND (readiness IS NULL OR readiness = '');
