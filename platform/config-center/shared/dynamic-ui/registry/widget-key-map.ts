// Spec §7.2 — canonical widget_key → lazy component map.
//
// Single source of truth for the active SPA. Widgets registered through
// WidgetRegistryService.registerMany at bootstrap should source their lazy
// component from this map (not from per-feature ad-hoc imports).
//
// Keys are the snake_case backend widget_key values published by
// dos.dynamic_ui_widgets.widget_key. Values are lazy component factories.

import type { Type } from '@angular/core';

export type LazyComponent = () => Promise<Type<unknown>>;

// Extra widget keys removed — workflow module and shahin page
// components will be registered dynamically when their packages ship.

const CANONICAL_SIGNATURE_WIDGET_MAP: Record<string, LazyComponent> = {
  // Foundation signature widgets (per ui.contract.json)
  'foundation-command-center': () =>
    import('@foundation-module/ui').then(m => m.FoundationOverviewComponent as unknown as Type<unknown>),
  'org-graph-canvas': () =>
    import('@foundation-module/ui').then(m => m.FoundationOrganizationComponent as unknown as Type<unknown>),
  'identity-360-list': () =>
    import('@foundation-module/ui').then(m => m.FoundationUsersComponent as unknown as Type<unknown>),
  'identity-360': () =>
    import('@foundation-module/ui').then(m => m.FoundationUsersComponent as unknown as Type<unknown>),
  'permission-matrix': () =>
    import('@foundation-module/ui').then(m => m.FoundationPermissionMatrixComponent as unknown as Type<unknown>),
  'raci-canvas': () =>
    import('@foundation-module/ui').then(m => m.FoundationTeamsComponent as unknown as Type<unknown>),
  'geo-coverage-map': () =>
    import('@foundation-module/ui').then(m => m.FoundationLocationsComponent as unknown as Type<unknown>),
  'decision-room': () =>
    import('@foundation-module/ui').then(m => m.FoundationCommitteesComponent as unknown as Type<unknown>),
  'authority-simulator': () =>
    import('@foundation-module/ui').then(m => m.FoundationDelegationsComponent as unknown as Type<unknown>),
  'ownership-heatmap': () =>
    import('@foundation-module/ui').then(m => m.FoundationOwnershipMappingComponent as unknown as Type<unknown>),
  'campaign-cockpit': () =>
    import('@foundation-module/ui').then(m => m.FoundationAccessReviewComponent as unknown as Type<unknown>),
  'lifecycle-board': () =>
    import('../../../board-report/features/policy/pages/policy-lifecycle.component').then(m => m.PolicyLifecycleComponent as unknown as Type<unknown>),
  'ropa-map': () =>
    import('@foundation-module/ui').then(m => m.FoundationDataProcessingComponent as unknown as Type<unknown>),
  'taxonomy-editor': () =>
    import('@foundation-module/ui').then(m => m.FoundationReferenceDataComponent as unknown as Type<unknown>),
  'forensic-timeline': () =>
    import('@foundation-module/ui').then(m => m.FoundationAuditComponent as unknown as Type<unknown>),
  'tenant-control-center': () =>
    import('@foundation-module/ui').then(m => m.FoundationSettingsComponent as unknown as Type<unknown>),
  'business-units-grid': () =>
    import('@foundation-module/ui').then(m => m.FoundationBusinessUnitsComponent as unknown as Type<unknown>),
  'departments-grid': () =>
    import('@foundation-module/ui').then(m => m.FoundationDepartmentsComponent as unknown as Type<unknown>),
  'positions-board': () =>
    import('@foundation-module/ui').then(m => m.FoundationPositionsComponent as unknown as Type<unknown>),
  'foundation-roles-list': () =>
    import('@foundation-module/ui').then(m => m.FoundationRolesComponent as unknown as Type<unknown>),
  'foundation-policies-list': () =>
    import('@foundation-module/ui').then(m => m.FoundationPoliciesComponent as unknown as Type<unknown>),
  'foundation-operations-readiness': () =>
    import('@foundation-module/ui').then(m => m.FoundationOperationsReadinessComponent as unknown as Type<unknown>),
  // G1 — Employee Lifecycle widgets
  'foundation-onboarding-kanban': () =>
    import('@foundation-module/ui').then(m => m.FoundationOnboardingKanbanComponent as unknown as Type<unknown>),
  'foundation-probation-queue': () =>
    import('@foundation-module/ui').then(m => m.FoundationProbationQueueComponent as unknown as Type<unknown>),
  'foundation-lifecycle-timeline': () =>
    import('@foundation-module/ui').then(m => m.FoundationLifecycleTimelineComponent as unknown as Type<unknown>),
  // G2 — Authority + SoD widgets
  'foundation-authority-matrix': () =>
    import('@foundation-module/ui').then(m => m.FoundationAuthorityMatrixComponent as unknown as Type<unknown>),
  'foundation-sod-rules': () =>
    import('@foundation-module/ui').then(m => m.FoundationSodRulesComponent as unknown as Type<unknown>),
  'foundation-sod-violations': () =>
    import('@foundation-module/ui').then(m => m.FoundationSodViolationsComponent as unknown as Type<unknown>),
  // G7 — Compliance Fabric widgets
  'foundation-policy-acks': () =>
    import('@foundation-module/ui').then(m => m.FoundationPolicyAcksComponent as unknown as Type<unknown>),
  'foundation-training-board': () =>
    import('@foundation-module/ui').then(m => m.FoundationTrainingBoardComponent as unknown as Type<unknown>),
  'foundation-coi-declarations': () =>
    import('@foundation-module/ui').then(m => m.FoundationCoiDeclarationsComponent as unknown as Type<unknown>),
  'risk-heatmap': () =>
    import('@risk-module/ui/features/risk/pages/risk-heatmap.component').then(m => m.RiskHeatmapPageComponent as unknown as Type<unknown>),
  'controls-coverage-grid': () =>
    import('../../../board-report/features/controls/pages/controls-library/controls-library.component').then(m => m.ControlsLibraryComponent as unknown as Type<unknown>),
  'policy-lifecycle-board': () =>
    import('../../../board-report/features/policy/pages/policy-lifecycle.component').then(m => m.PolicyLifecycleComponent as unknown as Type<unknown>),
  'evidence-vault': () =>
    import('../../../board-report/features/evidence/pages/evidence/evidence-overview.component').then(m => m.EvidenceOverviewComponent as unknown as Type<unknown>),
  'vendor-risk-portfolio': () =>
    import('../../../board-report/features/vendor-risk/pages/vendor-sub-pages').then(m => m.VendorOverviewComponent as unknown as Type<unknown>),
  'workspace-home-cockpit': () =>
    import('../../../../foundation/ui/workspace/workspace-home.component').then(m => m.WorkspaceHomeComponent as unknown as Type<unknown>),
};

export const WIDGET_KEY_MAP: Record<string, LazyComponent> = {
  ...CANONICAL_SIGNATURE_WIDGET_MAP,
  'command-center': () =>
    import('../widgets/command-center.widget').then(m => m.CommandCenterWidgetComponent as unknown as Type<unknown>),
  'smart-data-grid': () =>
    import('../widgets/smart-data-grid.widget').then(m => m.SmartDataGridWidgetComponent as unknown as Type<unknown>),
  'entity-360': () =>
    import('../widgets/entity-360.widget').then(m => m.Entity360WidgetComponent as unknown as Type<unknown>),
  'control-library-matrix': () =>
    import('@compliance-module/ui/components/widgets').then(m => m.ControlLibraryMatrixComponent as unknown as Type<unknown>),
  'obligation-map': () =>
    import('@compliance-module/ui/components/widgets').then(m => m.ObligationMapComponent as unknown as Type<unknown>),
  'assessment-cockpit': () =>
    import('@compliance-module/ui/components/widgets').then(m => m.AssessmentCockpitComponent as unknown as Type<unknown>),
  'evidence-binder': () =>
    import('@compliance-module/ui/components/widgets').then(m => m.EvidenceBinderComponent as unknown as Type<unknown>),
  'gap-remediation-board': () =>
    import('@compliance-module/ui/components/widgets').then(m => m.GapRemediationBoardComponent as unknown as Type<unknown>),
  'framework-mapping': () =>
    import('@compliance-module/ui/components/widgets').then(m => m.FrameworkMappingComponent as unknown as Type<unknown>),
  'report-composer': () =>
    import('@compliance-module/ui/components/widgets').then(m => m.ReportComposerComponent as unknown as Type<unknown>),
  'ai-recommendations-panel': () =>
    import('../../../../foundation/ui/shared/ai-panel/ai-panel.component').then(m => m.AiPanelComponent as unknown as Type<unknown>),
  'agent-copilot-panel': () =>
    import('../../../../foundation/ui/shared/ai-panel/ai-panel.component').then(m => m.AiPanelComponent as unknown as Type<unknown>),
  // workflow-module and shahin page widgets removed — will be re-added
  // when their packages ship with real component exports.
};

/** Keys present in WIDGET_KEY_MAP — used for prefix / .cfg fallbacks (keep in sync with carbon-dynamic-ui-coherence.mjs). */
const WIDGET_MAP_KEY_SET = new Set(Object.keys(WIDGET_KEY_MAP) as string[]);

/**
 * Same resolution order as scripts/ci-guards/carbon-dynamic-ui-coherence.mjs
 * `widgetFallbackTarget` — exact key, then family prefixes, then .cfg, then first segment.
 */
function widgetFallbackTarget(key: string, quoted: Set<string>): string | null {
  if (!key) return null;
  if (quoted.has(key)) return key;
  const prefixes: [string, string][] = [
    ['command-center.', 'command-center'],
    ['smart-grid.', 'smart-data-grid'],
    ['audit-timeline.', 'forensic-timeline'],
    ['context-rail.', 'entity-360'],
    ['matrix.', 'risk-heatmap'],
    ['recommendation-card.', 'ai-recommendations-panel'],
  ];
  for (const [pre, target] of prefixes) {
    if (key.startsWith(pre) && quoted.has(target)) return target;
  }
  if (key.endsWith('.cfg')) {
    const base = key.replace(/\.cfg$/, '');
    if (base === 'command-center' && quoted.has('command-center')) return 'command-center';
    if (base === 'smart-grid' && quoted.has('smart-data-grid')) return 'smart-data-grid';
    if (
      (base === 'audit-timeline' || base.startsWith('audit-timeline')) &&
      quoted.has('forensic-timeline')
    ) {
      return 'forensic-timeline';
    }
  }
  const head = key.split('.')[0];
  if (quoted.has(head)) return head;
  return null;
}

export function resolveWidgetComponent(widgetKey: string | null | undefined): LazyComponent | null {
  if (!widgetKey) return null;
  const direct = WIDGET_KEY_MAP[widgetKey];
  if (direct) return direct;
  const resolved = widgetFallbackTarget(widgetKey, WIDGET_MAP_KEY_SET);
  if (!resolved) return null;
  return WIDGET_KEY_MAP[resolved] ?? null;
}

// Spec §7.2 canonical 25 widget type families (build once, reuse everywhere).
// Used by WidgetRegistryService to categorise/validate widget_key values.
export const SPEC_WIDGET_TYPES = [
  'smart-data-grid',
  'kpi-strip',
  'work-queue',
  'timeline',
  'approval-workflow-panel',
  'agent-copilot-panel',
  'entity-360-profile',
  'relationship-graph',
  'org-hierarchy-canvas',
  'raci-ownership-matrix',
  'kanban-workflow-board',
  'risk-compliance-heatmap',
  'map-geo-coverage',
  'document-evidence-viewer',
  'decision-room',
  'bulk-action-wizard',
  'policy-impact-analyzer',
  'sod-conflict-analyzer',
  'permission-matrix',
  'live-activity-feed',
  'ai-recommendations-panel',
  'task-sla-tracker',
  'readiness-scorecard',
  'guided-form-wizard',
  'simulation-whatif-panel',
] as const;

export type SpecWidgetType = typeof SPEC_WIDGET_TYPES[number];
