-- Register the 32 approved *TemplateComponent names as alias rows in
-- dos.dynamic_ui_component_registry so contracts can publish bindings with
-- template_export = '<Archetype>TemplateComponent' (the real Angular FE
-- component the SPA loads), satisfying both:
--   - trg_validate_template_export (registry membership + approved)
--   - fk_template_export_registry  (FK to component_key)
-- carbon_key is copied from the matching module.<archetype>.page row so the
-- carbon-coherence and carbon-only-runtime triggers stay green.
--
-- Idempotent: ON CONFLICT DO NOTHING; safe to re-run.

BEGIN;

INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, approval_status, carbon_key, schema_version, metadata, approved_at)
SELECT v.template_export,
       'ibm-carbon',
       'approved',
       r.carbon_key,
       '1',
       jsonb_build_object('approved_template_alias_for', v.source_key),
       now()
FROM (VALUES
  ('ModuleOverviewTemplateComponent',        'module.entry.page'),
  ('PostureOverviewTemplateComponent',       'module.posture.page'),
  ('TrendIntelligenceTemplateComponent',     'module.trends.page'),
  ('DecisionDashboardTemplateComponent',     'module.dashboard.page'),
  ('CommandDashboardTemplateComponent',      'module.command_dashboard.page'),
  ('ModuleRecordsTemplateComponent',         'module.records.page'),
  ('ModuleHeatmapTemplateComponent',         'module.heatmap.page'),
  ('RecordStoryTemplateComponent',           'module.record.detail.page'),
  ('GuidedCreateTemplateComponent',          'module.record.create.page'),
  ('ModuleWorkQueueTemplateComponent',       'module.work_queue'),
  ('ModuleAssessmentsTemplateComponent',     'module.workflows.page'),
  ('WorkflowTimelineTemplateComponent',      'module.workflow_timeline.page'),
  ('FollowUpCenterTemplateComponent',        'module.followup_center.page'),
  ('ModuleReportsTemplateComponent',         'module.reports.page'),
  ('ExportCenterTemplateComponent',          'module.export.page'),
  ('AuditTrailTemplateComponent',            'module.audit_trail'),
  ('AuditTrailLedgerTemplateComponent',      'module.audit_trail_ledger.page'),
  ('AuditTrailEvidenceTemplateComponent',    'module.audit_evidence.page'),
  ('CalendarTimelineTemplateComponent',      'module.calendar.page'),
  ('ComplianceCalendarTemplateComponent',    'module.compliance_calendar.page'),
  ('RemediationRoadmapTemplateComponent',    'module.roadmap.page'),
  ('OrgChartTemplateComponent',              'module.org_chart.page'),
  ('OwnershipMapTemplateComponent',          'module.ownership_map.page'),
  ('DelegationCenterTemplateComponent',      'module.delegation_center.page'),
  ('AiAdvisorTemplateComponent',             'module.ai.advisor.page'),
  ('AgentFlowTemplateComponent',             'module.agent_flow.page'),
  ('AgentRegistryTemplateComponent',         'module.agent_registry.page'),
  ('UserAgentWorkbenchTemplateComponent',    'module.user_agent_workbench.page'),
  ('ModuleSettingsTemplateComponent',        'module.settings.page'),
  ('ActivationJourneyTemplateComponent',     'module.activation.page'),
  ('IncidentResponseTemplateComponent',      'module.incident_response.page'),
  ('CaseFinalizationTemplateComponent',      'module.case_finalization.page')
) AS v(template_export, source_key)
JOIN dos.dynamic_ui_component_registry r
  ON r.component_key = v.source_key
ON CONFLICT (component_key) DO NOTHING;

-- Self-assertion: every approved alias is now registered + approved.
DO $$
DECLARE
  missing_count int;
BEGIN
  SELECT count(*) INTO missing_count
  FROM (VALUES
    ('ModuleOverviewTemplateComponent'),('PostureOverviewTemplateComponent'),
    ('TrendIntelligenceTemplateComponent'),('DecisionDashboardTemplateComponent'),
    ('CommandDashboardTemplateComponent'),('ModuleRecordsTemplateComponent'),
    ('ModuleHeatmapTemplateComponent'),('RecordStoryTemplateComponent'),
    ('GuidedCreateTemplateComponent'),('ModuleWorkQueueTemplateComponent'),
    ('ModuleAssessmentsTemplateComponent'),('WorkflowTimelineTemplateComponent'),
    ('FollowUpCenterTemplateComponent'),('ModuleReportsTemplateComponent'),
    ('ExportCenterTemplateComponent'),('AuditTrailTemplateComponent'),
    ('AuditTrailLedgerTemplateComponent'),('AuditTrailEvidenceTemplateComponent'),
    ('CalendarTimelineTemplateComponent'),('ComplianceCalendarTemplateComponent'),
    ('RemediationRoadmapTemplateComponent'),('OrgChartTemplateComponent'),
    ('OwnershipMapTemplateComponent'),('DelegationCenterTemplateComponent'),
    ('AiAdvisorTemplateComponent'),('AgentFlowTemplateComponent'),
    ('AgentRegistryTemplateComponent'),('UserAgentWorkbenchTemplateComponent'),
    ('ModuleSettingsTemplateComponent'),('ActivationJourneyTemplateComponent'),
    ('IncidentResponseTemplateComponent'),('CaseFinalizationTemplateComponent')
  ) AS v(k)
  WHERE NOT EXISTS (
    SELECT 1 FROM dos.dynamic_ui_component_registry r
    WHERE r.component_key = v.k AND r.approval_status = 'approved'
  );
  IF missing_count > 0 THEN
    RAISE EXCEPTION 'approved-template alias registration incomplete: % missing', missing_count;
  END IF;
END $$;

COMMIT;
