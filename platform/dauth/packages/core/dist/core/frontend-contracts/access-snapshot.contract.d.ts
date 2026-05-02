import type { AccessSnapshot } from '../contracts/access-snapshot.types';
export interface AccessSnapshotContract {
    getSnapshot(tenantId: string, userId: string): Promise<AccessSnapshot>;
    hasPermission(snapshot: AccessSnapshot, permissionCode: string): boolean;
    hasRole(snapshot: AccessSnapshot, roleCode: string): boolean;
    hasAuthority(snapshot: AccessSnapshot, authorityCode: string): boolean;
    getAllowedModules(snapshot: AccessSnapshot): string[];
    getLandingPage(snapshot: AccessSnapshot): string;
}
export declare function hasPermission(snapshot: AccessSnapshot, permissionCode: string): boolean;
export declare function hasRole(snapshot: AccessSnapshot, roleCode: string): boolean;
export declare function hasAuthority(snapshot: AccessSnapshot, authorityCode: string): boolean;
export declare function getAllowedModules(snapshot: AccessSnapshot): string[];
export declare function getLandingPage(snapshot: AccessSnapshot): string;
export declare function isModuleVisible(snapshot: AccessSnapshot, moduleCode: string): boolean;
export declare function getScopeBindings(snapshot: AccessSnapshot, roleCode?: string): AccessSnapshot['scopeBindings'];
