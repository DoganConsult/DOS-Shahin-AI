/**
 * UPOR Types — Unified Platform Object Registry
 * Dr-Dogan-AGRC-OS / Shahin-AI GRC Platform
 *
 * Shared TypeScript types for the registry service, routes, and tests.
 */

// ── Catalog status (hard blocks) ─────────────────────────────────────────────
export type PlatformObjectStatus = 'draft' | 'active' | 'beta' | 'disabled' | 'deprecated' | 'retired';

/** Statuses that can never be surfaced in effective output, even with a tenant override */
export const HARD_BLOCK_STATUSES: Set<PlatformObjectStatus> = new Set(['deprecated', 'retired', 'draft']);

/** Statuses eligible for the effective resolver */
export const ELIGIBLE_STATUSES: Set<PlatformObjectStatus> = new Set(['active', 'beta']);

export type LoaderStrategy = 'lazy' | 'eager' | 'remote';
export type DefaultEnableMode = 'on' | 'off';
export type ModuleActivationSource = 'component_overrides' | 'module_workflow_registry';
export type AuditChangeType = 'ENABLED' | 'DISABLED' | 'REORDERED' | 'CONFIG_CHANGED' | 'LABEL_CHANGED' | 'VERSION_BUMPED' | 'DEPRECATED';

// ── Platform Object (from master.platform_objects) ───────────────────────────
export interface PlatformObject {
  uuid: string;
  id: string;
  code: string;
  name: string;
  type: string;
  kind: string;
  layer: string;
  ownerType: string;
  ownerCode: string;
  status: PlatformObjectStatus;
  version: string;
  registryVersion: number;
  description: string;
  scope: string;
  sourceOfTruth: string;
  specRef: string | null;
  dependsOn: string[];
  usedBy: string[];
  permissions: string[];
  featureFlags: string[];
  tags: string[];
  auditEnabled: boolean;
  telemetryEnabled: boolean;
  telemetryKey: string | null;
  introducedInBuild: string | null;
  retiredInBuild: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ── Component Catalog  row (from master.component_catalog) ───────────────────
export interface ComponentCatalogRow {
  objectUuid: string;
  csn: string;
  componentKey: string;
  selector: string | null;
  routePath: string | null;
  parentObjectUuid: string | null;
  sortOrder: number;
  isRuntimeEnabled: boolean;
  isTenantOverridable: boolean;
  capabilities: Record<string, unknown>;
  uiMetadata: Record<string, unknown>;
  configSchemaRef: string | null;
  contractRef: string | null;
  loaderStrategy: LoaderStrategy;
  allowlistGroup: string | null;
  i18nKey: string | null;
  testId: string | null;
  defaultEnableMode: DefaultEnableMode;
  compatibilityRules: Record<string, unknown>;
  rolloutGroup: string | null;
  moduleActivationSource: ModuleActivationSource;
  createdAt: string;
  updatedAt: string;
}

// ── Tenant Override row (from {schema}.component_overrides) ──────────────────
export interface ComponentOverrideRow {
  uuid: string;
  tenantId: string;
  componentObjectUuid: string;
  isEnabled: boolean;
  sortOrder: number | null;
  configOverride: Record<string, unknown>;
  labelOverride: string | null;
  i18nKeyOverride: string | null;
  enabledAt: string | null;
  enabledBy: string | null;
  disabledAt: string | null;
  disabledBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Effective Component (resolver output) ────────────────────────────────────
/**
 * Result of the 7-gate resolver. This is what the frontend receives.
 * Merges catalog defaults with tenant override values.
 */
export interface EffectiveComponent {
  csn: string;
  objectId: string;               // dotted id from platform_objects
  componentKey: string;           // Angular COMPONENT_MAP key
  routePath: string | null;
  name: string;
  type: string;
  kind: string;
  layer: string;
  ownerCode: string;
  sortOrder: number;              // COALESCE(override.sort_order, catalog.sort_order)
  loaderStrategy: LoaderStrategy;
  allowlistGroup: string | null;
  i18nKey: string | null;
  testId: string | null;
  capabilities: Record<string, unknown>;
  uiMetadata: Record<string, unknown>;
  configOverride: Record<string, unknown>;
  labelOverride: string | null;
  moduleActivationSource: ModuleActivationSource;
  specRef: string | null;
  rolloutGroup: string | null;
  // resolver metadata (for observability/debug)
  _resolverGates: {
    catalogStatus: PlatformObjectStatus;
    runtimeEnabled: boolean;
    defaultEnableMode: DefaultEnableMode;
    moduleActive: boolean;
    tenantOverridePresent: boolean;
    tenantOverrideEnabled: boolean;
  };
}

// ── Dependency Graph ─────────────────────────────────────────────────────────
export interface DependencyResult {
  objectId: string;
  csn: string | null;
  upstream: PlatformObject[];   // objects this one depends on
  downstream: PlatformObject[]; // objects that depend on this one
}

// ── Audit write ──────────────────────────────────────────────────────────────
export interface AuditWriteInput {
  tenantId: string;
  componentObjectUuid: string;
  csn: string;
  changeType: AuditChangeType;
  changedBy: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  reason?: string;
}

// ── Search / filter ──────────────────────────────────────────────────────────
export interface CatalogSearchFilter {
  type?: string;
  layer?: string;
  ownerCode?: string;
  status?: PlatformObjectStatus;
  kind?: string;
  allowlistGroup?: string;
  moduleCode?: string;
  specRef?: string;
  tag?: string;
  rolloutGroup?: string;
  limit?: number;
  offset?: number;
}

// ── Mutation inputs ──────────────────────────────────────────────────────────
export interface EnableComponentInput {
  tenantId: string;
  csn: string;
  changedBy: string;
  reason?: string;
}

export interface DisableComponentInput {
  tenantId: string;
  csn: string;
  changedBy: string;
  reason?: string;
}

export interface SetConfigOverrideInput {
  tenantId: string;
  csn: string;
  config: Record<string, unknown>;
  changedBy: string;
  reason?: string;
}

export interface ReorderComponentInput {
  tenantId: string;
  csn: string;
  sortOrder: number;
  changedBy: string;
}

// ── Effective query input ─────────────────────────────────────────────────────
export interface GetEffectiveInput {
  tenantId: string;
  layer?: string;
  type?: string;
  activeModules?: string[];   // from module_workflow_registry — caller injects
}
