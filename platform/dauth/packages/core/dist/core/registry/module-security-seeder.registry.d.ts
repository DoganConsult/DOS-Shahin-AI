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
import type { ModulePermission, ModuleRole, ModuleAction, ApprovalRule, OwnershipRule, SoDRule } from '@dos/types';
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
/**
 * Register a module's security metadata. Called once per module at startup.
 * Idempotent — re-registering the same module replaces its entry.
 */
export declare function registerModuleSecurity(moduleCode: string, entry: Omit<ModuleSecurityEntry, 'moduleCode' | 'registeredAt'>): void;
/** Get security entry for a module. Returns undefined if not registered. */
export declare function getModuleSecurity(moduleCode: string): ModuleSecurityEntry | undefined;
/** Get all registered module codes. */
export declare function getAllModuleCodes(): string[];
/** Get the full registry snapshot. */
export declare function getSecurityRegistry(): ReadonlyMap<string, ModuleSecurityEntry>;
/** Look up a permission across all modules. */
export declare function findPermission(permissionCode: string): {
    moduleCode: string;
    permission: ModulePermission;
} | undefined;
/** Look up an approval rule for a given entity transition. */
export declare function findApprovalRule(moduleCode: string, entityType: string, fromStatus: string, toStatus: string): ApprovalRule | undefined;
/** Look up SoD rules for a module. */
export declare function findSoDRules(moduleCode: string): SoDRule[];
/** Registry stats for diagnostics. */
export declare function getRegistryStats(): {
    totalModules: number;
    totalPermissions: number;
    totalRoles: number;
    totalActions: number;
    totalApprovalRules: number;
    totalSoDRules: number;
};
export declare const MODULE_SECURITY_REGISTRY: Map<string, ModuleSecurityEntry>;
export type { ModulePermission, ModuleRole, ModuleAction, SoDRule, ApprovalRule };
