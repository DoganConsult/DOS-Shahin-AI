/**
 * UI Capability Registry
 * ----------------------
 *
 * Single source of truth for every component key that Dynamic UI is
 * permitted to coordinate at runtime — both the generic primitives that
 * live in `@dos/ui-system` and the module-owned domain widgets that
 * register themselves with Dynamic UI.
 *
 * Architecture (governed flow):
 *   Module UI Contract → Dynamic UI Resolver → Component Allowlist
 *   → @dos/ui-system Component → Product Theme
 *
 * Categories
 *   - core      : generic primitive owned by `@dos/ui-system`
 *   - layout    : shell/layout primitive owned by `@dos/ui-system`
 *   - domain    : business widget owned by a module; MUST register here
 *
 * Rules (enforced by CI guards + runtime allowlist):
 *   - Generic/shared UI MUST live in `@dos/ui-system` (category `core`/`layout`).
 *   - Domain widgets stay module-owned (category `domain`) but MUST be
 *     listed in this registry; entries declare `owner`, allowed `modules`,
 *     `responsiveModes`, required `permissions`, and any agent/workflow hooks.
 *   - Any componentKey not present in `UI_CAPABILITY_REGISTRY` is refused
 *     by the Dynamic UI runtime allowlist and fails the
 *     `ui-component-allowlist.mjs` CI guard.
 */

import { APPROVED_COMPONENT_KEYS, type ApprovedComponentKey } from './component-keys.js';

export type UiCapabilityCategory = 'core' | 'layout' | 'domain';
export type UiResponsiveMode = 'mobile' | 'tablet' | 'desktop';

export interface UiCapabilityHook {
  /** e.g. `agent.invoke`, `workflow.transition`, `export.start`. */
  kind: 'agent' | 'workflow' | 'export' | 'realtime' | 'ai';
  /** Stable hook id consumed by Dynamic UI orchestration. */
  id: string;
}

export interface UiCapabilityEntry {
  /** Stable allowlist key (must match `APPROVED_COMPONENT_KEYS` for core/layout). */
  componentKey: string;
  /** Owner package or module folder. */
  owner: string;
  /** core/layout/domain (see top-of-file rules). */
  category: UiCapabilityCategory;
  /** Modules permitted to render this component ('*' means any module). */
  allowedModules: ReadonlyArray<string>;
  /** Required input prop names (Dynamic UI rejects render if missing). */
  requiredInputs: ReadonlyArray<string>;
  /** Responsive modes the component implements/declares. */
  responsiveModes: ReadonlyArray<UiResponsiveMode>;
  /** Permission codes (dot style) required to render. Empty = always-on. */
  permissions: ReadonlyArray<string>;
  /** Agent/workflow/export/realtime/AI hooks this component participates in. */
  hooks: ReadonlyArray<UiCapabilityHook>;
  /** Free-form description used by docs + audit. */
  description: string;
}

/**
 * Seed entries.
 *
 * `core` / `layout` entries mirror APPROVED_COMPONENT_KEYS and are owned by
 * `@dos/ui-system`. `domain` entries are placeholders for the canonical
 * domain widgets named in the architecture spec — they remain module-owned;
 * the registry is the governance contract that lets Dynamic UI render them
 * through the allowlist instead of letting modules ship parallel UI shells.
 */
export const UI_CAPABILITY_REGISTRY: ReadonlyArray<UiCapabilityEntry> = Object.freeze([
  // ---- core ----------------------------------------------------------------
  {
    componentKey: 'PageHeader',
    owner: '@dos/ui-system',
    category: 'core',
    allowedModules: ['*'],
    requiredInputs: ['title'],
    responsiveModes: ['mobile', 'tablet', 'desktop'],
    permissions: [],
    hooks: [],
    description: 'Canonical page masthead with breadcrumb / meta / actions / extra projection slots.',
  },
  {
    componentKey: 'Tabs',
    owner: '@dos/ui-system',
    category: 'core',
    allowedModules: ['*'],
    requiredInputs: ['items', 'selectedId'],
    responsiveModes: ['mobile', 'tablet', 'desktop'],
    permissions: [],
    hooks: [],
    description: 'Token-driven tab strip; mobile horizontal-scroll safe.',
  },
  {
    componentKey: 'MetricCard',
    owner: '@dos/ui-system',
    category: 'core',
    allowedModules: ['*'],
    requiredInputs: ['label', 'value'],
    responsiveModes: ['mobile', 'tablet', 'desktop'],
    permissions: [],
    hooks: [],
    description: 'KPI tile used inside ResponsiveGrid; replaces module-local quick-tile/kpi-card duplicates.',
  },
  {
    componentKey: 'AdaptiveCommandBar',
    owner: '@dos/ui-system',
    category: 'core',
    allowedModules: ['*'],
    requiredInputs: ['actions'],
    responsiveModes: ['mobile', 'tablet', 'desktop'],
    permissions: [],
    hooks: [{ kind: 'export', id: 'export.start' }],
    description: 'Mobile collapses to create/search/filter/more; desktop shows full toolbar.',
  },
  {
    componentKey: 'StatusBanner',
    owner: '@dos/ui-system',
    category: 'core',
    allowedModules: ['*'],
    requiredInputs: ['kind', 'message'],
    responsiveModes: ['mobile', 'tablet', 'desktop'],
    permissions: [],
    hooks: [],
    description: 'Tokenised banner for partial-error, syncing, archived, and similar surface-wide states.',
  },
  {
    componentKey: 'EmptyState',
    owner: '@dos/ui-system',
    category: 'core',
    allowedModules: ['*'],
    requiredInputs: ['title'],
    responsiveModes: ['mobile', 'tablet', 'desktop'],
    permissions: [],
    hooks: [],
    description: 'No-data / first-use / filtered-empty surface.',
  },
  {
    componentKey: 'LoadingState',
    owner: '@dos/ui-system',
    category: 'core',
    allowedModules: ['*'],
    requiredInputs: [],
    responsiveModes: ['mobile', 'tablet', 'desktop'],
    permissions: [],
    hooks: [],
    description: 'Skeleton/spinner used during shell loading and section fetches.',
  },
  {
    componentKey: 'ServiceCard',
    owner: '@dos/ui-system',
    category: 'core',
    allowedModules: ['*'],
    requiredInputs: ['title'],
    responsiveModes: ['mobile', 'tablet', 'desktop'],
    permissions: [],
    hooks: [],
    description: 'Generic service entry card.',
  },
  {
    componentKey: 'ChallengeCard',
    owner: '@dos/ui-system',
    category: 'core',
    allowedModules: ['*'],
    requiredInputs: ['title'],
    responsiveModes: ['mobile', 'tablet', 'desktop'],
    permissions: [],
    hooks: [],
    description: 'Generic challenge / next-best-action card.',
  },
  {
    componentKey: 'AccountMenu',
    owner: '@dos/ui-system',
    category: 'core',
    allowedModules: ['*'],
    requiredInputs: ['items'],
    responsiveModes: ['mobile', 'tablet', 'desktop'],
    permissions: [],
    hooks: [],
    description: 'Bottom-sheet on mobile, constrained popover on desktop.',
  },
  {
    componentKey: 'BottomSheet',
    owner: '@dos/ui-system',
    category: 'core',
    allowedModules: ['*'],
    requiredInputs: ['open'],
    responsiveModes: ['mobile'],
    permissions: [],
    hooks: [],
    description: 'Mobile overflow surface; required for command-bar More actions and account menu.',
  },
  {
    componentKey: 'DesktopDialog',
    owner: '@dos/ui-system',
    category: 'core',
    allowedModules: ['*'],
    requiredInputs: ['open'],
    responsiveModes: ['tablet', 'desktop'],
    permissions: [],
    hooks: [],
    description: 'Desktop modal — overlay + focus trap + ESC-to-close + sized container. Pair with BottomSheet via responsive choice for mobile.',
  },
  {
    componentKey: 'SideDrawer',
    owner: '@dos/ui-system',
    category: 'core',
    allowedModules: ['*'],
    requiredInputs: ['open'],
    responsiveModes: ['tablet', 'desktop'],
    permissions: [],
    hooks: [],
    description: 'Side-edge sliding panel — overlay + focus trap + ESC + position left/right + sized container. Replaces PrimeNG <p-sidebar> and right-positioned <p-dialog> patterns.',
  },
  {
    componentKey: 'AiAssistantFab',
    owner: '@dos/ui-system',
    category: 'core',
    allowedModules: ['*'],
    requiredInputs: [],
    responsiveModes: ['mobile', 'tablet', 'desktop'],
    permissions: ['ai.read'],
    hooks: [{ kind: 'ai', id: 'ai.assistant.open' }],
    description: 'One-FAB rule: only the AI assistant FAB is allowed at the shell level.',
  },
  {
    componentKey: 'DataTable',
    owner: '@dos/ui-system',
    category: 'core',
    allowedModules: ['*'],
    requiredInputs: ['columns', 'rows'],
    responsiveModes: ['tablet', 'desktop'],
    permissions: [],
    hooks: [{ kind: 'export', id: 'export.list' }],
    description: 'Canonical list grid; mobile renders compact cards via Dynamic UI fallback.',
  },
  {
    componentKey: 'GraphCanvas',
    owner: '@dos/ui-system',
    category: 'core',
    allowedModules: ['*'],
    requiredInputs: ['nodes', 'edges'],
    responsiveModes: ['tablet', 'desktop'],
    permissions: [],
    hooks: [],
    description: 'Generic graph surface used as the base for domain graph widgets.',
  },
  {
    componentKey: 'AIWorkbenchPanel',
    owner: '@dos/ui-system',
    category: 'core',
    allowedModules: ['*'],
    requiredInputs: [],
    responsiveModes: ['tablet', 'desktop'],
    permissions: ['ai.read'],
    hooks: [{ kind: 'ai', id: 'ai.workbench.open' }],
    description: 'Right-side AI workbench dock.',
  },

  // ---- layout --------------------------------------------------------------
  {
    componentKey: 'AppShell',
    owner: '@dos/ui-system',
    category: 'layout',
    allowedModules: ['*'],
    requiredInputs: [],
    responsiveModes: ['mobile', 'tablet', 'desktop'],
    permissions: [],
    hooks: [],
    description: 'Root product chrome; resolves mobile vs desktop shell sub-layouts.',
  },

  // ---- domain (module-owned, governed) ------------------------------------
  {
    componentKey: 'Foundation.OrganizationGraph',
    owner: 'platform/foundation',
    category: 'domain',
    allowedModules: ['foundation'],
    requiredInputs: ['orgRoot'],
    responsiveModes: ['tablet', 'desktop'],
    permissions: ['foundation.read', 'foundation.org.read'],
    hooks: [{ kind: 'workflow', id: 'foundation.org.transition' }],
    description: 'Org tree graph; consumes GraphCanvas + UI OS tokens.',
  },
  {
    componentKey: 'Foundation.OwnershipMappingCanvas',
    owner: 'platform/foundation',
    category: 'domain',
    allowedModules: ['foundation'],
    requiredInputs: ['nodes'],
    responsiveModes: ['tablet', 'desktop'],
    permissions: ['foundation.read'],
    hooks: [],
    description: 'Ownership mapping canvas; domain-only, never duplicated as UI OS primitive.',
  },
  {
    componentKey: 'Foundation.AccessReviewBoard',
    owner: 'platform/foundation',
    category: 'domain',
    allowedModules: ['foundation'],
    requiredInputs: ['reviewCycleId'],
    responsiveModes: ['mobile', 'tablet', 'desktop'],
    permissions: ['foundation.read', 'foundation.user.read'],
    hooks: [{ kind: 'workflow', id: 'foundation.access_review.decision' }],
    description: 'Access review board; uses MetricCard + DataTable + StatusBanner from UI OS.',
  },
  {
    componentKey: 'Foundation.PositionAuthorityMatrix',
    owner: 'platform/foundation',
    category: 'domain',
    allowedModules: ['foundation'],
    requiredInputs: ['matrix'],
    responsiveModes: ['tablet', 'desktop'],
    permissions: ['foundation.read'],
    hooks: [],
    description: 'Authority matrix; composes DataTable + tokens.',
  },
  {
    componentKey: 'Foundation.LifecycleTimeline',
    owner: 'platform/foundation',
    category: 'domain',
    allowedModules: ['foundation'],
    requiredInputs: ['userId'],
    responsiveModes: ['mobile', 'tablet', 'desktop'],
    permissions: ['foundation.read'],
    hooks: [{ kind: 'workflow', id: 'foundation.lifecycle.transition' }],
    description: 'Per-employee lifecycle history (state header + workflow tasks + transition log). Domain widget; chrome adopts UI-OS status/empty/loading slots.',
  },
  {
    componentKey: 'Risk.RiskHeatmap',
    owner: 'modules/risk',
    category: 'domain',
    allowedModules: ['risk'],
    requiredInputs: ['cells'],
    responsiveModes: ['tablet', 'desktop'],
    permissions: ['risk.read'],
    hooks: [],
    description: 'Risk heatmap; domain widget, must register before render.',
  },
  {
    componentKey: 'Risk.BowtieDiagram',
    owner: 'modules/risk',
    category: 'domain',
    allowedModules: ['risk'],
    requiredInputs: ['risk'],
    responsiveModes: ['tablet', 'desktop'],
    permissions: ['risk.read'],
    hooks: [],
    description: 'Bowtie diagram; domain widget on top of GraphCanvas.',
  },
  {
    componentKey: 'Compliance.ControlMatrix',
    owner: 'modules/compliance',
    category: 'domain',
    allowedModules: ['compliance'],
    requiredInputs: ['matrix'],
    responsiveModes: ['tablet', 'desktop'],
    permissions: ['compliance.read'],
    hooks: [{ kind: 'export', id: 'export.list' }],
    description: 'Control matrix grid; composes DataTable + StatusBanner.',
  },
  {
    componentKey: 'Workflow.WorkflowCanvas',
    owner: 'modules/workflow',
    category: 'domain',
    allowedModules: ['workflow'],
    requiredInputs: ['definition'],
    responsiveModes: ['tablet', 'desktop'],
    permissions: ['workflow.read'],
    hooks: [{ kind: 'workflow', id: 'workflow.transition' }],
    description: 'Workflow modeling canvas; domain widget over GraphCanvas.',
  },
  {
    componentKey: 'Evidence.EvidenceViewer',
    owner: 'modules/evidence',
    category: 'domain',
    allowedModules: ['evidence', 'compliance', 'audit'],
    requiredInputs: ['evidenceId'],
    responsiveModes: ['mobile', 'tablet', 'desktop'],
    permissions: ['evidence.read'],
    hooks: [],
    description: 'Evidence viewer; domain widget for evidence/compliance/audit.',
  },
  {
    componentKey: 'Agent.SquadTimeline',
    owner: 'platform/ai',
    category: 'domain',
    allowedModules: ['*'],
    requiredInputs: ['squadId'],
    responsiveModes: ['tablet', 'desktop'],
    permissions: ['ai.read'],
    hooks: [{ kind: 'agent', id: 'agent.squad.tail' }, { kind: 'realtime', id: 'sse.agent.events' }],
    description: 'Agent squad timeline; subscribes to realtime + agent hooks via Dynamic UI.',
  },

  // ---- Wave C additions: domain heatmaps surfaced by the census but not -----
  // ---- previously registered. Owners stay module-side; entries declare ------
  // ---- responsive contract so the Dynamic UI runtime can dispatch them. -----
  {
    componentKey: 'Audit.FindingsHeatmap',
    owner: 'modules/audit',
    category: 'domain',
    allowedModules: ['audit', 'compliance'],
    requiredInputs: ['findings'],
    responsiveModes: ['tablet', 'desktop'],
    permissions: ['audit.read'],
    hooks: [{ kind: 'export', id: 'export.list' }],
    description: 'Audit findings heatmap; ECharts-backed domain widget. Mobile fallback handled by Dynamic UI (cards via DataTable mobile mode).',
  },
  {
    componentKey: 'Analytics.RegulatorHeatmap',
    owner: 'modules/analytics',
    category: 'domain',
    allowedModules: ['analytics', 'compliance'],
    requiredInputs: ['cells'],
    responsiveModes: ['tablet', 'desktop'],
    permissions: ['analytics.read'],
    hooks: [{ kind: 'export', id: 'export.list' }],
    description: 'Regulator-by-domain heatmap; domain widget over the canonical heatmap renderer (ECharts in current implementation).',
  },
  {
    componentKey: 'Analytics.ConfidenceHeatmap',
    owner: 'modules/analytics',
    category: 'domain',
    allowedModules: ['analytics'],
    requiredInputs: ['cells'],
    responsiveModes: ['tablet', 'desktop'],
    permissions: ['analytics.read'],
    hooks: [],
    description: 'Confidence/quality status heatmap surfaced from status-indicators. Domain widget; consider merging with Compliance.ControlMatrix if it ever surfaces only there.',
  },
  {
    componentKey: 'Qiyas.MaturityHeatmap',
    owner: 'modules/qiyas',
    category: 'domain',
    allowedModules: ['qiyas'],
    requiredInputs: ['cells'],
    responsiveModes: ['tablet', 'desktop'],
    permissions: ['qiyas.read'],
    hooks: [],
    description: 'Qiyas maturity heatmap; domain widget. Mobile renders summary list via Dynamic UI fallback.',
  },
]);

const REGISTRY_INDEX: Map<string, UiCapabilityEntry> = new Map(
  UI_CAPABILITY_REGISTRY.map(e => [e.componentKey, e]),
);

export function getUiCapability(componentKey: string): UiCapabilityEntry | undefined {
  return REGISTRY_INDEX.get(componentKey);
}

export function isRegisteredComponentKey(componentKey: string): boolean {
  return REGISTRY_INDEX.has(componentKey);
}

/**
 * Combined allowlist gate: a key is renderable iff it appears in either
 * `APPROVED_COMPONENT_KEYS` (legacy core allowlist) or in this capability
 * registry (which strictly supersedes the legacy list and adds domain entries).
 */
export function isAllowedComponentKey(componentKey: string): boolean {
  if (REGISTRY_INDEX.has(componentKey)) return true;
  return (APPROVED_COMPONENT_KEYS as readonly string[]).includes(componentKey as ApprovedComponentKey);
}

export function listDomainCapabilities(): UiCapabilityEntry[] {
  return UI_CAPABILITY_REGISTRY.filter(e => e.category === 'domain');
}

export function listCoreCapabilities(): UiCapabilityEntry[] {
  return UI_CAPABILITY_REGISTRY.filter(e => e.category === 'core' || e.category === 'layout');
}
