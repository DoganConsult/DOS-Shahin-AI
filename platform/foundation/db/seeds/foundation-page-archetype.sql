-- =====================================================================
-- Foundation Wave 2 seed: page → persona / page → agent bindings
-- Derived artifact. Source contracts:
--   platform/foundation/contracts/navigation/navigation.json
--   platform/foundation/contracts/agent.contract.json
-- Idempotent. Safe to re-run. Self-asserting at tail.
-- =====================================================================

BEGIN;
SET search_path = public;

-- Persona bindings
INSERT INTO dos.dynamic_ui_page_persona (module_code, page_id, persona_id, is_primary, sort_order) VALUES
  ('foundation','foundation.overview','module-owner',TRUE,1),
  ('foundation','foundation.overview','admin',FALSE,2),
  ('foundation','foundation.organization','org-admin',TRUE,1),
  ('foundation','foundation.organization','module-owner',FALSE,2),
  ('foundation','foundation.business-units','module-user',TRUE,1),
  ('foundation','foundation.business-units','admin',FALSE,2),
  ('foundation','foundation.departments','module-user',TRUE,1),
  ('foundation','foundation.departments','admin',FALSE,2),
  ('foundation','foundation.positions','module-user',TRUE,1),
  ('foundation','foundation.positions','admin',FALSE,2),
  ('foundation','foundation.locations','module-user',TRUE,1),
  ('foundation','foundation.locations','admin',FALSE,2),
  ('foundation','foundation.users','module-user',TRUE,1),
  ('foundation','foundation.users','admin',FALSE,2),
  ('foundation','foundation.teams','module-user',TRUE,1),
  ('foundation','foundation.teams','admin',FALSE,2),
  ('foundation','foundation.roles','module-user',TRUE,1),
  ('foundation','foundation.roles','admin',FALSE,2),
  ('foundation','foundation.permissions','security-admin',TRUE,1),
  ('foundation','foundation.permissions','auditor',FALSE,2),
  ('foundation','foundation.committees','module-user',TRUE,1),
  ('foundation','foundation.committees','admin',FALSE,2),
  ('foundation','foundation.delegations','module-user',TRUE,1),
  ('foundation','foundation.delegations','admin',FALSE,2),
  ('foundation','foundation.access-review','reviewer',TRUE,1),
  ('foundation','foundation.access-review','admin',FALSE,2),
  ('foundation','foundation.policies','policy-owner',TRUE,1),
  ('foundation','foundation.policies','admin',FALSE,2),
  ('foundation','foundation.audit','auditor',TRUE,1),
  ('foundation','foundation.audit','admin',FALSE,2),
  ('foundation','foundation.ownership','security-admin',TRUE,1),
  ('foundation','foundation.ownership','auditor',FALSE,2),
  ('foundation','foundation.sod','security-admin',TRUE,1),
  ('foundation','foundation.sod','auditor',FALSE,2),
  ('foundation','foundation.hierarchy-viz','org-admin',TRUE,1),
  ('foundation','foundation.hierarchy-viz','module-owner',FALSE,2),
  ('foundation','foundation.user-lifecycle','hr-admin',TRUE,1),
  ('foundation','foundation.user-lifecycle','admin',FALSE,2),
  ('foundation','foundation.reference-data','admin',TRUE,1),
  ('foundation','foundation.diagnostics','ops',TRUE,1)
ON CONFLICT (module_code, page_id, persona_id) DO UPDATE
  SET is_primary = EXCLUDED.is_primary, sort_order = EXCLUDED.sort_order;

-- Agent bindings
INSERT INTO dos.dynamic_ui_page_agent (module_code, page_id, agent_id, is_primary, presentation, sort_order) VALUES
  ('foundation','foundation.organization','foundation-org-agent',TRUE,'side-panel',10),
  ('foundation','foundation.users','foundation-access-agent',TRUE,'side-panel',10),
  ('foundation','foundation.roles','foundation-access-agent',TRUE,'side-panel',10),
  ('foundation','foundation.committees','foundation-committee-agent',TRUE,'side-panel',10),
  ('foundation','foundation.delegations','foundation-access-agent',TRUE,'side-panel',10),
  ('foundation','foundation.audit','foundation-audit-scribe',TRUE,'side-panel',10)
ON CONFLICT (module_code, page_id, agent_id) DO UPDATE
  SET is_primary = EXCLUDED.is_primary, presentation = EXCLUDED.presentation, sort_order = EXCLUDED.sort_order;

COMMIT;

-- Self-assertion
DO $$
DECLARE persona_count INT; agent_count INT;
BEGIN
  SELECT COUNT(*) INTO persona_count FROM dos.dynamic_ui_page_persona WHERE module_code = 'foundation';
  SELECT COUNT(*) INTO agent_count   FROM dos.dynamic_ui_page_agent   WHERE module_code = 'foundation';
  IF persona_count < 40 THEN RAISE EXCEPTION 'foundation persona seed failed: expected >=40, got %', persona_count; END IF;
  IF agent_count   < 6   THEN RAISE EXCEPTION 'foundation agent seed failed: expected >=6, got %', agent_count;   END IF;
END $$;
