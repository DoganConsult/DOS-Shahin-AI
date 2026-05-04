// Canonical 32 approved archetype pages for module contracts.
// Module contracts must publish only through this roster.

export const APPROVED_PAGE_ROSTER = new Map([
  ['command-home',             { componentKey: 'module.entry.page',                 templateExport: 'ModuleOverviewTemplateComponent' }],
  ['posture-overview',         { componentKey: 'module.posture.page',               templateExport: 'PostureOverviewTemplateComponent' }],
  ['trend-intelligence',       { componentKey: 'module.trends.page',                templateExport: 'TrendIntelligenceTemplateComponent' }],
  ['decision-dashboard',       { componentKey: 'module.dashboard.page',             templateExport: 'DecisionDashboardTemplateComponent' }],
  ['command-dashboard',        { componentKey: 'module.command_dashboard.page',     templateExport: 'CommandDashboardTemplateComponent' }],
  ['intelligent-register',     { componentKey: 'module.records.page',               templateExport: 'ModuleRecordsTemplateComponent' }],
  ['risk-landscape',           { componentKey: 'module.heatmap.page',               templateExport: 'ModuleHeatmapTemplateComponent' }],
  ['record-story',             { componentKey: 'module.record.detail.page',         templateExport: 'RecordStoryTemplateComponent' }],
  ['guided-create',            { componentKey: 'module.record.create.page',         templateExport: 'GuidedCreateTemplateComponent' }],
  ['action-queue',             { componentKey: 'module.work_queue',                 templateExport: 'ModuleWorkQueueTemplateComponent' }],
  ['workflow-control',         { componentKey: 'module.workflows.page',             templateExport: 'ModuleAssessmentsTemplateComponent' }],
  ['workflow-timeline',        { componentKey: 'module.workflow_timeline.page',     templateExport: 'WorkflowTimelineTemplateComponent' }],
  ['follow-up-center',         { componentKey: 'module.followup_center.page',       templateExport: 'FollowUpCenterTemplateComponent' }],
  ['evidence-reports',         { componentKey: 'module.reports.page',               templateExport: 'ModuleReportsTemplateComponent' }],
  ['export-center',            { componentKey: 'module.export.page',                templateExport: 'ExportCenterTemplateComponent' }],
  ['audit-trail',              { componentKey: 'module.audit_trail',                templateExport: 'AuditTrailTemplateComponent' }],
  ['audit-trail-ledger',       { componentKey: 'module.audit_trail_ledger.page',    templateExport: 'AuditTrailLedgerTemplateComponent' }],
  ['audit-trail-evidence',     { componentKey: 'module.audit_evidence.page',        templateExport: 'AuditTrailEvidenceTemplateComponent' }],
  ['calendar-timeline',        { componentKey: 'module.calendar.page',              templateExport: 'CalendarTimelineTemplateComponent' }],
  ['compliance-calendar',      { componentKey: 'module.compliance_calendar.page',   templateExport: 'ComplianceCalendarTemplateComponent' }],
  ['remediation-roadmap',      { componentKey: 'module.roadmap.page',               templateExport: 'RemediationRoadmapTemplateComponent' }],
  ['org-chart',                { componentKey: 'module.org_chart.page',             templateExport: 'OrgChartTemplateComponent' }],
  ['ownership-map',            { componentKey: 'module.ownership_map.page',         templateExport: 'OwnershipMapTemplateComponent' }],
  ['delegation-center',        { componentKey: 'module.delegation_center.page',     templateExport: 'DelegationCenterTemplateComponent' }],
  ['ai-advisor',               { componentKey: 'module.ai.advisor.page',            templateExport: 'AiAdvisorTemplateComponent' }],
  ['agent-flow',               { componentKey: 'module.agent_flow.page',            templateExport: 'AgentFlowTemplateComponent' }],
  ['agent-registry',           { componentKey: 'module.agent_registry.page',        templateExport: 'AgentRegistryTemplateComponent' }],
  ['user-agent-workbench',     { componentKey: 'module.user_agent_workbench.page',  templateExport: 'UserAgentWorkbenchTemplateComponent' }],
  ['module-settings',          { componentKey: 'module.settings.page',              templateExport: 'ModuleSettingsTemplateComponent' }],
  ['activation-journey',       { componentKey: 'module.activation.page',            templateExport: 'ActivationJourneyTemplateComponent' }],
  ['incident-response',        { componentKey: 'module.incident_response.page',     templateExport: 'IncidentResponseTemplateComponent' }],
  ['case-finalization',        { componentKey: 'module.case_finalization.page',     templateExport: 'CaseFinalizationTemplateComponent' }],
]);

export const APPROVED_PAGE_COMPONENT_KEYS = new Set(
  [...APPROVED_PAGE_ROSTER.values()].map(entry => entry.componentKey),
);

export const APPROVED_PAGE_ARCHETYPE_COUNT = APPROVED_PAGE_ROSTER.size;

export function getApprovedPageEntry(archetype) {
  return APPROVED_PAGE_ROSTER.get(String(archetype ?? '')) ?? null;
}

export function isApprovedPageComponentKey(componentKey) {
  return APPROVED_PAGE_COMPONENT_KEYS.has(String(componentKey ?? ''));
}

export function shouldEnforceApprovedPageRoster(contract) {
  return String(contract?.module?.code ?? '') !== 'workspace-shell';
}