/**
 * Public types for the platform access/session store.
 *
 * These describe the canonical session shape every product consumes.
 * The HTTP wire format is normalized into this shape inside `AccessStore`.
 */
export interface AccessUser {
    id?: string;
    email?: string;
    name?: string;
}
export interface AccessTenant {
    id?: string | null;
    name?: string | null;
    code?: string | null;
    status?: string;
}
export interface AccessMembership {
    roleCode?: string;
    isOwner?: boolean;
}
export interface AccessTenantMembership {
    tenantId?: string;
    name?: string;
    code?: string;
    roleCode?: string;
    isOwner?: boolean;
}
export interface MeResponse {
    user?: AccessUser;
    tenant?: AccessTenant;
    membership?: AccessMembership;
    memberships?: AccessTenantMembership[];
}
export interface MyPermissionsPayload {
    tenantId?: string;
    roles?: string[];
    permissions?: string[];
    modules?: string[];
}
export type Permission = string;
export type ModuleCode = string;
/** Snapshot of the current authenticated session. */
export interface AccessSnapshot {
    loaded: boolean;
    user: AccessUser | null;
    tenant: AccessTenant | null;
    roles: string[];
    permissions: Permission[];
    modules: ModuleCode[];
    isTenantAdmin: boolean;
    error: string | null;
}
