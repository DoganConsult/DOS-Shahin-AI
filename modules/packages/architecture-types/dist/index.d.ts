export type OwnershipLayer = 'platform-owned' | 'product-owned' | 'module-owned' | 'service-runtime-owned' | 'tenant-owned-contract' | 'user-identity-owned' | 'shared-kernel' | 'discard-archive';
export type MigrationStatus = 'inventory' | 'copy-ready' | 'copied' | 'refactoring' | 'parity' | 'cutover-ready' | 'cutover-complete';
export interface ServiceManifest {
    serviceCode: string;
    displayName: string;
    layer: 'platform-service' | 'domain-service' | 'edge-service';
    ownerTeam: string;
    runtime: 'node';
    dependsOn: string[];
    modules: string[];
    exposes: {
        apiBase?: string;
        events?: string[];
    };
}
export interface ProductManifest {
    productCode: string;
    displayName: string;
    ownerTeam: string;
    platformDependencies: string[];
    defaultServices: string[];
    defaultModules: string[];
}
export interface ModuleManifest {
    moduleCode: string;
    displayName: string;
    ownerTeam: string;
    productCode: string;
    ownership: OwnershipLayer;
    currentSources: string[];
    targetPath: string;
    futureService: string;
    frontendSources: string[];
    ownedTables: string[];
    routeBases: string[];
}
export interface MigrationCrosswalkEntry {
    entryCode: string;
    currentPaths: string[];
    targetPath: string;
    ownership: OwnershipLayer;
    futureService: string;
    status: MigrationStatus;
}
export interface TenantManifest {
    tenantModel: 'single-tenant' | 'multi-tenant';
    configLayers: string[];
    isolationBoundaries: string[];
}
export interface UserIdentityManifest {
    identitySurfaces: string[];
    authModes: string[];
    permissionModel: string[];
}
//# sourceMappingURL=index.d.ts.map