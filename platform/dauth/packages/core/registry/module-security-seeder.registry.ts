/**
 * Module Security Seeder Registry — DAuth-owned
 *
 * Ingests typed security metadata from module manifests at startup.
 * Each module registers its permissions, roles, actions, approval rules,
 * ownership rules, and SoD rules via registerModuleSecurity().
 *
 * Law 2: DAuth owns all auth/access/scope/authority/SoD.
 * Law 3: Data-driven security — all from typed registries.
 */

import type {
  ModulePermission,
  ModuleRole,
  ModuleAction,
  ApprovalRule,
  OwnershipRule,
  SoDRule,
} from '@dos/types';
import { logger } from '@dos/platform-core/observability';

export interface ModuleSecurityEntry {
  moduleCode: string;
  permissions: ModulePermission[];
  roles: ModuleRole[];
  actions: ModuleAction[];
  approvalRules: ApprovalRule[];
  ownershipRules: OwnershipRule[];
  sodRules: SoDRule[];
  registeredAt: string;
}

const registry = new Map<string, ModuleSecurityEntry>();

/**
 * Register a module's security metadata. Called once per module at startup.
 * Idempotent — re-registering the same module replaces its entry.
 */
export function registerModuleSecurity(
  moduleCode: string,
  entry: Omit<ModuleSecurityEntry, 'moduleCode' | 'registeredAt'>,
): void {
  registry.set(moduleCode, {
    moduleCode,
    ...entry,
    registeredAt: new Date().toISOString(),
  });
  logger.info(`[DAuth] Registered security metadata for module: ${moduleCode} (${entry.permissions.length} perms, ${entry.roles.length} roles, ${entry.actions.length} actions, ${entry.approvalRules.length} approval rules)`);
}

/** Get security entry for a module. Returns undefined if not registered. */
export function getModuleSecurity(moduleCode: string): ModuleSecurityEntry | undefined {
  return registry.get(moduleCode);
}

/** Get all registered module codes. */
export function getAllModuleCodes(): string[] {
  return [...registry.keys()];
}

/** Get the full registry snapshot. */
export function getSecurityRegistry(): ReadonlyMap<string, ModuleSecurityEntry> {
  return registry;
}

/** Look up a permission across all modules. */
export function findPermission(permissionCode: string): { moduleCode: string; permission: ModulePermission } | undefined {
  for (const [moduleCode, entry] of registry) {
    const permission = entry.permissions.find(p => p.permissionCode === permissionCode);
    if (permission) return { moduleCode, permission };
  }
  return undefined;
}

/** Look up an approval rule for a given entity transition. */
export function findApprovalRule(
  moduleCode: string,
  entityType: string,
  fromStatus: string,
  toStatus: string,
): ApprovalRule | undefined {
  const entry = registry.get(moduleCode);
  if (!entry) return undefined;
  return entry.approvalRules.find(
    r => r.entityType === entityType && r.fromStatus === fromStatus && r.toStatus === toStatus,
  );
}

/** Look up SoD rules for a module. */
export function findSoDRules(moduleCode: string): SoDRule[] {
  return registry.get(moduleCode)?.sodRules ?? [];
}

/** Registry stats for diagnostics. */
export function getRegistryStats(): {
  totalModules: number;
  totalPermissions: number;
  totalRoles: number;
  totalActions: number;
  totalApprovalRules: number;
  totalSoDRules: number;
} {
  let totalPermissions = 0;
  let totalRoles = 0;
  let totalActions = 0;
  let totalApprovalRules = 0;
  let totalSoDRules = 0;

  for (const entry of registry.values()) {
    totalPermissions += entry.permissions.length;
    totalRoles += entry.roles.length;
    totalActions += entry.actions.length;
    totalApprovalRules += entry.approvalRules.length;
    totalSoDRules += entry.sodRules.length;
  }

  return {
    totalModules: registry.size,
    totalPermissions,
    totalRoles,
    totalActions,
    totalApprovalRules,
    totalSoDRules,
  };
}

export const MODULE_SECURITY_REGISTRY = registry;

// Re-export types for consumers that imported from here
export type { ModulePermission, ModuleRole, ModuleAction, SoDRule, ApprovalRule };
