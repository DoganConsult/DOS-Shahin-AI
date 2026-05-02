/**
 * Native ReBAC adapter — pass-through allow.
 *
 * Historical runtime enforced tenant/scope via RLS + scope-resolver, NOT
 * via a DAuth-port ReBAC call. So a freshly-introduced port call, when no
 * external engine is configured, must be benign: return `allowed: true`
 * so existing authorization flow proceeds to the next check.
 *
 * When OpenFGA is ENFORCE=true, the factory replaces primary with the
 * OpenFGA adapter — that's where real ReBAC gating happens. This native
 * adapter exists so the port pattern has a default that cannot cause
 * customer regression when the feature flag is off.
 */
import type { RebacAdapter, RebacCheckRequest, RebacCheckResult } from '../dauth-ports/rebac.port';
export declare class NativeRebacAdapter implements RebacAdapter {
    readonly name: "native";
    check(_request: RebacCheckRequest): Promise<RebacCheckResult>;
    currentModelVersion(): Promise<string | null>;
}
