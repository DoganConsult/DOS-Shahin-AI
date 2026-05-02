/**
 * DAuth Frontend Access Contract Service
 *
 * Runtime service that serializes FullAccessSnapshot for frontend consumption.
 * Builds typed, versioned access contracts that the frontend uses for
 * navigation, permission gating, and incremental cache invalidation.
 *
 * Law 2: DAuth owns access contract serialization.
 * Law 4: Frontend may render or cache truth but not define it.
 * Law 9: Organized by concern (frontend-contracts/).
 */
import { createHash } from 'crypto';
import { getAccessSnapshot } from '../access/access-snapshot.service';
import type {
  FullAccessSnapshot,
} from '../contracts/access-snapshot.contract';
import type { AccessSnapshot } from '../contracts/access-snapshot.types';

/** Frontend-safe access contract with version tracking. */
export interface FrontendAccessContract {
  version: string;
  generatedAt: string;
  actor: {
    userId: string;
    email: string;
    displayName: string;
    actorType: string;
  };
  tenant: {
    tenantId: string;
    status: string;
    plan: string;
  };
  permissions: string[];
  roles: string[];
  modules: string[];
  dashboards: string[];
  landingPage: string;
  scopeBindings: Array<{ scopeType: string; scopeId: string; roleCode: string }>;
  decisionAuthorities: string[];
  accessProfiles: string[];
}

/** Minimal access contract — permissions and modules only. */
export interface MinimalAccessContract {
  version: string;
  generatedAt: string;
  userId: string;
  tenantId: string;
  permissions: string[];
  modules: string[];
}

/** Navigation-specific subset of the access contract. */
export interface NavigationContract {
  version: string;
  generatedAt: string;
  userId: string;
  tenantId: string;
  modules: string[];
  dashboards: string[];
  landingPage: string;
  roles: string[];
}

/** Permission-only subset for lightweight permission checks. */
export interface PermissionContract {
  version: string;
  generatedAt: string;
  userId: string;
  tenantId: string;
  permissions: string[];
  decisionAuthorities: string[];
}

/** Diff result between two access contracts. */
export interface AccessContractDiff {
  hasChanges: boolean;
  previousVersion: string;
  currentVersion: string;
  addedPermissions: string[];
  removedPermissions: string[];
  addedRoles: string[];
  removedRoles: string[];
  addedModules: string[];
  removedModules: string[];
  addedDashboards: string[];
  removedDashboards: string[];
  landingPageChanged: boolean;
}

/**
 * Compute a SHA-256 hash of the contract contents for cache invalidation.
 */
function computeContractHash(data: Record<string, any>): string {
  const serialized = JSON.stringify(data, Object.keys(data).sort());
  return createHash('sha256').update(serialized).digest('hex').slice(0, 16);
}

/**
 * Compute a diff between two string arrays, returning added and removed items.
 */
function diffArrays(previous: string[], current: string[]): { added: string[]; removed: string[] } {
  const prevSet = new Set(previous);
  const currSet = new Set(current);
  return {
    added: current.filter((item) => !prevSet.has(item)),
    removed: previous.filter((item) => !currSet.has(item)),
  };
}

/**
 * Convert a base AccessSnapshot to a FrontendAccessContract.
 */
function snapshotToContract(snapshot: AccessSnapshot, versionHash: string): FrontendAccessContract {
  return {
    version: versionHash,
    generatedAt: new Date().toISOString(),
    actor: {
      userId: snapshot.actor.userId,
      email: snapshot.actor.email,
      displayName: snapshot.actor.displayName,
      actorType: snapshot.actor.actorType,
    },
    tenant: {
      tenantId: snapshot.tenant.tenantId,
      status: snapshot.tenant.tenantStatus,
      plan: snapshot.tenant.plan,
    },
    permissions: [...snapshot.effectivePermissions],
    roles: [...snapshot.functionalRoles],
    modules: [...snapshot.allowedModules],
    dashboards: [...snapshot.allowedDashboards],
    landingPage: snapshot.landingHint.landingPage,
    scopeBindings: snapshot.scopeBindings.map((b) => ({
      scopeType: b.scopeType,
      scopeId: b.scopeId,
      roleCode: b.roleCode,
    })),
    decisionAuthorities: [...(snapshot.decisionAuthorities ?? [])],
    accessProfiles: [...(snapshot.accessProfiles ?? [])],
  };
}

/**
 * Build a full access contract for frontend consumption.
 * Fetches the access snapshot and serializes it into a versioned contract.
 */
export async function buildFrontendAccessContract(
  userId: string,
  tenantId: string,
): Promise<FrontendAccessContract> {
  const snapshot = await getAccessSnapshot(tenantId, userId);

  const hashData: Record<string, unknown> = {
    permissions: snapshot.effectivePermissions,
    roles: snapshot.functionalRoles,
    modules: snapshot.allowedModules,
    dashboards: snapshot.allowedDashboards,
    landingPage: snapshot.landingHint.landingPage,
  };
  const versionHash = computeContractHash(hashData);

  return snapshotToContract(snapshot, versionHash);
}

/**
 * Build a lightweight access contract containing only permissions and allowed modules.
 * Suitable for frequent polling or low-bandwidth scenarios.
 */
export async function getMinimalAccessContract(
  userId: string,
  tenantId: string,
): Promise<MinimalAccessContract> {
  const snapshot = await getAccessSnapshot(tenantId, userId);

  const hashData: Record<string, unknown> = {
    permissions: snapshot.effectivePermissions,
    modules: snapshot.allowedModules,
  };
  const versionHash = computeContractHash(hashData);

  return {
    version: versionHash,
    generatedAt: new Date().toISOString(),
    userId: snapshot.actor.userId,
    tenantId: snapshot.tenant.tenantId,
    permissions: [...snapshot.effectivePermissions],
    modules: [...snapshot.allowedModules],
  };
}

/**
 * Build a navigation-specific contract subset.
 * Contains modules, dashboards, landing page, and roles for sidebar/nav rendering.
 */
export async function getNavigationContract(
  userId: string,
  tenantId: string,
): Promise<NavigationContract> {
  const snapshot = await getAccessSnapshot(tenantId, userId);

  const hashData: Record<string, unknown> = {
    modules: snapshot.allowedModules,
    dashboards: snapshot.allowedDashboards,
    landingPage: snapshot.landingHint.landingPage,
    roles: snapshot.functionalRoles,
  };
  const versionHash = computeContractHash(hashData);

  return {
    version: versionHash,
    generatedAt: new Date().toISOString(),
    userId: snapshot.actor.userId,
    tenantId: snapshot.tenant.tenantId,
    modules: [...snapshot.allowedModules],
    dashboards: [...snapshot.allowedDashboards],
    landingPage: snapshot.landingHint.landingPage,
    roles: [...snapshot.functionalRoles],
  };
}

/**
 * Build a permission-only contract for lightweight authorization checks.
 * Contains effective permissions and decision authorities.
 */
export async function getPermissionContract(
  userId: string,
  tenantId: string,
): Promise<PermissionContract> {
  const snapshot = await getAccessSnapshot(tenantId, userId);

  const hashData: Record<string, unknown> = {
    permissions: snapshot.effectivePermissions,
    decisionAuthorities: snapshot.decisionAuthorities ?? [],
  };
  const versionHash = computeContractHash(hashData);

  return {
    version: versionHash,
    generatedAt: new Date().toISOString(),
    userId: snapshot.actor.userId,
    tenantId: snapshot.tenant.tenantId,
    permissions: [...snapshot.effectivePermissions],
    decisionAuthorities: [...(snapshot.decisionAuthorities ?? [])],
  };
}

/**
 * Serialize a FullAccessSnapshot into a frontend-safe JSON contract.
 * Strips internal audit metadata and normalizes field names.
 */
export function serializeAccessSnapshot(
  snapshot: FullAccessSnapshot,
): FrontendAccessContract {
  const hashData: Record<string, unknown> = {
    permissions: snapshot.effectivePermissions,
    roles: snapshot.functionalRoles,
    modules: snapshot.allowedModules,
    dashboards: snapshot.allowedDashboards,
    landingPage: snapshot.landingHint.landingPage,
  };
  const versionHash = computeContractHash(hashData);

  return {
    version: versionHash,
    generatedAt: new Date().toISOString(),
    actor: {
      userId: snapshot.actor.userId,
      email: snapshot.actor.email,
      displayName: snapshot.actor.displayName,
      actorType: snapshot.actor.actorType,
    },
    tenant: {
      tenantId: snapshot.tenant.tenantId,
      status: snapshot.tenant.tenantStatus,
      plan: snapshot.tenant.plan,
    },
    permissions: [...snapshot.effectivePermissions],
    roles: [...snapshot.functionalRoles],
    modules: [...snapshot.allowedModules],
    dashboards: [...snapshot.allowedDashboards],
    landingPage: snapshot.landingHint.landingPage,
    scopeBindings: snapshot.scopeBindings.map((b) => ({
      scopeType: b.scopeType,
      scopeId: b.scopeId,
      roleCode: b.roleCode,
    })),
    decisionAuthorities: [...snapshot.decisionAuthorities],
    accessProfiles: [...snapshot.accessProfiles],
  };
}

/**
 * Compute a diff between two frontend access contracts.
 * Returns added/removed items for permissions, roles, modules, and dashboards.
 * Useful for incremental frontend cache updates via WebSocket or polling.
 */
export function diffAccessContract(
  previous: FrontendAccessContract,
  current: FrontendAccessContract,
): AccessContractDiff {
  const permDiff = diffArrays(previous.permissions, current.permissions);
  const roleDiff = diffArrays(previous.roles, current.roles);
  const moduleDiff = diffArrays(previous.modules, current.modules);
  const dashDiff = diffArrays(previous.dashboards, current.dashboards);

  const hasChanges =
    previous.version !== current.version ||
    permDiff.added.length > 0 || permDiff.removed.length > 0 ||
    roleDiff.added.length > 0 || roleDiff.removed.length > 0 ||
    moduleDiff.added.length > 0 || moduleDiff.removed.length > 0 ||
    dashDiff.added.length > 0 || dashDiff.removed.length > 0 ||
    previous.landingPage !== current.landingPage;

  return {
    hasChanges,
    previousVersion: previous.version,
    currentVersion: current.version,
    addedPermissions: permDiff.added,
    removedPermissions: permDiff.removed,
    addedRoles: roleDiff.added,
    removedRoles: roleDiff.removed,
    addedModules: moduleDiff.added,
    removedModules: moduleDiff.removed,
    addedDashboards: dashDiff.added,
    removedDashboards: dashDiff.removed,
    landingPageChanged: previous.landingPage !== current.landingPage,
  };
}

/**
 * Get the current contract version hash for a user+tenant pair.
 * The hash changes whenever any access-relevant data changes,
 * allowing the frontend to poll for staleness without fetching the full contract.
 */
export async function getContractVersion(
  userId: string,
  tenantId: string,
): Promise<{ version: string; generatedAt: string }> {
  const snapshot = await getAccessSnapshot(tenantId, userId);

  const hashData: Record<string, unknown> = {
    permissions: snapshot.effectivePermissions,
    roles: snapshot.functionalRoles,
    modules: snapshot.allowedModules,
    dashboards: snapshot.allowedDashboards,
    landingPage: snapshot.landingHint.landingPage,
  };

  return {
    version: computeContractHash(hashData),
    generatedAt: new Date().toISOString(),
  };
}
