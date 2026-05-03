-- Phase M0.5 — Agentic UI component_key registry seed.
-- Owner: ui-os-service.
--
-- Registers the 10 canonical agentic component_keys in
-- dos.dynamic_ui_component_registry. Every row is vendor='ibm-carbon',
-- approval_status='approved', and references a carbon_key that exists
-- in dos.ui_carbon_components (validated by trg_carbon_only_runtime).
--
-- Carbon mapping rationale:
--   agent.status-strip            → tiles  (tile grid summary)
--   agent.card                    → tiles
--   agent.activity-flow           → progress-indicator (stepped timeline)
--   agent.task-queue              → table  (data-table)
--   agent.recommendation-panel    → tiles
--   agent.action-approval-modal   → modal
--   agent.workbench               → tabs   (tabbed workbench shell)
--   agent.evidence-drawer         → modal  (slide-over uses Carbon modal)
--   agent.followup-center         → table
--   agent.audit-trail             → table
--
-- Forward-only and idempotent (ON CONFLICT DO NOTHING).

BEGIN;

INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, carbon_key, approval_status)
VALUES
  ('agent.status-strip',          'ibm-carbon', 'tiles',              'approved'),
  ('agent.card',                  'ibm-carbon', 'tiles',              'approved'),
  ('agent.activity-flow',         'ibm-carbon', 'progress-indicator', 'approved'),
  ('agent.task-queue',            'ibm-carbon', 'table',              'approved'),
  ('agent.recommendation-panel',  'ibm-carbon', 'tiles',              'approved'),
  ('agent.action-approval-modal', 'ibm-carbon', 'modal',              'approved'),
  ('agent.workbench',             'ibm-carbon', 'tabs',               'approved'),
  ('agent.evidence-drawer',       'ibm-carbon', 'modal',              'approved'),
  ('agent.followup-center',       'ibm-carbon', 'table',              'approved'),
  ('agent.audit-trail',           'ibm-carbon', 'table',              'approved')
ON CONFLICT (component_key) DO NOTHING;

-- Sanity guard — every row must be present + carbon-vendor + approved.
DO $$
DECLARE
  expected TEXT[] := ARRAY[
    'agent.status-strip','agent.card','agent.activity-flow','agent.task-queue',
    'agent.recommendation-panel','agent.action-approval-modal','agent.workbench',
    'agent.evidence-drawer','agent.followup-center','agent.audit-trail'
  ];
  missing INT;
BEGIN
  SELECT count(*) INTO missing
  FROM unnest(expected) k
  WHERE NOT EXISTS (
    SELECT 1 FROM dos.dynamic_ui_component_registry r
    WHERE r.component_key = k AND r.vendor = 'ibm-carbon'
      AND r.approval_status = 'approved'
  );
  IF missing > 0 THEN
    RAISE EXCEPTION '[agentic-ui] % expected component_keys missing/unapproved/non-carbon', missing;
  END IF;
END $$;

COMMIT;
