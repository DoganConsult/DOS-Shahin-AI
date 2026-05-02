// ============================================
// AGRC-OS — Component Registry
// Maps route paths to lazy-loaded components.
// Module-owned route fragments are merged from generated/platform manifests
// (see scripts/generate-route-fragments.mjs + platform-manifests/*.module.routes.ts).
// ============================================

import type { LazyComponent, ComponentRegistryEntry, ModuleRouteGroup } from './route-registry.types';
// Generated route fragments live in platform-tier (manifest §1.1 ownership rule).
// Auto-gen is currently disabled in product package.json (`prebuild` hook); the
// stubbed file ships as `unknown[]` until Phase F (DB-driven UI) replaces this
// generator entirely with `pnpm ui-registry:import` writing to `dos.ui_route_registry`.
import { GENERATED_MODULE_ROUTE_GROUPS, GENERATED_STANDALONE_ROUTES } from './generated/module-route-fragments.generated';
import { MODULE_SHELL_REGISTRY } from '@app/shared/contracts/module-shell-registry';

export type { LazyComponent, ComponentRegistryEntry, ModuleRouteGroup } from './route-registry.types';

// ── Module Hubs (routes with children) ──────────────────────────────────

export const MODULE_ROUTE_GROUPS: Record<string, ModuleRouteGroup> = {
  ...GENERATED_MODULE_ROUTE_GROUPS,
};

// All module hubs are now defined in platform-manifests/*.module.routes.ts
// and aggregated via GENERATED_MODULE_ROUTE_GROUPS.
// Run: npm run generate:route-fragments to regenerate.

// ── Standalone routes (flat, no children) ───────────────────────────────

export interface StandaloneRouteEntry extends ComponentRegistryEntry {
  requiredPermission?: string;
  moduleCode?: string;
  agentId?: string;
  agentName?: string;
  adminOnly?: boolean;
}

// ── Redirect map (old paths → new canonical) ────────────────────────────

export const REDIRECT_MAP: Record<string, string> = {
  'risks': 'risk/register',
  'risk-workspace': 'risk/home',
  'frameworks': 'compliance/frameworks',
  'controls': 'compliance/controls',
  'compliance-legacy': 'compliance',
  'reports-hub': 'reports/overview',
  'audit-hub': 'audit/overview',
  'risk-hub': 'risk/home',
  'evidence-hub': 'evidence/overview',
  'compliance-hub': 'compliance',
  'governance-hub': 'governance',
  'governance-os': 'governance',
  'vendors': 'vendor-risk',
  'team-hub': 'foundation/teams',
  'team-management': 'foundation/teams',
  'team-command-center': 'foundation/teams',
  'administration': 'foundation/users',
  'rbac-admin': 'foundation/roles',
  'framework-mapping': 'compliance/mappings',
  'evidence-catalog': 'evidence/catalog',
  'evidence-tasks': 'evidence/tasks',
  'risk-scoring': 'risk/scoring',
  'risk-metrics': 'risk/metrics',
  'report-builder': 'reports/builder',
  'report-center': 'reports/exports',
  'report-generator': 'reports/exports',
  'report-ext': 'reports/exports',
  'report-scenarios': 'reports/exports',
  'sample-reports': 'reports/executive',
  'report-hub': 'reports/executive',
  'board-report': 'reports/executive',
  'control-posture': 'compliance/posture',
  'compliance-savings': 'compliance/savings',
  'sox-compliance': 'compliance/sox',
  'esg': 'compliance/esg',
  'training-awareness': 'training',
  'workspace-lifecycle': 'journey',
  'global-search': 'workspace-home',
};

// ── Route metadata for guards (used by dynamic route builder) ───────────

export interface RouteMetadata {
  moduleCode: string;
  requiredPermission?: string;
  agentId?: string;
  agentName?: string;
  /** When true, the route is eagerly preloaded by SelectivePreloadStrategy */
  preload?: boolean;
}

/** Hub path → moduleCode overrides (when hub key !== moduleCode). */
const HUB_TO_MODULE: Record<string, string> = {
  'ai-governance': 'ai-governance',
  'incidents': 'incident',
  'reports': 'reporting',
  'vendor-risk': 'vendor',
  'journey': 'workspace',
  'agrc-dashboard': 'workspace',
  'dora': 'bcp',
};

/**
 * TODO(Law4): These permission overrides should be sourced from the backend
 * module manifest (moduleManifest.requiredPermission) instead of hardcoded here.
 * Wire to backend manifest endpoint once module-manifest API exposes per-hub
 * permission requirements. Until then, these are rendering hints only — actual
 * access enforcement happens server-side.
 * @see AGENTS.md Patch 0 §4 Law 4 — No frontend-invented truth
 */
const PERMISSION_OVERRIDES: Record<string, string> = {
  'qiyas': 'qiyas.assessment.read',
  'ai-governance': 'ai.agent.read',
  'compliance': 'framework.record.read',
  'reports': 'report.document.read',
  'dora': 'bcp.plan.read',
  'journey': 'analytics.report.read',
  'agrc-dashboard': 'analytics.report.read',
  'controls': 'control.record.read',
};

const AGENT_MAP: Record<string, { agentId: string; agentName: string }> = {
  'risk': { agentId: 'A07', agentName: 'Risk Agent' },
  'governance': { agentId: 'A08', agentName: 'Governance Agent' },
  'audit': { agentId: 'A10', agentName: 'Audit Reporting Agent' },
  'reports': { agentId: 'A10', agentName: 'Audit Reporting Agent' },
  'foundation': { agentId: 'A02', agentName: 'Identity Provisioning Agent' },
};

const HUB_PRELOAD: Record<string, boolean> = { 'compliance': true };

function buildModuleRouteMetadata(): Record<string, RouteMetadata> {
  const meta: Record<string, RouteMetadata> = {};
  const registryModuleCodes = new Set(Object.values(MODULE_SHELL_REGISTRY).map(d => d.moduleCode));

  for (const hubKey of Object.keys(GENERATED_MODULE_ROUTE_GROUPS)) {
    const moduleCode = HUB_TO_MODULE[hubKey] ?? hubKey;
    const resolvedCode = registryModuleCodes.has(moduleCode) ? moduleCode : hubKey;
    const perm = PERMISSION_OVERRIDES[hubKey] ?? `${resolvedCode}:read`;
    const entry: RouteMetadata = { moduleCode: resolvedCode, requiredPermission: perm };
    const agent = AGENT_MAP[hubKey];
    if (agent) { entry.agentId = agent.agentId; entry.agentName = agent.agentName; }
    if (HUB_PRELOAD[hubKey]) { entry.preload = true; }
    meta[hubKey] = entry;
  }
  return meta;
}

export const MODULE_ROUTE_METADATA: Record<string, RouteMetadata> = buildModuleRouteMetadata();
export const STANDALONE_ROUTES: Record<string, StandaloneRouteEntry> = {
  ...GENERATED_STANDALONE_ROUTES,
  // 'workspace-home' loader removed in A1 (workspace evolution waves):
  // the referenced 'modules/workspace-home/workspace-home.component'
  // path never existed at this depth (../../../../../../../modules/...
  // resolves outside the repo). Workspace home is owned by Shahin SPA
  // and will be onboarded to DynamicPageHostComponent in A7/A8.
  'dashboard': { redirectTo: 'workspace-home', pathMatch: 'full' },
};
