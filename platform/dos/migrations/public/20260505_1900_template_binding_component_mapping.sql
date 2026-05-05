-- =============================================================================
-- Migration: 20260505_1900_template_binding_component_mapping
-- Purpose:   Fix template_export component references in ui_route_template_binding
--            to match registered components in dynamic_ui_component_registry.
--
-- Issue:     All 184 template_export values reference Angular component class
--            names (e.g., ModuleOverviewTemplateComponent) that do NOT exist
--            in dos.dynamic_ui_component_registry. This causes runtime resolution
--            failures.
--
-- Fix:       Map template_export values to the correct component_key values that
--            exist in the registry.
--
-- Idempotent: YES — UPDATE matches only rows with old template_export values.
--             Re-runs become no-ops once all mappings are applied.
-- =============================================================================

BEGIN;

-- Map template_export values to registered component_keys
UPDATE dos.ui_route_template_binding
SET template_export = 'module.overview.page'
WHERE template_export = 'ModuleOverviewTemplateComponent';

UPDATE dos.ui_route_template_binding
SET template_export = 'module.records.page'
WHERE template_export = 'ModuleRecordsTemplateComponent';

UPDATE dos.ui_route_template_binding
SET template_export = 'module.command_dashboard.page'
WHERE template_export = 'CommandDashboardTemplateComponent';

UPDATE dos.ui_route_template_binding
SET template_export = 'module.settings.page'
WHERE template_export = 'ModuleSettingsTemplateComponent';

UPDATE dos.ui_route_template_binding
SET template_export = 'module.reports.page'
WHERE template_export = 'ModuleReportsTemplateComponent';

UPDATE dos.ui_route_template_binding
SET template_export = 'module.heatmap.page'
WHERE template_export = 'ModuleHeatmapTemplateComponent';

UPDATE dos.ui_route_template_binding
SET template_export = 'module.workflows.page'
WHERE template_export = 'ModuleAssessmentsTemplateComponent';

UPDATE dos.ui_route_template_binding
SET template_export = 'module.workflow_timeline.page'
WHERE template_export = 'WorkflowTimelineTemplateComponent';

UPDATE dos.ui_route_template_binding
SET template_export = 'module.agent_flow.page'
WHERE template_export = 'AgentFlowTemplateComponent';

UPDATE dos.ui_route_template_binding
SET template_export = 'module.agent_registry.page'
WHERE template_export = 'AgentRegistryTemplateComponent';

UPDATE dos.ui_route_template_binding
SET template_export = 'module.audit_evidence.page'
WHERE template_export = 'AuditTrailEvidenceTemplateComponent';

UPDATE dos.ui_route_template_binding
SET template_export = 'module.audit_trail_ledger.page'
WHERE template_export = 'AuditTrailLedgerTemplateComponent';

UPDATE dos.ui_route_template_binding
SET template_export = 'module.calendar.page'
WHERE template_export = 'CalendarTimelineTemplateComponent';

UPDATE dos.ui_route_template_binding
SET template_export = 'module.compliance_calendar.page'
WHERE template_export = 'ComplianceCalendarTemplateComponent';

UPDATE dos.ui_route_template_binding
SET template_export = 'module.dashboard.page'
WHERE template_export = 'DecisionDashboardTemplateComponent';

UPDATE dos.ui_route_template_binding
SET template_export = 'module.delegation_center.page'
WHERE template_export = 'DelegationCenterTemplateComponent';

UPDATE dos.ui_route_template_binding
SET template_export = 'module.export.page'
WHERE template_export = 'ExportCenterTemplateComponent';

UPDATE dos.ui_route_template_binding
SET template_export = 'module.followup_center.page'
WHERE template_export = 'FollowUpCenterTemplateComponent';

UPDATE dos.ui_route_template_binding
SET template_export = 'module.incident_response.page'
WHERE template_export = 'IncidentResponseTemplateComponent';

UPDATE dos.ui_route_template_binding
SET template_export = 'module.org_chart.page'
WHERE template_export = 'OrgChartTemplateComponent';

UPDATE dos.ui_route_template_binding
SET template_export = 'module.ownership_map.page'
WHERE template_export = 'OwnershipMapTemplateComponent';

UPDATE dos.ui_route_template_binding
SET template_export = 'module.posture.page'
WHERE template_export = 'PostureOverviewTemplateComponent';

UPDATE dos.ui_route_template_binding
SET template_export = 'module.roadmap.page'
WHERE template_export = 'RemediationRoadmapTemplateComponent';

UPDATE dos.ui_route_template_binding
SET template_export = 'module.trends.page'
WHERE template_export = 'TrendIntelligenceTemplateComponent';

UPDATE dos.ui_route_template_binding
SET template_export = 'module.user_agent_workbench.page'
WHERE template_export = 'UserAgentWorkbenchTemplateComponent';

UPDATE dos.ui_route_template_binding
SET template_export = 'module.work_queue'
WHERE template_export = 'ModuleWorkQueueTemplateComponent';

-- Marketing pages
UPDATE dos.ui_route_template_binding
SET template_export = 'marketing.home.page'
WHERE template_export = 'MarketingHomeTemplateComponent';

UPDATE dos.ui_route_template_binding
SET template_export = 'marketing.about.page'
WHERE template_export = 'MarketingAboutTemplateComponent';

UPDATE dos.ui_route_template_binding
SET template_export = 'marketing.contact.page'
WHERE template_export = 'MarketingContactTemplateComponent';

UPDATE dos.ui_route_template_binding
SET template_export = 'marketing.legal.page'
WHERE template_export = 'MarketingLegalTemplateComponent';

UPDATE dos.ui_route_template_binding
SET template_export = 'marketing.pricing.page'
WHERE template_export = 'MarketingPricingTemplateComponent';

UPDATE dos.ui_route_template_binding
SET template_export = 'marketing.security.page'
WHERE template_export = 'MarketingSecurityTemplateComponent';

UPDATE dos.ui_route_template_binding
SET template_export = 'marketing.trust.page'
WHERE template_export = 'MarketingTrustTemplateComponent';

-- Record story - use record.detail.page as fallback
UPDATE dos.ui_route_template_binding
SET template_export = 'module.record.detail.page'
WHERE template_export = 'RecordStoryTemplateComponent';

-- Self-assertion: zero template_export values should still reference unregistered components
DO $$
DECLARE
  missing_count integer;
BEGIN
  SELECT COUNT(*)
    INTO missing_count
    FROM dos.ui_route_template_binding
   WHERE template_export NOT IN (
     SELECT component_key FROM dos.dynamic_ui_component_registry
     WHERE approval_status = 'approved'
   );
  IF missing_count <> 0 THEN
    RAISE EXCEPTION
      'template_binding component mapping left % rows with unregistered template_export',
      missing_count;
  END IF;
END $$;

COMMIT;
