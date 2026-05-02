export type ResolverStatus = 'ok' | 'partial' | 'failed';
export type AccountStatus = 'active' | 'suspended' | 'inactive' | 'deactivated';
export interface AccessSnapshotIdentity {
    userId: string;
    tenantId: string;
    sessionId: string | null;
}
export interface AccessSnapshotPlatform {
    isActive: boolean;
    isSuperAdmin: boolean;
    accountStatus: AccountStatus;
    activeSessions: number;
}
export interface AccessSnapshotTenantMembership {
    role: string;
    isPrimary: boolean;
}
export interface AccessSnapshotTenant {
    tenantId: string;
    tenantStatus: string;
    orgName: string | null;
    membership: AccessSnapshotTenantMembership | null;
}
export interface AccessSnapshotScope {
    moduleCode: string;
    scopeType: string;
    scopeId: number | null;
}
export interface AccessSnapshotAccess {
    platformRoles: string[];
    tenantRoles: string[];
    accessProfiles: string[];
    functionalRoles: string[];
    permissions: string[];
    scopes: AccessSnapshotScope[];
}
export interface AccessSnapshotProducts {
    visibleProducts: string[];
    visibleModules: string[];
}
export interface AccessSnapshotWorkspace {
    canAccess: boolean;
    defaultDashboard: string | null;
}
export interface AccessSnapshotNav {
    landingPage: string;
    dashboardWidgets: string[];
}
export interface ResolverAccessSnapshot {
    version: string;
    resolverStatus: ResolverStatus;
    resolverErrors: string[];
    identity: AccessSnapshotIdentity;
    platform: AccessSnapshotPlatform;
    tenant: AccessSnapshotTenant;
    access: AccessSnapshotAccess;
    products: AccessSnapshotProducts;
    workspace: AccessSnapshotWorkspace;
    nav: AccessSnapshotNav;
}
export declare class AccessResolverError extends Error {
    readonly statusCode: number;
    readonly code: string;
    constructor(message: string, statusCode: number, code: string);
}
