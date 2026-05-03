-- =====================================================================
-- 0050 — Universal Template-Only Routing
--
-- Rule §3.1 applied platform-wide: every dos.dynamic_ui_routes row must
-- point at one of the 32 archetype component_keys defined by
-- ARCHETYPE_REGISTRY in
-- platform/core/platform/shell/templates/module-template.types.ts.
-- The archetype is already known per route via
-- dos.ui_route_template_binding.archetype, so component_key can be
-- derived deterministically.
--
-- Effects (idempotent, forward-only):
--   1. For every route that has a binding, set component_key to the
--      archetype's canonical component_key.
--   2. Whitelist exceptions (auth pages, marketing home) keep their
--      domain-specific component_key — they are NOT workspace pages and
--      are wired in app.routes.ts as direct loadComponent stubs.
-- =====================================================================
BEGIN;

-- ---------------------------------------------------------------------
-- Authoritative archetype → canonical component_key map.
-- Mirrors ARCHETYPE_REGISTRY (32 rows).
-- ---------------------------------------------------------------------
WITH archetype_to_key(archetype, component_key) AS (VALUES
  ('command-home',          'module.entry.page'),
  ('posture-overview',      'module.posture.page'),
  ('trend-intelligence',    'module.trends.page'),
  ('decision-dashboard',    'module.dashboard.page'),
  ('command-dashboard',     'module.command_dashboard.page'),
  ('intelligent-register',  'module.records.page'),
  ('risk-landscape',        'module.heatmap.page'),
  ('record-story',          'module.record.detail.page'),
  ('guided-create',         'module.record.create.page'),
  ('action-queue',          'module.work_queue'),
  ('workflow-control',      'module.workflows.page'),
  ('workflow-timeline',     'module.workflow_timeline.page'),
  ('follow-up-center',      'module.followup_center.page'),
  ('evidence-reports',      'module.reports.page'),
  ('export-center',         'module.export.page'),
  ('audit-trail',           'module.audit_trail'),
  ('audit-trail-ledger',    'module.audit_trail_ledger.page'),
  ('audit-trail-evidence',  'module.audit_evidence.page'),
  ('calendar-timeline',     'module.calendar.page'),
  ('compliance-calendar',   'module.compliance_calendar.page'),
  ('remediation-roadmap',   'module.roadmap.page'),
  ('org-chart',             'module.org_chart.page'),
  ('ownership-map',         'module.ownership_map.page'),
  ('delegation-center',     'module.delegation_center.page'),
  ('ai-advisor',            'module.ai.advisor.page'),
  ('agent-flow',            'module.agent_flow.page'),
  ('agent-registry',        'module.agent_registry.page'),
  ('user-agent-workbench',  'module.user_agent_workbench.page'),
  ('module-settings',       'module.settings.page'),
  ('activation-journey',    'module.activation.page'),
  ('incident-response',     'module.incident_response.page'),
  ('case-finalization',     'module.case_finalization.page')
)
UPDATE dos.dynamic_ui_routes r
   SET component_key = m.component_key
  FROM dos.ui_route_template_binding b
  JOIN archetype_to_key m ON m.archetype = b.archetype
 WHERE b.route = r.path_pattern
   AND r.component_key <> m.component_key
   -- Allowlist: auth + marketing pages are not template-routed.
   AND r.path_pattern NOT IN
       ('/login','/register','/forgot-password','/reset-password','/mfa','/');

COMMIT;
