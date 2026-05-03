/**
 * @dos/module-templates — Universal Module Page Template Library
 * 31 canonical archetypes (roster patch — see ARCHETYPE_REGISTRY in
 * module-template.types.ts for the canonical stable-key → component_key →
 * raw IBM Carbon primitive table). All modules import from this single
 * entry point. All 31 renderers are shipped (13 original + 18 added by the
 * roster patch).
 *
 * Usage:
 *   import { CommandHomeTemplateComponent, ModuleInsightPillars } from '@platform/shell/templates';
 *
 * Design contract:
 *   ① Every template accepts [pillars]: ModuleInsightPillars
 *   ② Every template embeds <dos-insight-bar> (5-pillar: What Changed / Why / Risk / Next / Evidence)
 *   ③ Every template is role-adaptive (currentRole + writeRoles)
 *   ④ Every template has [aiHeadline] — AI speaks first, always
 *   ⑤ All IBM Carbon from dos.ui_carbon_components (active only, no PrimeNG)
 *
 * Story-first design law:
 *   Module leads user from Information → Decision → Action → Evidence.
 *   Pages do not wait for users. They present the most critical thing NOW.
 */

// ── Type Contracts ──────────────────────────────────────────────────────────
// Import these first — they define the universal language of all templates.
export * from './module-template.types';

// ── Universal Insight Bar ───────────────────────────────────────────────────
// <dos-insight-bar> — embedded in all 31 templates. Can also be used standalone.
export { DosInsightBarComponent } from './dos-insight-bar.component';

// ══════════════════════════════════════════════════════════════════════════════
// THE 31 CANONICAL PAGE ARCHETYPES (31 renderers shipped — 13 original + 18 new)
// All export names are mirrored in
// scripts/ci-guards/template-coverage.mjs:ARCHETYPE_EXPORTS,
// scripts/ui-registry/lib/archetype-map.mjs:mapComponentKeyToArchetype, and
// platform/dos/registry/component-map.ts:REGISTRY_COMPONENT_MAP.
// ══════════════════════════════════════════════════════════════════════════════

// 1. Command Home
//    Selector: dos-command-home
//    Story: Entry + hero metric + AI headline + NBA actions
//    Use for: Module landing page, posture at a glance
export { ModuleOverviewTemplateComponent as CommandHomeTemplateComponent } from './module-overview.template';
export { ModuleOverviewTemplateComponent } from './module-overview.template';

// 2. Posture Overview
//    Selector: dos-posture-overview
//    Story: Maturity domains + radar chart + peer benchmark + top gaps
//    Use for: Full landscape view, maturity assessment results
export {
  PostureOverviewTemplateComponent,
  type MaturityDomain,
  type PostureKpi,
} from './module-posture-overview.template';

// 3. Intelligent Register
//    Selector: dos-intelligent-register
//    Story: Searchable entity list + AI-score column + bulk actions
//    Use for: Risk register, control register, incident list
export { ModuleRecordsTemplateComponent as IntelligentRegisterTemplateComponent } from './module-records.template';
export { ModuleRecordsTemplateComponent } from './module-records.template';

// 4. Risk Landscape
//    Selector: dos-risk-landscape
//    Story: Interactive heatmap matrix + bubble chart + modal drill-down
//    Use for: Risk heatmap, control landscape
export { ModuleHeatmapTemplateComponent as RiskLandscapeTemplateComponent } from './module-heatmap.template';
export { ModuleHeatmapTemplateComponent } from './module-heatmap.template';
export type { HeatmapCell } from './module-heatmap.template';

// 5. Workflow Control Room
//    Selector: dos-workflow-control
//    Story: Staged pipeline + tabs + AI-ranked items + chart slots
//    Use for: Assessments, audits, review workflows
export { ModuleAssessmentsTemplateComponent as WorkflowControlTemplateComponent } from './module-extra.templates';
export { ModuleAssessmentsTemplateComponent } from './module-extra.templates';

// 6. Trend Intelligence
//    Selector: dos-trend-intelligence
//    Story: Time series trends + AI predictions + period switcher + forecasts
//    Use for: KPI trends, score evolution, risk trajectory
export {
  TrendIntelligenceTemplateComponent,
  type TrendSeries,
} from './module-trend-intelligence.template';

// 7. Evidence & Reports Hub
//    Selector: dos-evidence-reports
//    Story: Report card gallery + AI-generated badge + export actions
//    Use for: Board packs, regulatory reports, audit evidence
export { ModuleReportsTemplateComponent as EvidenceReportsTemplateComponent } from './module-extra.templates';
export { ModuleReportsTemplateComponent } from './module-extra.templates';

// 8. My Action Queue
//    Selector: dos-action-queue
//    Story: AI-ranked tasks by urgency group (overdue/today/week/upcoming)
//    Use for: Personal task queue, work assignments, review queue
export { ModuleWorkQueueTemplateComponent as ActionQueueTemplateComponent } from './module-workqueue.template';
export { ModuleWorkQueueTemplateComponent } from './module-workqueue.template';
export type { WorkTask } from './module-workqueue.template';

// 9. Module Control Settings
//    Selector: dos-module-settings
//    Story: Tabbed config + role-gated save bar
//    Use for: Module configuration, thresholds, role bindings
export { ModuleSettingsTemplateComponent as ModuleControlSettingsTemplateComponent } from './module-extra.templates';
export { ModuleSettingsTemplateComponent } from './module-extra.templates';

// 10. 360° Record Story
//     Selector: dos-record-story
//     Story: Full record tearsheet + fields + timeline + evidence + connections
//     Use for: Risk detail, incident detail, control detail, any entity detail
export {
  RecordStoryTemplateComponent,
  type RecordField,
  type RecordTimelineEvent,
  type RecordTab,
} from './module-record-story.template';

// 11. Guided Create / Edit
//     Selector: dos-guided-create
//     Story: Multi-step form wizard + AI-prefilled steps + AI assistant sidebar
//     Use for: Create risk, create control, create incident, edit any record
export {
  GuidedCreateTemplateComponent,
  type FormStep,
} from './module-guided-create.template';

// 12. AI Risk Advisor
//     Selector: dos-ai-advisor
//     Story: AI recommendations + confidence scores + patterns + model identity
//     Use for: AI insights hub, recommendations dashboard, advisory panel
export {
  AiAdvisorTemplateComponent,
  type AiRecommendation,
  type AiPattern,
} from './module-ai-advisor.template';

// 13. Activation Journey
//     Selector: dos-activation-journey
//     Story: Setup checklist + progress bar + coachmark invitations
//     Use for: Module onboarding, first-run setup, feature activation
export { ModuleOnboardingTemplateComponent as ActivationJourneyTemplateComponent } from './module-extra.templates';
export { ModuleOnboardingTemplateComponent } from './module-extra.templates';

// ══════════════════════════════════════════════════════════════════════════════
// THE NEW 18 ARCHETYPES (roster patch 31) — renderer files now shipped
// ══════════════════════════════════════════════════════════════════════════════

// 14. Decision Dashboard
export { DecisionDashboardTemplateComponent } from './module-decision-dashboard.template';

// 15. Audit Trail
export { AuditTrailTemplateComponent } from './module-audit-trail.template';

// 16. Calendar Timeline
export { CalendarTimelineTemplateComponent } from './module-calendar-timeline.template';

// 17–31. Extended renderers (15) — co-located, raw IBM Carbon only.
export {
  CommandDashboardTemplateComponent,
  ExportCenterTemplateComponent,
  ComplianceCalendarTemplateComponent,
  WorkflowTimelineTemplateComponent,
  RemediationRoadmapTemplateComponent,
  OrgChartTemplateComponent,
  OwnershipMapTemplateComponent,
  DelegationCenterTemplateComponent,
  AgentFlowTemplateComponent,
  AgentRegistryTemplateComponent,
  UserAgentWorkbenchTemplateComponent,
  AuditTrailLedgerTemplateComponent,
  AuditTrailEvidenceTemplateComponent,
  FollowUpCenterTemplateComponent,
  IncidentResponseTemplateComponent,
  type ExportArtifact,
  type ComplianceCalendarEvent,
  type WorkflowTimelineStep,
  type RoadmapMilestone,
  type OrgChartNode,
  type OwnershipEdge,
  type OwnershipRole,
  type DelegationRule,
  type AgentFlowStep,
  type AgentRegistryEntry,
  type AuditLedgerRow,
  type AuditEvidenceArtifact,
  type FollowUpItem,
  type IncidentRunbookStep,
  type IncidentCommunication,
} from './module-archetypes-extended.templates';

// 32. Case Finalization
//     Selector: dos-case-finalization
//     Story: Cases pending closure — decision + sign-off + evidence + rationale
//     Use for: Governance cases, audit cases, incident closure, exception sign-off
export {
  CaseFinalizationTemplateComponent,
  type CaseFinalizationRow,
} from './module-case-finalization.template';

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT KEY ↔ TEMPLATE REGISTRY
// Maps dos.dynamic_ui_component_registry component_key → Template
// ══════════════════════════════════════════════════════════════════════════════
//
// component_key              → Selector                  → Template Class
// ─────────────────────────────────────────────────────────────────────────────
// module.overview.page       → dos-command-home           → CommandHomeTemplateComponent
// module.posture.page        → dos-posture-overview       → PostureOverviewTemplateComponent
// RiskRegisterPage           → dos-intelligent-register   → IntelligentRegisterTemplateComponent
// RiskHeatmapPage            → dos-risk-landscape         → RiskLandscapeTemplateComponent
// RiskAssessmentsPage        → dos-workflow-control       → WorkflowControlTemplateComponent
// module.trends.page         → dos-trend-intelligence     → TrendIntelligenceTemplateComponent
// module.reports.page        → dos-evidence-reports       → EvidenceReportsTemplateComponent
// module.work_queue          → dos-action-queue           → ActionQueueTemplateComponent
// module.settings.page       → dos-module-settings        → ModuleControlSettingsTemplateComponent
// module.record.detail       → dos-record-story           → RecordStoryTemplateComponent
// module.record.create       → dos-guided-create          → GuidedCreateTemplateComponent
// module.ai.advisor          → dos-ai-advisor             → AiAdvisorTemplateComponent
// product-wc.checklist       → dos-activation-journey     → ActivationJourneyTemplateComponent
