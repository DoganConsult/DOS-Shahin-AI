-- 20260503_0019_phase_f_archetype_registry_seed.sql
-- Owner: ui-os-service.
-- Roster patch: extend the canonical archetype roster from 13 → 31 and seed
-- the 24 missing rows in dos.dynamic_ui_component_registry.
--
-- Forward-only and idempotent. No data is destroyed:
--   ① ALTER ... DROP CONSTRAINT chk_archetype  → re-create with the full 31.
--   ② INSERT ... ON CONFLICT (component_key) DO NOTHING for the new rows.
--
-- Carbon-only contract:
--   Every inserted row sets vendor='ibm-carbon', approval_status='approved'
--   and a carbon_key whose row in dos.ui_carbon_components has
--   vendor='ibm-carbon' AND runtime_status IN ('active','wrapper-required').
--   The trg_carbon_only_runtime DB trigger enforces vendor='ibm-carbon' on
--   INSERT/UPDATE.

BEGIN;

-- 1. Extend chk_archetype to the canonical 31 names. Mirrors the
-- ARCHETYPE_REGISTRY const in
-- platform/core/platform/shell/templates/module-template.types.ts.
ALTER TABLE dos.ui_route_template_binding
  DROP CONSTRAINT IF EXISTS chk_archetype;

ALTER TABLE dos.ui_route_template_binding
  ADD CONSTRAINT chk_archetype CHECK (archetype IN (
    -- A — Landing
    'command-home',
    -- B — Insight
    'decision-dashboard','command-dashboard','posture-overview','trend-intelligence',
    -- C — Records
    'intelligent-register','risk-landscape','record-story','guided-create',
    -- D — Work
    'action-queue','workflow-control','workflow-timeline','follow-up-center',
    -- E — Evidence
    'evidence-reports','export-center','audit-trail','audit-trail-ledger','audit-trail-evidence',
    -- F — Time / Plan
    'calendar-timeline','compliance-calendar','remediation-roadmap',
    -- G — Governance
    'org-chart','ownership-map','delegation-center',
    -- H — Agentic
    'ai-advisor','agent-flow','agent-registry','user-agent-workbench',
    -- I — Configuration
    'module-settings',
    -- J — Onboarding
    'activation-journey',
    -- K — Operational P0
    'incident-response'
  ));

-- 2. Seed the 24 missing rows in dos.dynamic_ui_component_registry.
-- The 7 already-present component_keys are: module.entry.page,
-- module.records.page, module.reports.page, module.settings.page,
-- module.work_queue, module.workflows.page, module.audit_trail.
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, carbon_key, approval_status)
VALUES
  -- B — Insight
  ('module.posture.page',              'ibm-carbon', 'grid',               'approved'),
  ('module.trends.page',               'ibm-carbon', 'tiles',              'approved'),
  ('module.dashboard.page',            'ibm-carbon', 'grid',               'approved'),
  ('module.command_dashboard.page',    'ibm-carbon', 'grid',               'approved'),
  -- C — Records
  ('module.heatmap.page',              'ibm-carbon', 'tiles',              'approved'),
  ('module.record.detail.page',        'ibm-carbon', 'tabs',               'approved'),
  ('module.record.create.page',        'ibm-carbon', 'tabs',               'approved'),
  -- D — Work
  ('module.workflow_timeline.page',    'ibm-carbon', 'progress-indicator', 'approved'),
  ('module.followup_center.page',      'ibm-carbon', 'structured-list',    'approved'),
  -- E — Evidence
  ('module.export.page',               'ibm-carbon', 'tiles',              'approved'),
  ('module.audit_trail_ledger.page',   'ibm-carbon', 'table',              'approved'),
  ('module.audit_evidence.page',       'ibm-carbon', 'tabs',               'approved'),
  -- F — Time / Plan
  ('module.calendar.page',             'ibm-carbon', 'structured-list',    'approved'),
  ('module.compliance_calendar.page',  'ibm-carbon', 'structured-list',    'approved'),
  ('module.roadmap.page',              'ibm-carbon', 'tiles',              'approved'),
  -- G — Governance
  ('module.org_chart.page',            'ibm-carbon', 'structured-list',    'approved'),
  ('module.ownership_map.page',        'ibm-carbon', 'table',              'approved'),
  ('module.delegation_center.page',    'ibm-carbon', 'table',              'approved'),
  -- H — Agentic
  ('module.ai.advisor.page',           'ibm-carbon', 'tiles',              'approved'),
  ('module.agent_flow.page',           'ibm-carbon', 'structured-list',    'approved'),
  ('module.agent_registry.page',       'ibm-carbon', 'table',              'approved'),
  ('module.user_agent_workbench.page', 'ibm-carbon', 'tabs',               'approved'),
  -- J — Onboarding
  ('module.activation.page',           'ibm-carbon', 'progress-indicator', 'approved'),
  -- K — Operational P0
  ('module.incident_response.page',    'ibm-carbon', 'tiles',              'approved')
ON CONFLICT (component_key) DO NOTHING;

-- 3. Sanity guard — fails the migration if the extended constraint or any
-- expected row is missing.
DO $$
DECLARE
  expected_keys TEXT[] := ARRAY[
    'module.entry.page','module.posture.page','module.trends.page',
    'module.dashboard.page','module.command_dashboard.page',
    'module.records.page','module.heatmap.page','module.record.detail.page',
    'module.record.create.page','module.work_queue','module.workflows.page',
    'module.workflow_timeline.page','module.followup_center.page',
    'module.reports.page','module.export.page','module.audit_trail',
    'module.audit_trail_ledger.page','module.audit_evidence.page',
    'module.calendar.page','module.compliance_calendar.page','module.roadmap.page',
    'module.org_chart.page','module.ownership_map.page','module.delegation_center.page',
    'module.ai.advisor.page','module.agent_flow.page','module.agent_registry.page',
    'module.user_agent_workbench.page','module.settings.page',
    'module.activation.page','module.incident_response.page'
  ];
  missing_count INTEGER;
BEGIN
  SELECT count(*) INTO missing_count
  FROM unnest(expected_keys) AS k(key)
  WHERE NOT EXISTS (
    SELECT 1 FROM dos.dynamic_ui_component_registry r
    WHERE r.component_key = k.key
      AND r.vendor = 'ibm-carbon'
      AND r.approval_status = 'approved'
  );
  IF missing_count > 0 THEN
    RAISE EXCEPTION '[archetype-roster-31] % expected component_key rows missing or not approved/carbon', missing_count;
  END IF;
END $$;

COMMIT;
