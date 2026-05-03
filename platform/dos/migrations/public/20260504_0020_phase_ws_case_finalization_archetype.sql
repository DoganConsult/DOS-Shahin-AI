-- Phase WS-1b — Add 32nd archetype: case-finalization.
-- Owner: ui-os-service.
--
-- "Cases under finalization" — closes a long-standing gap. Used for
-- governance cases (dos.governance_os_cases), audit cases, incident cases,
-- compliance exception cases, etc. The archetype renders a CaseFinalization
-- template (header summary + decision pane + signoff ledger + linked
-- evidence + timeline) on top of an IBM Carbon `tabs` primitive.
--
-- Forward-only and idempotent. Touches three things:
--   1. chk_archetype constraint on dos.ui_route_template_binding (extend).
--   2. dos.dynamic_ui_component_registry — new component_key
--      `module.case_finalization.page`.
--   3. New props table dos.ui_route_case_finalization (one-row-per-case
--      summary; multiple cases per route allowed via case_id).

BEGIN;

-- ─── 1. Extend chk_archetype to include case-finalization ───────────────────
ALTER TABLE dos.ui_route_template_binding
  DROP CONSTRAINT IF EXISTS chk_archetype;

ALTER TABLE dos.ui_route_template_binding
  ADD CONSTRAINT chk_archetype CHECK (archetype IN (
    'command-home',
    'decision-dashboard','command-dashboard','posture-overview','trend-intelligence',
    'intelligent-register','risk-landscape','record-story','guided-create',
    'action-queue','workflow-control','workflow-timeline','follow-up-center',
    'evidence-reports','export-center','audit-trail','audit-trail-ledger','audit-trail-evidence',
    'calendar-timeline','compliance-calendar','remediation-roadmap',
    'org-chart','ownership-map','delegation-center',
    'ai-advisor','agent-flow','agent-registry','user-agent-workbench',
    'module-settings',
    'activation-journey',
    'incident-response',
    'case-finalization'   -- NEW (32nd archetype)
  ));

-- ─── 2. Register the new component_key ──────────────────────────────────────
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, bundle_url, schema_version, vendor, approval_status, carbon_key, metadata)
VALUES
  ('module.case_finalization.page', '/templates/module-case-finalization.bundle.js', 1, 'ibm-carbon', 'approved', 'tabs',
     jsonb_build_object('archetype','case-finalization','family','K-operational-p0','template_export','CaseFinalizationTemplateComponent','permission_aware',true))
ON CONFLICT (component_key) DO UPDATE SET
  bundle_url      = EXCLUDED.bundle_url,
  schema_version  = EXCLUDED.schema_version,
  vendor          = EXCLUDED.vendor,
  approval_status = EXCLUDED.approval_status,
  carbon_key      = EXCLUDED.carbon_key,
  metadata        = EXCLUDED.metadata,
  approved_at     = COALESCE(dos.dynamic_ui_component_registry.approved_at, now());

-- ─── 3. Props table for case-finalization rows ──────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_route_case_finalization (
  id              BIGSERIAL PRIMARY KEY,
  route           TEXT NOT NULL,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  case_id         TEXT NOT NULL,
  title_en        TEXT NOT NULL,
  title_ar        TEXT,
  case_type       TEXT,                 -- 'governance','audit','incident','exception','third-party'
  origin_ref      TEXT,                 -- e.g. INC-001, RISK-027, FNDG-014
  decision        TEXT,                 -- 'approve','reject','accept-risk','escalate','defer'
  decision_owner  TEXT,
  decision_at     TIMESTAMPTZ,
  signoff_status  TEXT,                 -- 'pending','partial','complete','rejected'
  evidence_uri    TEXT,
  rationale_en    TEXT,
  rationale_ar    TEXT,
  next_review_at  DATE,
  status          TEXT,                 -- 'open','in-review','finalized','reopened'
  CONSTRAINT chk_case_finalization_status CHECK (status IS NULL OR status IN
    ('open','in-review','finalized','reopened')),
  CONSTRAINT chk_case_finalization_decision CHECK (decision IS NULL OR decision IN
    ('approve','reject','accept-risk','escalate','defer')),
  CONSTRAINT chk_case_finalization_signoff CHECK (signoff_status IS NULL OR signoff_status IN
    ('pending','partial','complete','rejected')),
  UNIQUE(route, case_id)
);
CREATE INDEX IF NOT EXISTS ix_ui_route_case_finalization_route
  ON dos.ui_route_case_finalization(route);
CREATE INDEX IF NOT EXISTS ix_ui_route_case_finalization_status
  ON dos.ui_route_case_finalization(status);

-- ─── 4. Sanity guard ────────────────────────────────────────────────────────
DO $$
DECLARE
  ck TEXT;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO ck
    FROM pg_constraint WHERE conname='chk_archetype';
  IF ck NOT LIKE '%case-finalization%' THEN
    RAISE EXCEPTION '[phase-ws-1b] chk_archetype was not extended with case-finalization';
  END IF;
END $$;

COMMIT;
