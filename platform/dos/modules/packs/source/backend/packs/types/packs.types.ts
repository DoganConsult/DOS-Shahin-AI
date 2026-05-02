/**
 * Packs -- Core Domain Types
 *
 * Canonical type definitions for the packs module.
 * Pack lifecycle states, installation states, and event payload types.
 *
 * @owner DOS
 * @module packs
 */

// ── Pack Lifecycle States ──────────────────────────────────────────
export const PACK_LIFECYCLE_STATES = [
  'available',
  'installing',
  'installed',
  'updating',
  'uninstalling',
  'uninstalled',
  'archived',
] as const;

export type PackLifecycleState = (typeof PACK_LIFECYCLE_STATES)[number];

// ── Pack Installation States ───────────────────────────────────────
export const PACK_INSTALLATION_STATUSES = [
  'pending',
  'installing',
  'installed',
  'upgrading',
  'failed',
  'uninstalled',
  'rollback',
] as const;

export type PackInstallationStatus = (typeof PACK_INSTALLATION_STATUSES)[number];

// ── Terminal States ────────────────────────────────────────────────
export const TERMINAL_PACK_STATES: readonly PackLifecycleState[] = ['archived'];

export const ACTIVE_PACK_STATES: readonly PackLifecycleState[] = ['installed', 'updating'];

// ── Pack Categories ────────────────────────────────────────────────
export const PACK_CATEGORIES = [
  'base',
  'country',
  'sector',
  'regulator',
  'standard',
  'maturity',
  'module',
  'integration',
  'demo',
] as const;

export type PackCategory = (typeof PACK_CATEGORIES)[number];

// ── Event Payload ──────────────────────────────────────────────────
export interface PacksEventPayload {
  tenantId: string;
  entityType: 'pack' | 'installation' | 'policy' | 'catalog';
  entityId: string;
  moduleCode: 'packs';
  triggeredBy: string;
  timestamp: string;
  correlationId: string;
  eventVersion: number;
  previousState?: string;
  newState?: string;
  data: Record<string, unknown>;
}

// ── Pack Compatibility Result ──────────────────────────────────────
export interface PackCompatibilityResult {
  compatible: boolean;
  packCode: string;
  packVersion: string;
  missingDependencies: string[];
  conflictingPacks: string[];
  platformVersionOk: boolean;
  requiredModulesPresent: boolean;
  reason: string;
}

// ── Pack Health Check ──────────────────────────────────────────────
export interface PackHealthCheck {
  packCode: string;
  installed: boolean;
  version: string;
  latestVersion: string | null;
  isOutdated: boolean;
  hasMissingDeps: boolean;
  hasConflicts: boolean;
}

// ── Pack Dashboard Summary ─────────────────────────────────────────
export interface PackDashboardSummary {
  totalPacks: number;
  installedPacks: number;
  availablePacks: number;
  outdatedPacks: number;
  failedInstallations: number;
  lastInstallDate: string | null;
  categoryCounts: Record<string, number>;
}

// ── Pack Catalog Entry ─────────────────────────────────────────────
export interface PackCatalogEntry {
  packId: string;
  code: string;
  version: string;
  nameEn: string;
  nameAr: string | null;
  descriptionEn: string | null;
  descriptionAr: string | null;
  packType: PackCategory;
  dependsOn: string[];
  isActive: boolean;
  isSystem: boolean;
  installCount?: number;
}

// ── Pack Installation Record ───────────────────────────────────────
export interface PackInstallationRecord {
  installationId: string;
  tenantId: string;
  packCode: string;
  packVersion: string;
  status: PackInstallationStatus;
  installedBy: string;
  installedAt: string;
  updatedAt: string;
  installLog: unknown[];
}

// ── Pack Status Reason ─────────────────────────────────────────────
export type PackStatusReason =
  | 'initial_install'
  | 'tenant_tier_upgrade'
  | 'module_activation'
  | 'manual_install'
  | 'policy_driven'
  | 'dependency_requirement'
  | 'version_update'
  | 'manual_uninstall'
  | 'tier_downgrade'
  | 'conflict_detected'
  | 'system_cleanup';

// ── Pack Source ─────────────────────────────────────────────────────
export type PackSource = 'registry' | 'marketplace' | 'manual' | 'policy_engine' | 'provisioning';
