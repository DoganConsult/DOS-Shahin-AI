-- Phase F-F6 W-D — DB-only rebind pack.
-- Owner: ui-os-service.
--
-- Lifts the 62 admin/settings binding rows from the original 6-archetype
-- baseline (command-home, evidence-reports, intelligent-register,
-- module-settings, risk-landscape, trend-intelligence) onto the full
-- 31-archetype roster shipped with migrations 0019 + 0020.
--
-- Forward-only and idempotent: every UPDATE is keyed on `route` and the
-- `chk_archetype` constraint guarantees the new archetype names are valid.
-- The trg_bump_ui_route_template_version trigger bumps `version` on each
-- write so caches invalidate naturally.
--
-- Mapping rationale (per archetype family):
--   ── E-evidence ──
--     audit          → audit-trail-ledger     (tamper-evident chain)
--     dauth/audit    → audit-trail-evidence   (artifact tearsheet)
--   ── B-insight ──
--     <module>       → decision-dashboard      (root landing → exec view)
--     <runtime>      → command-dashboard       (ops command-room)
--   ── G-governance ──
--     foundation/organizations → org-chart
--     foundation/persons       → ownership-map
--     dauth/roles              → delegation-center
--     dauth/permissions        → ownership-map
--   ── H-agentic ──
--     ai/engine, ai/gateway    → agent-registry
--     ai/governance            → user-agent-workbench
--     ai (root)                → agent-flow
--   ── F-time-plan ──
--     foundation/lifecycle     → calendar-timeline
--   ── K-operational-p0 ──
--     dnoc/alerts              → incident-response
--     dsoc/incidents           → incident-response
--     dnoc, dsoc (root)        → command-dashboard

BEGIN;

-- ─── E-evidence: audit-trail-ledger / audit-trail-evidence ──────────────────
UPDATE dos.ui_route_template_binding
   SET archetype='audit-trail-ledger', template_export='AuditTrailLedgerTemplateComponent'
 WHERE route IN (
   '/admin/access/audit',
   '/admin/ai/audit',
   '/admin/config-center/audit',
   '/admin/dnoc/audit',
   '/admin/dos/audit',
   '/admin/dsoc/audit',
   '/admin/foundation/audit',
   '/admin/multi-tenant/audit',
   '/admin/runtime/audit',
   '/admin/tenants/audit',
   '/admin/ui-system/audit'
 );

UPDATE dos.ui_route_template_binding
   SET archetype='audit-trail-evidence', template_export='AuditTrailEvidenceTemplateComponent'
 WHERE route='/admin/dauth/audit';

-- ─── B-insight: decision-dashboard / command-dashboard ──────────────────────
UPDATE dos.ui_route_template_binding
   SET archetype='decision-dashboard', template_export='DecisionDashboardTemplateComponent'
 WHERE route IN (
   '/admin/access',
   '/admin/config-center',
   '/admin/dauth',
   '/admin/dos',
   '/admin/foundation',
   '/admin/multi-tenant',
   '/admin/tenants',
   '/admin/ui-system'
 );

UPDATE dos.ui_route_template_binding
   SET archetype='command-dashboard', template_export='CommandDashboardTemplateComponent'
 WHERE route IN (
   '/admin/runtime',
   '/admin/dnoc',
   '/admin/dsoc'
 );

-- ─── G-governance: org-chart / ownership-map / delegation-center ────────────
UPDATE dos.ui_route_template_binding
   SET archetype='org-chart', template_export='OrgChartTemplateComponent'
 WHERE route='/admin/foundation/organizations';

UPDATE dos.ui_route_template_binding
   SET archetype='ownership-map', template_export='OwnershipMapTemplateComponent'
 WHERE route IN (
   '/admin/foundation/persons',
   '/admin/dauth/permissions',
   '/admin/multi-tenant/tenants'
 );

UPDATE dos.ui_route_template_binding
   SET archetype='delegation-center', template_export='DelegationCenterTemplateComponent'
 WHERE route='/admin/dauth/roles';

-- ─── H-agentic: agent-registry / agent-flow / user-agent-workbench ──────────
UPDATE dos.ui_route_template_binding
   SET archetype='agent-registry', template_export='AgentRegistryTemplateComponent'
 WHERE route IN (
   '/admin/ai/engine',
   '/admin/ai/gateway'
 );

UPDATE dos.ui_route_template_binding
   SET archetype='user-agent-workbench', template_export='UserAgentWorkbenchTemplateComponent'
 WHERE route='/admin/ai/governance';

UPDATE dos.ui_route_template_binding
   SET archetype='agent-flow', template_export='AgentFlowTemplateComponent'
 WHERE route='/admin/ai';

-- ─── F-time-plan: calendar-timeline ─────────────────────────────────────────
UPDATE dos.ui_route_template_binding
   SET archetype='calendar-timeline', template_export='CalendarTimelineTemplateComponent'
 WHERE route='/admin/foundation/lifecycle';

-- ─── K-operational-p0: incident-response ────────────────────────────────────
UPDATE dos.ui_route_template_binding
   SET archetype='incident-response', template_export='IncidentResponseTemplateComponent'
 WHERE route IN (
   '/admin/dnoc/alerts',
   '/admin/dsoc/incidents'
 );

-- ─── E-evidence: export-center for explicit data-export surfaces ────────────
UPDATE dos.ui_route_template_binding
   SET archetype='export-center', template_export='ExportCenterTemplateComponent'
 WHERE route='/admin/dos/registries';

-- ─── D-work: workflow-timeline / follow-up-center ───────────────────────────
UPDATE dos.ui_route_template_binding
   SET archetype='workflow-timeline', template_export='WorkflowTimelineTemplateComponent'
 WHERE route='/admin/multi-tenant/provisioning';

UPDATE dos.ui_route_template_binding
   SET archetype='follow-up-center', template_export='FollowUpCenterTemplateComponent'
 WHERE route='/admin/dnoc/services';

-- ─── F-time-plan: remediation-roadmap / compliance-calendar ─────────────────
UPDATE dos.ui_route_template_binding
   SET archetype='remediation-roadmap', template_export='RemediationRoadmapTemplateComponent'
 WHERE route='/admin/multi-tenant/quotas';

UPDATE dos.ui_route_template_binding
   SET archetype='compliance-calendar', template_export='ComplianceCalendarTemplateComponent'
 WHERE route='/admin/dsoc/policies';

-- ─── Sanity guard — at least 18 distinct archetypes must be present ─────────
DO $$
DECLARE
  distinct_count INTEGER;
BEGIN
  SELECT count(DISTINCT archetype) INTO distinct_count
    FROM dos.ui_route_template_binding;
  IF distinct_count < 18 THEN
    RAISE EXCEPTION '[phase-f-f6 rebind] expected >=18 distinct archetypes, found %', distinct_count;
  END IF;
END $$;

COMMIT;
