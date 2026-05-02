export type { ProductManifest, ModuleRegistrationContract, ModuleContract, ProductContract, } from '@dos/contracts';
export type { ModuleManifest, } from '@dos/types';
export type { DosModuleRegistryPort, DosProductRegistryPort, } from '../ports';
export type CapabilityStatus = 'available' | 'partial' | 'planned' | 'not_started';
export type CapabilityOwner = 'platform' | 'product' | 'shared';
export interface CapabilityEntry {
    id: string;
    name: string;
    description: string;
    owner: CapabilityOwner;
    status: CapabilityStatus;
    modules: string[];
    contracts: string[];
    dependencies: string[];
}
export declare const PLATFORM_CAPABILITY_CATALOG: CapabilityEntry[];
/**
 * Modules whose permissions are always granted regardless of
 * tenant_module_entitlements rows. Used by the DAuth decision engine's
 * step 5 (product_enabled) to short-circuit the entitlement check for
 * platform primitives.
 *
 * Every entry MUST correspond to a real `<module>.*.*` permission code
 * somewhere in services/auth-service/src/domain/access/rbac/
 * canonical-permissions.ts. Historical entries that never had seeded
 * permissions (tenancy, settings, notifications plural) have been
 * removed — they never affected runtime and broke the
 * "tenant_admin covers all ALWAYS_ON" invariant in
 * seed-rbac-data.test.ts.
 */
export declare const ALWAYS_ON_MODULES: Set<string>;
export declare const GRC_CORE_MODULES: Set<string>;
/**
 * EXTENDED_MODULES — non-Wave-1 feature surfaces that ship seeded
 * permissions because their code is present in the repo, but which are
 * hidden from users in Wave 1 via Shahin nav filtering + backend
 * permission checks + gateway AI safety flag.
 *
 * Present so the RBAC seed's permission map is self-consistent (every
 * moduleCode that appears in a permission prefix must be classified).
 * Wave 1 does NOT surface these routes to users; their tenant_module
 * _entitlements rows stay off and the DAuth decision-engine denies at
 * step 5 (product_enabled).
 */
export declare const EXTENDED_MODULES: Set<string>;
/**
 * Complete module classification. A permission's moduleCode MUST fall
 * into one of the three buckets above; otherwise it is "orphan" and the
 * seed-rbac-data.test.ts invariant will surface it.
 */
export declare const CLASSIFIED_MODULES: Set<string>;
export declare function getCapability(id: string): CapabilityEntry | undefined;
export declare function getCapabilitiesByStatus(status: CapabilityStatus): CapabilityEntry[];
export declare function getCapabilitiesByOwner(owner: CapabilityOwner): CapabilityEntry[];
export declare function validateCapabilityCatalog(): string[];
export declare function resolveCapabilityDAG(capabilityIds: string[]): CapabilityEntry[];
export declare function validateCapabilityReadiness(moduleCodes: string[]): void;
export declare function getEffectiveModules(_tenantId: string, _userId?: string): {
    modules: string[];
};
export declare function getActiveModules(tenantId: string, userId?: string): Promise<string[]>;
export declare function checkRuntimeAccessGate(tenantId: string, moduleCode: string): Promise<{
    allowed: boolean;
    reason: string;
}>;
export declare function getAllRegisteredModuleCodes(): string[];
export declare function getModuleCodesByTier(tier: string): string[];
export declare function validateRegistryAlignment(_codes: string[]): {
    valid: boolean;
    missing: string[];
    extra: string[];
};
export interface EntityDescriptor {
    entityType: string;
    moduleCode: string;
    entityTableName?: string;
    entityIdColumn?: string;
    raciScopeType?: string;
    reviewerColumn?: string;
    approverColumn?: string;
    orgUnitColumn?: string;
}
export declare function registerEntityDescriptor(descriptor: EntityDescriptor): void;
export declare function resolveByEntity(entityType: string): EntityDescriptor | undefined;
export declare function listEntityDescriptors(): EntityDescriptor[];
export declare function isModuleActive(..._args: any[]): Promise<boolean>;
export declare function getModuleState(..._args: any[]): Promise<any>;
export declare function updateModuleState(..._args: any[]): Promise<void>;
export declare function getAllModuleStates(..._args: any[]): Promise<any[]>;
