/**
 * Workspace Resolver Contract — F.3
 *
 * Strongly-typed shape returned by the platform Dynamic UI resolver when
 * a product asks "what should /workspace-home (or /tenant-settings, or
 * any other surface) render right now, for THIS user, in THIS tenant,
 * at THIS locale?"
 *
 * Every string the user sees is pre-resolved by the resolver — products
 * never look up i18n keys themselves, never compute setup-step "done"
 * states, never decide which AI tip to render. They consume the
 * payload and dispatch to <dos-widget-frame>.
 *
 * Keep this file dependency-free (pure types). Backend implementations
 * (dynamic-ui-service) and frontend consumers (Shahin SPA, Foundation
 * pages) both import from here so the wire shape never drifts.
 */

// ────────────────────────────────────────────────────────────────────
// Primitives
// ────────────────────────────────────────────────────────────────────

export type DosUiVariant   = 'solid' | 'glass' | 'gradient' | 'aurora' | 'minimal';
export type DosUiTone      = 'neutral' | 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
export type DosUiDensity   = 'compact' | 'cozy' | 'comfortable';
export type DosUiEngine    = 'carbon' | 'dos-premium';
export type DosUiMotion    = 'calm' | 'confident' | 'cinematic';
export type DosLocale      = string;            // BCP-47, e.g. 'en' | 'ar' | 'ar-SA'

/**
 * A pre-resolved string. The resolver has already looked the i18n key
 * up against (user override → tenant override → platform default).
 * The `key` is included for diagnostics and re-resolution if locale
 * changes mid-session. `bidi` carries optional FSI/PDI markers when
 * the value embeds opposite-direction runs (e.g. an Arabic sentence
 * embedding a Latin tenant name).
 */
export interface ResolvedString {
  key:    string;
  value:  string;
  bidi?:  'isolate' | 'embed' | 'override' | 'plain';
  locale: DosLocale;
}

// ────────────────────────────────────────────────────────────────────
// Page header (hero)
// ────────────────────────────────────────────────────────────────────

export interface ResolvedPageHeader {
  routeKey:        string;
  variant:         'signature' | 'gradient' | 'solid' | 'minimal';
  density:         DosUiDensity;
  eyebrow?:        ResolvedString;
  title:           ResolvedString;
  subtitle?:       ResolvedString;
  gradientToken:   string;            // CSS var, e.g. '--dos-gradient-brand-soft'
  meshLayers:      string[];          // CSS var names
  hairlineVisible: boolean;
  hairlineToken:   string;
}

// ────────────────────────────────────────────────────────────────────
// Status pill (driven by entity_status_labels)
// ────────────────────────────────────────────────────────────────────

export interface ResolvedStatusPill {
  entityType: string;
  statusCode: string;
  label:      ResolvedString;
  tone:       DosUiTone;
  icon?:      string;
}

// ────────────────────────────────────────────────────────────────────
// KPI tile
// ────────────────────────────────────────────────────────────────────

export interface ResolvedKpi {
  kpiKey:   string;
  label:    ResolvedString;
  value:    string | number;
  meta?:    ResolvedString;
  status?:  ResolvedStatusPill;
  variant:  DosUiVariant;
  tone:     DosUiTone;
  isSignature: boolean;
  hairlineToken?: string;
  /** §15.1 — Why am I seeing this metric (data scope/permission rationale). */
  whyVisible?: ResolvedString;
}

// ────────────────────────────────────────────────────────────────────
// Setup step
// ────────────────────────────────────────────────────────────────────

export interface ResolvedSetupStep {
  stepKey:     string;
  label:       ResolvedString;
  description?: ResolvedString;
  icon?:       string;
  route:       string;
  done:        boolean;             // resolver evaluates condition_kind
  permitted:   boolean;             // user has required_permission
  sortOrder:   number;
}

// ────────────────────────────────────────────────────────────────────
// Empty / error / loading state
// ────────────────────────────────────────────────────────────────────

export interface ResolvedStateContent {
  stateKey:        string;
  title:           ResolvedString;
  description?:    ResolvedString;
  tone:            DosUiTone;
  illustration?:   string;
  primaryLabel?:   ResolvedString;
  primaryRoute?:   string;
  secondaryLabel?: ResolvedString;
  secondaryRoute?: string;
}

// ────────────────────────────────────────────────────────────────────
// AI tip
// ────────────────────────────────────────────────────────────────────

/**
 * §19.1 AI Trust Layer — every AI output must show:
 *   source · confidence · reasoning summary · data used · last updated ·
 *   permission scope · risk level · human approval required.
 *
 * Components rendering AI output (tips, recommendations, copilot replies)
 * MUST surface this block. Missing fields = §21 #21 fail.
 */
export interface AiTrustLayer {
  source:           string;             // 'foundation-org-agent' | 'platform.suggestions' | …
  confidence:       number;             // 0–1
  reasoningSummary: ResolvedString;
  dataUsed:         string[];           // dataResource keys
  lastUpdated:      string;             // ISO timestamp
  permissionScope?: string;
  riskLevel:        'low' | 'medium' | 'high' | 'critical';
  humanApprovalRequired: boolean;
}

export interface ResolvedAiTip {
  tipKey:    string;
  title:     ResolvedString;
  body:      ResolvedString;
  ctaLabel?: ResolvedString;
  ctaRoute?: string;
  icon?:     string;
  priority:  number;
  trust:     AiTrustLayer;             // §19.1 — required
  whyVisible?: ResolvedString;         // §15.1 — "Why am I seeing this?"
}

// ────────────────────────────────────────────────────────────────────
// Quick action
// ────────────────────────────────────────────────────────────────────

export interface ResolvedQuickAction {
  actionKey:   string;
  eyebrow?:    ResolvedString;
  label:       ResolvedString;
  description?: ResolvedString;
  icon?:       string;
  route:       string;
  variant:     DosUiVariant;
  tone:        DosUiTone;
  permitted:   boolean;
  sortOrder:   number;
}

// ────────────────────────────────────────────────────────────────────
// Trial banner
// ────────────────────────────────────────────────────────────────────

export interface ResolvedTrialBanner {
  visible:        boolean;
  severity:       'info' | 'warning' | 'danger';
  title:          ResolvedString;
  message:        ResolvedString;
  ctaLabel?:      ResolvedString;
  ctaRoute?:      string;
  dismissible:    boolean;
  daysRemaining?: number;
}

// ────────────────────────────────────────────────────────────────────
// Health probe (admin-only)
// ────────────────────────────────────────────────────────────────────

export type HealthProbeState = 'ok' | 'degraded' | 'down' | 'unknown';

export interface ResolvedHealthProbe {
  probeKey:    string;
  label:       ResolvedString;
  description?: ResolvedString;
  state:       HealthProbeState;
  stateLabel:  ResolvedString;       // pre-resolved to the right locale
  tone:        DosUiTone;
  sortOrder:   number;
}

// ────────────────────────────────────────────────────────────────────
// Widget slot (extends ResolvedWidgetSlot in dynamic-widget.resolver
// with the new variant/tone/density/engine/cols dispatch columns)
// ────────────────────────────────────────────────────────────────────

export interface ResolvedWidgetFrame {
  widgetKey:    string;
  zone:         'signature' | 'main' | 'side' | 'header' | 'footer' | 'context-rail';
  order:        number;
  isSignature:  boolean;
  variant:      DosUiVariant;
  tone:         DosUiTone;
  density:      DosUiDensity;
  motionProfile: DosUiMotion;
  engine:       DosUiEngine;
  accentToken?: string;
  colsSm:       number;
  colsMd:       number;
  colsLg:       number;
  minWidthPx:   number;
  eyebrow?:     ResolvedString;
  title?:       ResolvedString;
  subtitle?:    ResolvedString;
  meta?:        ResolvedString;
  emptyState?:  ResolvedStateContent;
  errorState?:  ResolvedStateContent;
  config?:      Record<string, unknown>;
}

// ────────────────────────────────────────────────────────────────────
// Module row (for the /workspace-home module-launcher table)
// ────────────────────────────────────────────────────────────────────

export interface ResolvedModuleRow {
  moduleCode:   string;
  title:        ResolvedString;
  description:  ResolvedString;
  status:       ResolvedStatusPill;
  route:        string;
  iconGlyph:    string;            // 1-letter initial fallback when no icon
}

// ────────────────────────────────────────────────────────────────────
// Grid column (for any DB-driven table on the workspace)
// ────────────────────────────────────────────────────────────────────

export interface ResolvedGridColumn {
  colKey:        string;
  label:         ResolvedString;
  dataField:     string;
  dataKind:      'text' | 'number' | 'date' | 'status_pill' | 'badge' | 'link' | 'icon' | 'code' | 'custom';
  formatPayload: Record<string, unknown>;
  isSortable:    boolean;
  isFilterable:  boolean;
  defaultSort?:  'asc' | 'desc';
  sortPriority?: number;
  widthHint?:    string;
  align:         'start' | 'center' | 'end';
  isVisible:     boolean;
  sortOrder:     number;
}

// ────────────────────────────────────────────────────────────────────
// Sidebar nav (extends existing nav contract with status badge)
// ────────────────────────────────────────────────────────────────────

export interface ResolvedNavItem {
  id:               string;
  parentId?:        string;
  label:            ResolvedString;
  route:            string;
  icon?:            string;
  sortOrder:        number;
  group:            'primary' | 'secondary' | 'tertiary';
  permitted:        boolean;
  disabledReason?:  'missing-permission' | 'not-entitled' | 'trial-expired' | 'feature-flagged' | 'health-down';
  statusKind?:      'trial' | 'expired' | 'new' | 'beta' | 'locked' | 'external';
  statusLabel?:     ResolvedString;
  statusTone?:      DosUiTone;
}

// ────────────────────────────────────────────────────────────────────
// Resolved Route Contract — the §3.2 / §10 / §21 spec contract pulled
// from the module's ui.contract.json and surfaced on every page payload
// so the runtime can assert gate fields at render and so the
// Page Quality Gate validator script can grep for them in the DOM.
// ────────────────────────────────────────────────────────────────────

export type DosPageType   = 'overview' | 'list' | 'object' | 'workflow' | 'analytics' | 'audit' | 'settings' | 'report' | 'builder';
export type DosLayoutKind = 'dashboard' | 'full-page' | 'split-view' | 'object-page' | 'wizard' | 'report' | 'canvas';
export type DosKpiScope   = 'module-overview' | 'page-local' | 'none';

export interface ResolvedRouteContract {
  route:            string;            // e.g. '/workspace-home'
  moduleCode:       string;            // owning module (e.g. 'foundation')
  pageType:         DosPageType;
  layout:           DosLayoutKind;
  kpiScope:         DosKpiScope;
  userIntent?:      'monitor' | 'manage' | 'review' | 'approve' | 'investigate' | 'configure' | 'report';
  titleKey:         string;
  subtitleKey?:     string;
  signatureWidget?: string;
  dataResourceKey?: string;
  emptyStateKey?:   string;
  errorStateKey?:   string;
  helpKey?:         string;
  auditEnabled?:    boolean;
  realtimeEnabled?: boolean;
  workflowEnabled?: boolean;
  agentEnabled?:    boolean;
  visibleWhenProfile?: string[];
  visibleWhenPerm?:    string[];
  agentExperienceMode?: 'none' | 'side-panel' | 'inline' | 'modal';
  primaryAgentId?:  string;
}

// ────────────────────────────────────────────────────────────────────
// Composed workspace surface (the /workspace-home payload)
// ────────────────────────────────────────────────────────────────────

/**
 * §3.2 — Page-experience action arrays. The page renders ONLY the
 * actions returned here; components must not embed role conditionals.
 */
export interface ResolvedPageAction {
  actionKey:   string;
  label:       ResolvedString;
  kind:        'primary' | 'secondary' | 'danger' | 'link';
  icon?:       string;
  route?:      string;
  intent?:     'navigate' | 'open-modal' | 'workflow' | 'export' | 'agent';
  permission?: string;
  riskLevel:   'low' | 'medium' | 'high' | 'critical';
  requiresApproval: boolean;
  workflowCode?: string;
  whyHidden?:  ResolvedString;        // §15.1
}

/**
 * §31 — moduleStyleTokens published per surface.
 */
export interface ResolvedModuleStyleTokens {
  moduleCode:     string;
  accent:         string;
  accentSecondary?: string;
  icon:           string;
  mood:           string;
  pageDensity:    DosUiDensity;
  surfaceStyle:   'standard' | 'operational' | 'intelligence' | 'assurance' | 'security';
  signatureWidgets: string[];
  agentTone:      'governance' | 'risk' | 'assurance' | 'operations' | 'security' | 'executive';
  defaultPageLayout: 'command-center' | 'full-page' | 'split-view' | 'canvas' | 'object-360';
  mobileVariant:  'card-list' | 'bottom-sheet' | 'stepper' | 'map-first' | 'timeline-first';
}

/**
 * §13 — realtime channel declaration. Each route advertises the SSE
 * channels it will subscribe to so the runtime can boot the client.
 */
export interface ResolvedRealtimeChannel {
  channel:    string;             // e.g. 'workspace.approvals'
  topic:      string;             // dotted topic used by the bus
  permission?: string;
}

export interface ResolvedWorkspaceSurface {
  routeContract:  ResolvedRouteContract;
  routeKey:       string;
  locale:         DosLocale;
  direction:      'ltr' | 'rtl';
  density:        DosUiDensity;

  /** §31 module personality tokens. */
  moduleStyleTokens: ResolvedModuleStyleTokens;

  /** §3.5 #4-#5 — auditor profile renders read-only; manager scope-locked. */
  readonly:       boolean;
  profile:        string;
  scopeMode:      'tenant' | 'org_scope' | 'department_scope' | 'self' | 'global';

  /** §13 / §21 #25 — declared realtime channels (may be empty). */
  realtimeChannels: ResolvedRealtimeChannel[];

  /** §3.2 — primary + secondary actions (resolved from contract+permissions). */
  primaryActions:   ResolvedPageAction[];
  secondaryActions: ResolvedPageAction[];

  pageHeader:     ResolvedPageHeader;
  trialBanner:    ResolvedTrialBanner;
  kpis:           ResolvedKpi[];
  setupSteps:     ResolvedSetupStep[];
  setupPercent:   number;
  aiTips:         ResolvedAiTip[];
  quickActions:   ResolvedQuickAction[];
  healthProbes:   ResolvedHealthProbe[];
  modules:        ResolvedModuleRow[];
  moduleColumns:  ResolvedGridColumn[];
  widgets:        ResolvedWidgetFrame[];
  emptyStates:    Record<string, ResolvedStateContent>;

  /** §15.1 — page-level "Why am I seeing this?" rationale. */
  whyVisible:     ResolvedString;

  resolvedAt:     string;          // ISO timestamp
  cacheTtlSec:    number;
}

// ────────────────────────────────────────────────────────────────────
// Composed tenant-settings surface
// ────────────────────────────────────────────────────────────────────

export interface ResolvedTenantSettingsSection {
  sectionKey:    string;
  eyebrow:       ResolvedString;     // 'PLACEHOLDER' | 'COMING SOON' | 'LIVE'
  title:         ResolvedString;
  description:   ResolvedString;
  icon?:         string;
  tone:          DosUiTone;
  status:        'placeholder' | 'coming_soon' | 'live' | 'locked';
  route?:        string;
  permitted:     boolean;
  sortOrder:     number;
}

export interface ResolvedTenantSettingsSurface {
  routeKey:        string;
  locale:          DosLocale;
  direction:       'ltr' | 'rtl';
  density:         DosUiDensity;
  pageHeader:      ResolvedPageHeader;
  serviceStatus:   ResolvedStateContent;
  sections:        ResolvedTenantSettingsSection[];
  resolvedAt:      string;
  cacheTtlSec:     number;
}

// ────────────────────────────────────────────────────────────────────
// Resolver port — the contract the FE consumes
// ────────────────────────────────────────────────────────────────────

export interface DynamicUiResolverPort {
  resolveWorkspace(): Promise<ResolvedWorkspaceSurface>;
  resolveTenantSettings(): Promise<ResolvedTenantSettingsSurface>;
  resolveSidebarNav(): Promise<ResolvedNavItem[]>;
  resolveString(key: string): Promise<ResolvedString>;
}
