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
export declare function getCapability(id: string): CapabilityEntry | undefined;
export declare function getCapabilitiesByStatus(status: CapabilityStatus): CapabilityEntry[];
export declare function getCapabilitiesByOwner(owner: CapabilityOwner): CapabilityEntry[];
export declare function validateCapabilityCatalog(): string[];
export declare function resolveCapabilityDAG(capabilityIds: string[]): CapabilityEntry[];
export declare function validateCapabilityReadiness(moduleCodes: string[]): void;
