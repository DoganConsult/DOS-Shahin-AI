"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODULE_SECURITY_REGISTRY = void 0;
exports.registerModuleSecurity = registerModuleSecurity;
exports.getModuleSecurity = getModuleSecurity;
exports.getAllModuleCodes = getAllModuleCodes;
exports.getSecurityRegistry = getSecurityRegistry;
exports.findPermission = findPermission;
exports.findApprovalRule = findApprovalRule;
exports.findSoDRules = findSoDRules;
exports.getRegistryStats = getRegistryStats;
const observability_1 = require("@dos/platform-core/observability");
const registry = new Map();
/**
 * Register a module's security metadata. Called once per module at startup.
 * Idempotent — re-registering the same module replaces its entry.
 */
function registerModuleSecurity(moduleCode, entry) {
    registry.set(moduleCode, {
        moduleCode,
        ...entry,
        registeredAt: new Date().toISOString(),
    });
    observability_1.logger.info(`[DAuth] Registered security metadata for module: ${moduleCode} (${entry.permissions.length} perms, ${entry.roles.length} roles, ${entry.actions.length} actions, ${entry.approvalRules.length} approval rules)`);
}
/** Get security entry for a module. Returns undefined if not registered. */
function getModuleSecurity(moduleCode) {
    return registry.get(moduleCode);
}
/** Get all registered module codes. */
function getAllModuleCodes() {
    return [...registry.keys()];
}
/** Get the full registry snapshot. */
function getSecurityRegistry() {
    return registry;
}
/** Look up a permission across all modules. */
function findPermission(permissionCode) {
    for (const [moduleCode, entry] of registry) {
        const permission = entry.permissions.find(p => p.permissionCode === permissionCode);
        if (permission)
            return { moduleCode, permission };
    }
    return undefined;
}
/** Look up an approval rule for a given entity transition. */
function findApprovalRule(moduleCode, entityType, fromStatus, toStatus) {
    const entry = registry.get(moduleCode);
    if (!entry)
        return undefined;
    return entry.approvalRules.find(r => r.entityType === entityType && r.fromStatus === fromStatus && r.toStatus === toStatus);
}
/** Look up SoD rules for a module. */
function findSoDRules(moduleCode) {
    return registry.get(moduleCode)?.sodRules ?? [];
}
/** Registry stats for diagnostics. */
function getRegistryStats() {
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
exports.MODULE_SECURITY_REGISTRY = registry;
//# sourceMappingURL=module-security-seeder.registry.js.map