import type { FeatureGate, FeatureGateState } from '../contracts/delivery.types';
export declare function registerFeatureGate(input: {
    gateCode: string;
    label: string;
    state: FeatureGateState;
    rolloutPercent?: number;
    allowedRoles?: string[];
    allowedTenants?: string[];
    ownerLayer: string;
    ownerCode: string;
}): Promise<void>;
export declare function getFeatureGate(gateCode: string): Promise<FeatureGate | null>;
export declare function listFeatureGates(ownerLayer?: string, ownerCode?: string): Promise<FeatureGate[]>;
export declare function setFeatureGateState(gateCode: string, state: FeatureGateState, rolloutPercent?: number): Promise<void>;
export declare function isFeatureEnabled(gateCode: string, context: {
    tenantId?: string;
    roles?: string[];
    bucketSeed?: string;
}): Promise<boolean>;
