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

let _getTenantBlueprint: GetTenantBlueprintFn = async () => null;
let _getBundleItems: GetBundleItemsFn = async () => [];
let _logPolicyDecision: LogPolicyDecisionFn = async () => {};

export function bindBlueprintPort(impl: {
  getTenantBlueprint?: GetTenantBlueprintFn;
  getBundleItems?: GetBundleItemsFn;
  logPolicyDecision?: LogPolicyDecisionFn;
}) {
  if (impl.getTenantBlueprint) _getTenantBlueprint = impl.getTenantBlueprint;
  if (impl.getBundleItems) _getBundleItems = impl.getBundleItems;
  if (impl.logPolicyDecision) _logPolicyDecision = impl.logPolicyDecision;
}

export const getTenantBlueprint: GetTenantBlueprintFn = (id) => _getTenantBlueprint(id);
export const getBundleItems: GetBundleItemsFn = (tenantId, code) => _getBundleItems(tenantId, code);
export const logPolicyDecision: LogPolicyDecisionFn = (tenantId, payload) =>
  _logPolicyDecision(tenantId, payload);
