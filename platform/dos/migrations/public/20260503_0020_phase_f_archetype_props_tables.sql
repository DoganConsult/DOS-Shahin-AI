-- 20260503_0020_phase_f_archetype_props_tables.sql
-- Owner: ui-os-service.
-- Phase F — additive per-archetype props tables for the 18 new archetypes
-- introduced by the 31-archetype roster patch (20260503_0019). All tables are
-- joined into the resolver `props` object lazily by archetype, keeping the
-- main template-binding lookup cheap.
--
-- Forward-only and idempotent (CREATE TABLE IF NOT EXISTS, CREATE INDEX
-- IF NOT EXISTS). No data backfill — seeding flows through
-- `pnpm ui-registry:import` once renderer wiring lands.
--
-- Carbon-only contract:
--   These tables describe configuration only; they do not register UI
--   components themselves. The `dos.dynamic_ui_component_registry` and
--   `dos.ui_carbon_components` checks (vendor='ibm-carbon',
--   trg_carbon_only_runtime) remain the runtime gate.

BEGIN;

-- 1. Calendar / Timeline events (calendar-timeline, compliance-calendar)
CREATE TABLE IF NOT EXISTS dos.ui_route_calendar_event (
  id            BIGSERIAL PRIMARY KEY,
  route         TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  event_id      TEXT NOT NULL,
  title_en      TEXT NOT NULL,
  title_ar      TEXT,
  category      TEXT,                -- 'regulatory','internal','audit','review'
  starts_at     TIMESTAMPTZ NOT NULL,
  ends_at       TIMESTAMPTZ,
  status        TEXT,                -- 'scheduled','in-progress','completed','overdue'
  severity      TEXT,
  link          TEXT,
  UNIQUE(route, event_id)
);
CREATE INDEX IF NOT EXISTS ix_ui_route_calendar_event_route ON dos.ui_route_calendar_event(route);
CREATE INDEX IF NOT EXISTS ix_ui_route_calendar_event_starts ON dos.ui_route_calendar_event(starts_at);

-- 2. Roadmap milestones (remediation-roadmap)
CREATE TABLE IF NOT EXISTS dos.ui_route_roadmap_milestone (
  id            BIGSERIAL PRIMARY KEY,
  route         TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  milestone_id  TEXT NOT NULL,
  title_en      TEXT NOT NULL,
  title_ar      TEXT,
  description   TEXT,
  target_date   DATE,
  progress      INTEGER NOT NULL DEFAULT 0,
  status        TEXT,                -- 'not-started','in-progress','at-risk','done'
  owner         TEXT,
  UNIQUE(route, milestone_id),
  CONSTRAINT chk_roadmap_progress CHECK (progress BETWEEN 0 AND 100)
);
CREATE INDEX IF NOT EXISTS ix_ui_route_roadmap_route ON dos.ui_route_roadmap_milestone(route);

-- 3. Org-chart nodes (org-chart)
CREATE TABLE IF NOT EXISTS dos.ui_route_org_chart_node (
  id            BIGSERIAL PRIMARY KEY,
  route         TEXT NOT NULL,
  node_id       TEXT NOT NULL,
  parent_id     TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  title_en      TEXT NOT NULL,
  title_ar      TEXT,
  role          TEXT,
  owner         TEXT,
  badge         TEXT,
  UNIQUE(route, node_id)
);
CREATE INDEX IF NOT EXISTS ix_ui_route_org_chart_route ON dos.ui_route_org_chart_node(route);
CREATE INDEX IF NOT EXISTS ix_ui_route_org_chart_parent ON dos.ui_route_org_chart_node(route, parent_id);

-- 4. Ownership-map edges (ownership-map)
CREATE TABLE IF NOT EXISTS dos.ui_route_ownership_edge (
  id            BIGSERIAL PRIMARY KEY,
  route         TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  edge_id       TEXT NOT NULL,
  entity_id     TEXT NOT NULL,
  entity_label  TEXT NOT NULL,
  owner         TEXT NOT NULL,
  ownership_role TEXT NOT NULL,      -- 'accountable','responsible','consulted','informed','custodian','approver','reviewer','executor','observer'
  effective_from DATE,
  effective_to   DATE,
  CONSTRAINT chk_ownership_role CHECK (ownership_role IN
    ('accountable','responsible','consulted','informed','custodian','approver','reviewer','executor','observer')),
  UNIQUE(route, edge_id)
);
CREATE INDEX IF NOT EXISTS ix_ui_route_ownership_edge_route ON dos.ui_route_ownership_edge(route);

-- 5. Delegation rules (delegation-center)
CREATE TABLE IF NOT EXISTS dos.ui_route_delegation_rule (
  id            BIGSERIAL PRIMARY KEY,
  route         TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  rule_id       TEXT NOT NULL,
  delegator     TEXT NOT NULL,
  delegate      TEXT NOT NULL,
  scope         TEXT NOT NULL,
  permission    TEXT,
  starts_at     TIMESTAMPTZ NOT NULL,
  ends_at       TIMESTAMPTZ,
  status        TEXT,                -- 'active','scheduled','expired','revoked'
  UNIQUE(route, rule_id)
);
CREATE INDEX IF NOT EXISTS ix_ui_route_delegation_rule_route ON dos.ui_route_delegation_rule(route);

-- 6. Agent registry entries (agent-registry, user-agent-workbench)
CREATE TABLE IF NOT EXISTS dos.ui_route_agent_registry (
  id            BIGSERIAL PRIMARY KEY,
  route         TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  agent_id      TEXT NOT NULL,
  name_en       TEXT NOT NULL,
  name_ar       TEXT,
  agent_type    TEXT,                -- 'platform','tenant','user','vendor'
  capability    TEXT,
  status        TEXT,                -- 'enabled','disabled','draft'
  owner         TEXT,
  ai_model      TEXT,
  UNIQUE(route, agent_id)
);
CREATE INDEX IF NOT EXISTS ix_ui_route_agent_registry_route ON dos.ui_route_agent_registry(route);

-- 7. Agent-flow steps (agent-flow)
CREATE TABLE IF NOT EXISTS dos.ui_route_agent_flow_step (
  id            BIGSERIAL PRIMARY KEY,
  route         TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  step_id       TEXT NOT NULL,
  label_en      TEXT NOT NULL,
  label_ar      TEXT,
  step_type     TEXT,                -- 'tool-call','llm','condition','human-review','wait'
  agent_id      TEXT,
  status        TEXT,                -- 'pending','running','done','error','skipped'
  evidence_uri  TEXT,
  UNIQUE(route, step_id)
);
CREATE INDEX IF NOT EXISTS ix_ui_route_agent_flow_step_route ON dos.ui_route_agent_flow_step(route);

-- 8. Incident-response runbook steps (incident-response)
CREATE TABLE IF NOT EXISTS dos.ui_route_incident_runbook_step (
  id            BIGSERIAL PRIMARY KEY,
  route         TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  step_id       TEXT NOT NULL,
  label_en      TEXT NOT NULL,
  label_ar      TEXT,
  phase         TEXT,                -- 'detect','contain','eradicate','recover','review'
  owner         TEXT,
  due_at        TIMESTAMPTZ,
  status        TEXT,                -- 'pending','in-progress','blocked','done'
  evidence_uri  TEXT,
  UNIQUE(route, step_id)
);
CREATE INDEX IF NOT EXISTS ix_ui_route_incident_runbook_route ON dos.ui_route_incident_runbook_step(route);

-- 9. Incident communications log (incident-response)
CREATE TABLE IF NOT EXISTS dos.ui_route_incident_communication (
  id            BIGSERIAL PRIMARY KEY,
  route         TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  comm_id       TEXT NOT NULL,
  channel       TEXT NOT NULL,       -- 'email','sms','slack','status-page','press-release'
  audience      TEXT NOT NULL,       -- 'internal','customer','regulator','board','public'
  sent_at       TIMESTAMPTZ NOT NULL,
  message_en    TEXT NOT NULL,
  message_ar    TEXT,
  UNIQUE(route, comm_id)
);
CREATE INDEX IF NOT EXISTS ix_ui_route_incident_comm_route ON dos.ui_route_incident_communication(route);

-- 10. Audit-ledger rows (audit-trail-ledger)
CREATE TABLE IF NOT EXISTS dos.ui_route_audit_ledger_row (
  id            BIGSERIAL PRIMARY KEY,
  route         TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  ledger_id     TEXT NOT NULL,
  occurred_at   TIMESTAMPTZ NOT NULL,
  actor         TEXT NOT NULL,
  action        TEXT NOT NULL,
  entity_type   TEXT,
  entity_id     TEXT,
  prev_hash     TEXT,
  hash          TEXT NOT NULL,       -- tamper-evident chain
  decision_ref  TEXT,
  UNIQUE(route, ledger_id)
);
CREATE INDEX IF NOT EXISTS ix_ui_route_audit_ledger_route ON dos.ui_route_audit_ledger_row(route);
CREATE INDEX IF NOT EXISTS ix_ui_route_audit_ledger_time ON dos.ui_route_audit_ledger_row(occurred_at);

-- 11. Audit-evidence artifacts (audit-trail-evidence)
CREATE TABLE IF NOT EXISTS dos.ui_route_audit_evidence_artifact (
  id            BIGSERIAL PRIMARY KEY,
  route         TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  artifact_id   TEXT NOT NULL,
  title_en      TEXT NOT NULL,
  title_ar      TEXT,
  artifact_type TEXT,                -- 'document','screenshot','export','attestation','log'
  hash          TEXT,
  collected_at  TIMESTAMPTZ NOT NULL,
  collected_by  TEXT,
  download_url  TEXT,
  UNIQUE(route, artifact_id)
);
CREATE INDEX IF NOT EXISTS ix_ui_route_audit_evidence_route ON dos.ui_route_audit_evidence_artifact(route);

-- 12. Follow-up center items (follow-up-center)
CREATE TABLE IF NOT EXISTS dos.ui_route_follow_up_item (
  id            BIGSERIAL PRIMARY KEY,
  route         TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  item_id       TEXT NOT NULL,
  title_en      TEXT NOT NULL,
  title_ar      TEXT,
  origin_ref    TEXT,                -- audit-finding, incident, review action
  owner         TEXT,
  due_at        TIMESTAMPTZ,
  status        TEXT,                -- 'open','in-progress','overdue','closed'
  severity      TEXT,
  ai_score      INTEGER,
  UNIQUE(route, item_id)
);
CREATE INDEX IF NOT EXISTS ix_ui_route_follow_up_route ON dos.ui_route_follow_up_item(route);

-- 13. Export-center artifacts (export-center)
CREATE TABLE IF NOT EXISTS dos.ui_route_export_artifact (
  id            BIGSERIAL PRIMARY KEY,
  route         TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  artifact_id   TEXT NOT NULL,
  title_en      TEXT NOT NULL,
  title_ar      TEXT,
  format        TEXT NOT NULL,       -- 'pdf','csv','xlsx','json'
  status        TEXT NOT NULL,       -- 'ready','generating','failed'
  size_kb       INTEGER,
  download_url  TEXT,
  generated_at  TIMESTAMPTZ,
  CONSTRAINT chk_export_format CHECK (format IN ('pdf','csv','xlsx','json')),
  CONSTRAINT chk_export_status CHECK (status IN ('ready','generating','failed')),
  UNIQUE(route, artifact_id)
);
CREATE INDEX IF NOT EXISTS ix_ui_route_export_artifact_route ON dos.ui_route_export_artifact(route);

-- 14. Workflow-timeline steps (workflow-timeline)
CREATE TABLE IF NOT EXISTS dos.ui_route_workflow_timeline_step (
  id            BIGSERIAL PRIMARY KEY,
  route         TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  step_id       TEXT NOT NULL,
  label_en      TEXT NOT NULL,
  label_ar      TEXT,
  state         TEXT NOT NULL,       -- 'complete','current','incomplete','invalid','disabled'
  description   TEXT,
  occurred_at   TIMESTAMPTZ,
  actor         TEXT,
  CONSTRAINT chk_wf_timeline_state CHECK (state IN
    ('complete','current','incomplete','invalid','disabled')),
  UNIQUE(route, step_id)
);
CREATE INDEX IF NOT EXISTS ix_ui_route_wf_timeline_route ON dos.ui_route_workflow_timeline_step(route);

COMMIT;
