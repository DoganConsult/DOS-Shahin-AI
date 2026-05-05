/**
 * Phase F-F3 — Static archetype → lazy template loader registry.
 *
 * Mirrors `scripts/ui-registry/lib/archetype-map.mjs` (canonical 31 archetypes)
 * and `scripts/ci-guards/template-coverage.mjs` ARCHETYPE_EXPORTS so the FE
 * loader, the backend resolver, and the CI gates all agree.
 *
 * Each loader returns a Promise<Type<unknown>> compatible with Angular's
 * `ViewContainerRef.createComponent` and `NgComponentOutlet`.
 */
import type { Type } from '@angular/core';

type Loader = () => Promise<Type<unknown>>;

const LOADERS: Record<string, Loader> = {
  // Command Home
  ModuleOverviewTemplateComponent: () =>
    import('./templates/module-overview.template').then(m => m.ModuleOverviewTemplateComponent),
  CommandHomeTemplateComponent: () =>
    import('./templates/module-overview.template').then(m => m.ModuleOverviewTemplateComponent),

  // Posture Overview
  PostureOverviewTemplateComponent: () =>
    import('./templates/module-posture-overview.template').then(m => m.PostureOverviewTemplateComponent),

  // Intelligent Register
  ModuleRecordsTemplateComponent: () =>
    import('./templates/module-records.template').then(m => m.ModuleRecordsTemplateComponent),
  IntelligentRegisterTemplateComponent: () =>
    import('./templates/module-records.template').then(m => m.ModuleRecordsTemplateComponent),

  // Risk Landscape
  ModuleHeatmapTemplateComponent: () =>
    import('./templates/module-heatmap.template').then(m => m.ModuleHeatmapTemplateComponent),
  RiskLandscapeTemplateComponent: () =>
    import('./templates/module-heatmap.template').then(m => m.ModuleHeatmapTemplateComponent),

  // Workflow Control
  ModuleAssessmentsTemplateComponent: () =>
    import('./templates/module-extra.templates').then(m => m.ModuleAssessmentsTemplateComponent),
  WorkflowControlTemplateComponent: () =>
    import('./templates/module-extra.templates').then(m => m.ModuleAssessmentsTemplateComponent),

  // Trend Intelligence
  TrendIntelligenceTemplateComponent: () =>
    import('./templates/module-trend-intelligence.template').then(m => m.TrendIntelligenceTemplateComponent),

  // Evidence & Reports
  ModuleReportsTemplateComponent: () =>
    import('./templates/module-extra.templates').then(m => m.ModuleReportsTemplateComponent),
  EvidenceReportsTemplateComponent: () =>
    import('./templates/module-extra.templates').then(m => m.ModuleReportsTemplateComponent),

  // Action Queue
  ModuleWorkQueueTemplateComponent: () =>
    import('./templates/module-workqueue.template').then(m => m.ModuleWorkQueueTemplateComponent),
  ActionQueueTemplateComponent: () =>
    import('./templates/module-workqueue.template').then(m => m.ModuleWorkQueueTemplateComponent),

  // Module Settings
  ModuleSettingsTemplateComponent: () =>
    import('./templates/module-extra.templates').then(m => m.ModuleSettingsTemplateComponent),
  ModuleControlSettingsTemplateComponent: () =>
    import('./templates/module-extra.templates').then(m => m.ModuleSettingsTemplateComponent),

  // Record Story
  RecordStoryTemplateComponent: () =>
    import('./templates/module-record-story.template').then(m => m.RecordStoryTemplateComponent),

  // Guided Create
  GuidedCreateTemplateComponent: () =>
    import('./templates/module-guided-create.template').then(m => m.GuidedCreateTemplateComponent),

  // AI Advisor
  AiAdvisorTemplateComponent: () =>
    import('./templates/module-ai-advisor.template').then(m => m.AiAdvisorTemplateComponent),

  // Activation Journey
  ModuleOnboardingTemplateComponent: () =>
    import('./templates/module-extra.templates').then(m => m.ModuleOnboardingTemplateComponent),
  ActivationJourneyTemplateComponent: () =>
    import('./templates/module-extra.templates').then(m => m.ModuleOnboardingTemplateComponent),

  // ── 18 new archetype renderers (roster patch 31) ───────────────────────
  // Decision Dashboard
  DecisionDashboardTemplateComponent: () =>
    import('./templates/module-decision-dashboard.template').then(m => m.DecisionDashboardTemplateComponent),

  // Audit Trail
  AuditTrailTemplateComponent: () =>
    import('./templates/module-audit-trail.template').then(m => m.AuditTrailTemplateComponent),

  // Calendar Timeline
  CalendarTimelineTemplateComponent: () =>
    import('./templates/module-calendar-timeline.template').then(m => m.CalendarTimelineTemplateComponent),

  // Extended (15) — all in module-archetypes-extended.templates
  CommandDashboardTemplateComponent: () =>
    import('./templates/module-archetypes-extended.templates').then(m => m.CommandDashboardTemplateComponent),
  ExportCenterTemplateComponent: () =>
    import('./templates/module-archetypes-extended.templates').then(m => m.ExportCenterTemplateComponent),
  ComplianceCalendarTemplateComponent: () =>
    import('./templates/module-archetypes-extended.templates').then(m => m.ComplianceCalendarTemplateComponent),
  WorkflowTimelineTemplateComponent: () =>
    import('./templates/module-archetypes-extended.templates').then(m => m.WorkflowTimelineTemplateComponent),
  RemediationRoadmapTemplateComponent: () =>
    import('./templates/module-archetypes-extended.templates').then(m => m.RemediationRoadmapTemplateComponent),
  OrgChartTemplateComponent: () =>
    import('./templates/module-archetypes-extended.templates').then(m => m.OrgChartTemplateComponent),
  OwnershipMapTemplateComponent: () =>
    import('./templates/module-archetypes-extended.templates').then(m => m.OwnershipMapTemplateComponent),
  DelegationCenterTemplateComponent: () =>
    import('./templates/module-archetypes-extended.templates').then(m => m.DelegationCenterTemplateComponent),
  AgentFlowTemplateComponent: () =>
    import('./templates/module-archetypes-extended.templates').then(m => m.AgentFlowTemplateComponent),
  AgentRegistryTemplateComponent: () =>
    import('./templates/module-archetypes-extended.templates').then(m => m.AgentRegistryTemplateComponent),
  UserAgentWorkbenchTemplateComponent: () =>
    import('./templates/module-archetypes-extended.templates').then(m => m.UserAgentWorkbenchTemplateComponent),
  AuditTrailLedgerTemplateComponent: () =>
    import('./templates/module-archetypes-extended.templates').then(m => m.AuditTrailLedgerTemplateComponent),
  AuditTrailEvidenceTemplateComponent: () =>
    import('./templates/module-archetypes-extended.templates').then(m => m.AuditTrailEvidenceTemplateComponent),
  FollowUpCenterTemplateComponent: () =>
    import('./templates/module-archetypes-extended.templates').then(m => m.FollowUpCenterTemplateComponent),
  IncidentResponseTemplateComponent: () =>
    import('./templates/module-archetypes-extended.templates').then(m => m.IncidentResponseTemplateComponent),

  // Case Finalization (32nd archetype)
  CaseFinalizationTemplateComponent: () =>
    import('./templates/module-case-finalization.template').then(m => m.CaseFinalizationTemplateComponent),

  // Marketing Landing (33rd archetype) — 7 public, unauthenticated pages.
  // Each alias points to the matching `@dos/ui-system` standalone page
  // component. They satisfy `template-only-routing.mjs` (loader naming
  // contract `*TemplateComponent`) without forcing a synthetic dispatcher
  // page; route → template_export alias → real page component.
  MarketingHomeTemplateComponent: () =>
    import('@dos/ui-system').then(m => m.DosMarketingHomePageComponent),
  MarketingPricingTemplateComponent: () =>
    import('@dos/ui-system').then(m => m.DosMarketingPricingPageComponent),
  MarketingTrustTemplateComponent: () =>
    import('@dos/ui-system').then(m => m.DosMarketingTrustPageComponent),
  MarketingSecurityTemplateComponent: () =>
    import('@dos/ui-system').then(m => m.DosMarketingSecurityPageComponent),
  MarketingContactTemplateComponent: () =>
    import('@dos/ui-system').then(m => m.DosMarketingContactPageComponent),
  MarketingAboutTemplateComponent: () =>
    import('@dos/ui-system').then(m => m.DosMarketingAboutPageComponent),
  MarketingLegalTemplateComponent: () =>
    import('@dos/ui-system').then(m => m.DosMarketingLegalPageComponent),
  MarketingPlatformTemplateComponent: () =>
    import('@dos/ui-system').then(m => m.DosMarketingPlatformPageComponent),
  MarketingResourcesTemplateComponent: () =>
    import('@dos/ui-system').then(m => m.DosMarketingResourcesPageComponent),
  MarketingExecutiveKitTemplateComponent: () =>
    import('@dos/ui-system').then(m => m.DosMarketingExecutiveKitPageComponent),
};

Object.assign(LOADERS, {
  'module.entry.page': LOADERS.ModuleOverviewTemplateComponent,
  'module.overview.page': LOADERS.ModuleOverviewTemplateComponent,
  'module.command_home.page': LOADERS.CommandHomeTemplateComponent,
  'module.posture.page': LOADERS.PostureOverviewTemplateComponent,
  'module.records.page': LOADERS.ModuleRecordsTemplateComponent,
  'module.heatmap.page': LOADERS.ModuleHeatmapTemplateComponent,
  'module.workflows.page': LOADERS.ModuleAssessmentsTemplateComponent,
  'module.trends.page': LOADERS.TrendIntelligenceTemplateComponent,
  'module.reports.page': LOADERS.ModuleReportsTemplateComponent,
  'module.work_queue': LOADERS.ModuleWorkQueueTemplateComponent,
  'module.workqueue.page': LOADERS.ModuleWorkQueueTemplateComponent,
  'module.queue.page': LOADERS.ModuleWorkQueueTemplateComponent,
  'module.settings.page': LOADERS.ModuleSettingsTemplateComponent,
  'module.record.detail': LOADERS.RecordStoryTemplateComponent,
  'module.record.detail.page': LOADERS.RecordStoryTemplateComponent,
  'module.record.create': LOADERS.GuidedCreateTemplateComponent,
  'module.record.create.page': LOADERS.GuidedCreateTemplateComponent,
  'module.ai.advisor': LOADERS.AiAdvisorTemplateComponent,
  'module.ai.advisor.page': LOADERS.AiAdvisorTemplateComponent,
  'product-wc.checklist': LOADERS.ModuleOnboardingTemplateComponent,
  'module.activation.page': LOADERS.ModuleOnboardingTemplateComponent,
  'module.dashboard.page': LOADERS.DecisionDashboardTemplateComponent,
  'module.audit_trail': LOADERS.AuditTrailTemplateComponent,
  'module.audit_trail.page': LOADERS.AuditTrailTemplateComponent,
  'module.calendar.page': LOADERS.CalendarTimelineTemplateComponent,
  'module.command_dashboard.page': LOADERS.CommandDashboardTemplateComponent,
  'module.export.page': LOADERS.ExportCenterTemplateComponent,
  'module.compliance_calendar.page': LOADERS.ComplianceCalendarTemplateComponent,
  'module.workflow_timeline.page': LOADERS.WorkflowTimelineTemplateComponent,
  'module.roadmap.page': LOADERS.RemediationRoadmapTemplateComponent,
  'module.org_chart.page': LOADERS.OrgChartTemplateComponent,
  'module.ownership_map.page': LOADERS.OwnershipMapTemplateComponent,
  'module.delegation_center.page': LOADERS.DelegationCenterTemplateComponent,
  'module.agent_flow.page': LOADERS.AgentFlowTemplateComponent,
  'module.agent_registry.page': LOADERS.AgentRegistryTemplateComponent,
  'module.user_agent_workbench.page': LOADERS.UserAgentWorkbenchTemplateComponent,
  'module.audit_trail_ledger.page': LOADERS.AuditTrailLedgerTemplateComponent,
  'module.audit_evidence.page': LOADERS.AuditTrailEvidenceTemplateComponent,
  'module.followup_center.page': LOADERS.FollowUpCenterTemplateComponent,
  'module.incident_response.page': LOADERS.IncidentResponseTemplateComponent,
  'module.case_finalization.page': LOADERS.CaseFinalizationTemplateComponent,
  'marketing.home.page': LOADERS.MarketingHomeTemplateComponent,
  'marketing.pricing.page': LOADERS.MarketingPricingTemplateComponent,
  'marketing.trust.page': LOADERS.MarketingTrustTemplateComponent,
  'marketing.security.page': LOADERS.MarketingSecurityTemplateComponent,
  'marketing.contact.page': LOADERS.MarketingContactTemplateComponent,
  'marketing.about.page': LOADERS.MarketingAboutTemplateComponent,
  'marketing.legal.page': LOADERS.MarketingLegalTemplateComponent,
  'marketing.platform.page': LOADERS.MarketingPlatformTemplateComponent,
  'marketing.resources.page': LOADERS.MarketingResourcesTemplateComponent,
  'marketing.executive-kit.page': LOADERS.MarketingExecutiveKitTemplateComponent,
});

export const ARCHETYPE_TEMPLATE_EXPORTS: ReadonlySet<string> =
  new Set(Object.keys(LOADERS));

export function loadArchetypeTemplate(exportName: string): Promise<Type<unknown>> | null {
  const loader = LOADERS[exportName];
  return loader ? loader() : null;
}
