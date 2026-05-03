/**
 * Phase F-F3 — Static archetype → lazy template loader registry.
 *
 * Mirrors `scripts/ui-registry/lib/archetype-map.mjs` (canonical 13 archetypes)
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
};

export const ARCHETYPE_TEMPLATE_EXPORTS: ReadonlySet<string> =
  new Set(Object.keys(LOADERS));

export function loadArchetypeTemplate(exportName: string): Promise<Type<unknown>> | null {
  const loader = LOADERS[exportName];
  return loader ? loader() : null;
}
