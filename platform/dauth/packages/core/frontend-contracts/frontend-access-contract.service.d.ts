import type { FullAccessSnapshot } from '../contracts/access-snapshot.contract';
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
    scopeBindings: Array<{
        scopeType: string;
        scopeId: string;
        roleCode: string;
    }>;
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
 * Build a full access contract for frontend consumption.
 * Fetches the access snapshot and serializes it into a versioned contract.
 */
export declare function buildFrontendAccessContract(userId: string, tenantId: string): Promise<FrontendAccessContract>;
/**
 * Build a lightweight access contract containing only permissions and allowed modules.
 * Suitable for frequent polling or low-bandwidth scenarios.
 */
export declare function getMinimalAccessContract(userId: string, tenantId: string): Promise<MinimalAccessContract>;
/**
 * Build a navigation-specific contract subset.
 * Contains modules, dashboards, landing page, and roles for sidebar/nav rendering.
 */
export declare function getNavigationContract(userId: string, tenantId: string): Promise<NavigationContract>;
/**
 * Build a permission-only contract for lightweight authorization checks.
 * Contains effective permissions and decision authorities.
 */
export declare function getPermissionContract(userId: string, tenantId: string): Promise<PermissionContract>;
/**
 * Serialize a FullAccessSnapshot into a frontend-safe JSON contract.
 * Strips internal audit metadata and normalizes field names.
 */
export declare function serializeAccessSnapshot(snapshot: FullAccessSnapshot): FrontendAccessContract;
/**
 * Compute a diff between two frontend access contracts.
 * Returns added/removed items for permissions, roles, modules, and dashboards.
 * Useful for incremental frontend cache updates via WebSocket or polling.
 */
export declare function diffAccessContract(previous: FrontendAccessContract, current: FrontendAccessContract): AccessContractDiff;
/**
 * Get the current contract version hash for a user+tenant pair.
 * The hash changes whenever any access-relevant data changes,
 * allowing the frontend to poll for staleness without fetching the full contract.
 */
export declare function getContractVersion(userId: string, tenantId: string): Promise<{
    version: string;
    generatedAt: string;
}>;
