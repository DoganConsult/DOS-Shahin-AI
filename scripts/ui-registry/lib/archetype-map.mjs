/**
 * Shared archetype/template mapping used by ui-registry:{import,diff,seed:dev}.
 *
 * Maps a Dynamic-UI component_key to one of the 31 canonical archetypes and
 * its ESM export from `@platform/shell/templates`. Mirrors:
 *   - chk_archetype constraint in 20260503_0017_phase_f_ui_route_template_binding.sql
 *   - ARCHETYPE_EXPORTS in scripts/ci-guards/template-coverage.mjs
 *   - REGISTRY_COMPONENT_MAP / archetype routing in platform/dos/registry/component-map.ts
 *
 * Returns { archetype, template_export } or null when no canonical archetype
 * applies (caller should skip such routes — they remain on the
 * component-map default).
 */
export function mapComponentKeyToArchetype(componentKey, route = '') {
  const k = String(componentKey || '');
  const r = String(route || '');

  // ── Universal `module.*` slugs (preferred per universal seed standard) ────
  if (/^module\.(entry|overview)\.page$/.test(k))
    return { archetype: 'command-home', template_export: 'ModuleOverviewTemplateComponent' };
  if (k === 'module.posture.page')
    return { archetype: 'posture-overview', template_export: 'PostureOverviewTemplateComponent' };
  if (k === 'module.records.page')
    return { archetype: 'intelligent-register', template_export: 'ModuleRecordsTemplateComponent' };
  if (k === 'module.heatmap.page')
    return { archetype: 'risk-landscape', template_export: 'ModuleHeatmapTemplateComponent' };
  if (k === 'module.workflows.page')
    return { archetype: 'workflow-control', template_export: 'ModuleAssessmentsTemplateComponent' };
  if (k === 'module.trends.page')
    return { archetype: 'trend-intelligence', template_export: 'TrendIntelligenceTemplateComponent' };
  if (k === 'module.reports.page')
    return { archetype: 'evidence-reports', template_export: 'ModuleReportsTemplateComponent' };
  if (k === 'module.work_queue' || k === 'module.workqueue.page' || k === 'module.queue.page')
    return { archetype: 'action-queue', template_export: 'ModuleWorkQueueTemplateComponent' };
  if (k === 'module.settings.page')
    return { archetype: 'module-settings', template_export: 'ModuleSettingsTemplateComponent' };
  if (k === 'module.record.detail' || /\.detail$/.test(k))
    return { archetype: 'record-story', template_export: 'RecordStoryTemplateComponent' };
  if (k === 'module.record.create' || /\.create$/.test(k))
    return { archetype: 'guided-create', template_export: 'GuidedCreateTemplateComponent' };
  if (k === 'module.ai.advisor' || /\.advisor$/.test(k))
    return { archetype: 'ai-advisor', template_export: 'AiAdvisorTemplateComponent' };
  if (k === 'product-wc.checklist' || /onboarding|activation/i.test(k))
    return { archetype: 'activation-journey', template_export: 'ActivationJourneyTemplateComponent' };

  // ── New 18 archetypes (roster patch 31) ──────────────────────────────────
  // Each pair mirrors ARCHETYPE_REGISTRY in
  // platform/core/platform/shell/templates/module-template.types.ts.
  if (k === 'module.dashboard.page')
    return { archetype: 'decision-dashboard', template_export: 'DecisionDashboardTemplateComponent' };
  if (k === 'module.command_dashboard.page')
    return { archetype: 'command-dashboard', template_export: 'CommandDashboardTemplateComponent' };
  if (k === 'module.workflow_timeline.page')
    return { archetype: 'workflow-timeline', template_export: 'WorkflowTimelineTemplateComponent' };
  if (k === 'module.followup_center.page')
    return { archetype: 'follow-up-center', template_export: 'FollowUpCenterTemplateComponent' };
  if (k === 'module.export.page')
    return { archetype: 'export-center', template_export: 'ExportCenterTemplateComponent' };
  if (k === 'module.audit_trail' || k === 'module.audit_trail.page')
    return { archetype: 'audit-trail', template_export: 'AuditTrailTemplateComponent' };
  if (k === 'module.audit_trail_ledger.page')
    return { archetype: 'audit-trail-ledger', template_export: 'AuditTrailLedgerTemplateComponent' };
  if (k === 'module.audit_evidence.page')
    return { archetype: 'audit-trail-evidence', template_export: 'AuditTrailEvidenceTemplateComponent' };
  if (k === 'module.calendar.page')
    return { archetype: 'calendar-timeline', template_export: 'CalendarTimelineTemplateComponent' };
  if (k === 'module.compliance_calendar.page')
    return { archetype: 'compliance-calendar', template_export: 'ComplianceCalendarTemplateComponent' };
  if (k === 'module.roadmap.page')
    return { archetype: 'remediation-roadmap', template_export: 'RemediationRoadmapTemplateComponent' };
  if (k === 'module.org_chart.page')
    return { archetype: 'org-chart', template_export: 'OrgChartTemplateComponent' };
  if (k === 'module.ownership_map.page')
    return { archetype: 'ownership-map', template_export: 'OwnershipMapTemplateComponent' };
  if (k === 'module.delegation_center.page')
    return { archetype: 'delegation-center', template_export: 'DelegationCenterTemplateComponent' };
  if (k === 'module.agent_flow.page')
    return { archetype: 'agent-flow', template_export: 'AgentFlowTemplateComponent' };
  if (k === 'module.agent_registry.page')
    return { archetype: 'agent-registry', template_export: 'AgentRegistryTemplateComponent' };
  if (k === 'module.user_agent_workbench.page')
    return { archetype: 'user-agent-workbench', template_export: 'UserAgentWorkbenchTemplateComponent' };
  if (k === 'module.incident_response.page')
    return { archetype: 'incident-response', template_export: 'IncidentResponseTemplateComponent' };

  // ── Per-module page-key conventions (PascalCase suffix patterns) ─────────
  if (/HeatmapPage$/.test(k) || /\.heatmap\.page$/.test(k))
    return { archetype: 'risk-landscape', template_export: 'ModuleHeatmapTemplateComponent' };
  if (/PosturePage$/.test(k) || /\.posture\.page$/.test(k))
    return { archetype: 'posture-overview', template_export: 'PostureOverviewTemplateComponent' };
  if (/AssessmentsPage$/.test(k) || /\.assessments\.page$/.test(k))
    return { archetype: 'workflow-control', template_export: 'ModuleAssessmentsTemplateComponent' };
  if (/(Register|List|Records|Findings|Incidents|Alerts|Vendors|Assets|Policies|Frameworks|Controls)Page$/.test(k))
    return { archetype: 'intelligent-register', template_export: 'ModuleRecordsTemplateComponent' };
  if (/ReportsPage$/.test(k) || /\.reports\.page$/.test(k))
    return { archetype: 'evidence-reports', template_export: 'ModuleReportsTemplateComponent' };
  if (/(WorkQueue|Queue)Page$/.test(k) || /\.work_queue$/.test(k))
    return { archetype: 'action-queue', template_export: 'ModuleWorkQueueTemplateComponent' };
  if (/SettingsPage$/.test(k) || /\.settings\.page$/.test(k))
    return { archetype: 'module-settings', template_export: 'ModuleSettingsTemplateComponent' };
  if (/(Overview|Home)Page$/.test(k) || /\.overview\.page$/.test(k) || /\.entry\.page$/.test(k))
    return { archetype: 'command-home', template_export: 'ModuleOverviewTemplateComponent' };
  if (/(Trends|Trend)Page$/.test(k) || /\.trends\.page$/.test(k))
    return { archetype: 'trend-intelligence', template_export: 'TrendIntelligenceTemplateComponent' };

  // ── Admin-SPA prefixed component_keys (Phase A admin routes) ────────────
  // Every admin module emits keys like `<vendor>.<module>.<view>` or
  // `<widget-shape>.<entity>` (page-masthead.*, smart-grid.*, audit-timeline.*,
  // matrix.*, command-center.*, forensic-timeline.*, assertion-dashboard.*).
  if (/^page-masthead\./.test(k) || /^command-center(\.|$)/.test(k))
    return { archetype: 'command-home', template_export: 'ModuleOverviewTemplateComponent' };
  if (/^smart-grid\./.test(k) || /^smart-data-grid(\.|$)/.test(k))
    return { archetype: 'intelligent-register', template_export: 'ModuleRecordsTemplateComponent' };
  if (/^audit-timeline\./.test(k) || /^forensic-timeline(\.|$)/.test(k))
    return { archetype: 'evidence-reports', template_export: 'ModuleReportsTemplateComponent' };
  if (/^matrix\./.test(k))
    return { archetype: 'risk-landscape', template_export: 'ModuleHeatmapTemplateComponent' };
  if (/^assertion-dashboard(\.|$)/.test(k))
    return { archetype: 'posture-overview', template_export: 'PostureOverviewTemplateComponent' };

  // ── Platform admin keys: `platform.<module>.<view>` ─────────────────────
  if (/^platform\./.test(k)) {
    const view = k.split('.').pop() ?? '';
    if (view === 'overview') return { archetype: 'command-home', template_export: 'ModuleOverviewTemplateComponent' };
    if (view === 'audit')    return { archetype: 'evidence-reports', template_export: 'ModuleReportsTemplateComponent' };
    if (view === 'governance' || view === 'policies' || view === 'lifecycle')
      return { archetype: 'module-settings', template_export: 'ModuleSettingsTemplateComponent' };
    if (view === 'metrics' || view === 'health' || view === 'engine' || view === 'gateway')
      return { archetype: 'trend-intelligence', template_export: 'TrendIntelligenceTemplateComponent' };
    // Default platform view = list-of-things → intelligent-register
    return { archetype: 'intelligent-register', template_export: 'ModuleRecordsTemplateComponent' };
  }

  // ── Route-suffix fallback (for routes whose component_key is generic) ────
  const tail = r.replace(/\/$/, '').split('/').pop() ?? '';
  if (tail === 'overview' || tail === '')
    return { archetype: 'command-home', template_export: 'ModuleOverviewTemplateComponent' };
  if (tail === 'settings' || tail === 'flags')
    return { archetype: 'module-settings', template_export: 'ModuleSettingsTemplateComponent' };
  if (tail === 'reports')
    return { archetype: 'evidence-reports', template_export: 'ModuleReportsTemplateComponent' };
  if (tail === 'heatmap')
    return { archetype: 'risk-landscape', template_export: 'ModuleHeatmapTemplateComponent' };
  if (tail === 'register' || tail === 'records')
    return { archetype: 'intelligent-register', template_export: 'ModuleRecordsTemplateComponent' };

  return null;
}

// Canonical 31 archetypes — kept in lockstep with ARCHETYPE_REGISTRY in
// platform/core/platform/shell/templates/module-template.types.ts and
// chk_archetype in 20260503_0019_phase_f_archetype_registry_seed.sql.
export const ALLOWED_ARCHETYPES = new Set([
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
]);
