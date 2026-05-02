/**
 * Blueprint port — outbound interface for tenant blueprint / packs adapter.
 * The Foundation module is standalone; the host wires a real implementation
 * (e.g. from the packs module) and injects it. The default stubs are inert
 * no-ops so the module can build and run in isolation.
 */
export interface TenantBlueprint {
    tenantId: string;
    bundles: string[];
    roles: string[];
    [k: string]: unknown;
}
export interface BundleItem {
    code: string;
    type: string;
    [k: string]: unknown;
}
export interface PolicyDecisionPayload {
    decision_type: string;
    [k: string]: unknown;
}
export type GetTenantBlueprintFn = (tenantId: string) => Promise<TenantBlueprint | null>;
export type GetBundleItemsFn = (tenantId: string, bundleCode: string) => Promise<BundleItem[]>;
export type LogPolicyDecisionFn = (tenantId: string, payload: PolicyDecisionPayload) => Promise<void>;
export declare function bindBlueprintPort(impl: {
    getTenantBlueprint?: GetTenantBlueprintFn;
    getBundleItems?: GetBundleItemsFn;
    logPolicyDecision?: LogPolicyDecisionFn;
}): void;
export declare const getTenantBlueprint: GetTenantBlueprintFn;
export declare const getBundleItems: GetBundleItemsFn;
export declare const logPolicyDecision: LogPolicyDecisionFn;
