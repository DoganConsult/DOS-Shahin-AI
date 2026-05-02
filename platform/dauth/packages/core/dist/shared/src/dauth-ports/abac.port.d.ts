/**
 * ABAC port — attribute-based policy evaluation under DAuth.
 *
 * Source: platform/core/current-source/dauth/ports/abac.port.ts (clone).
 * Why here: `@dos/auth` is the canonical workspace package; lifting the port
 * into the package makes Cerbos addressable from every service without a
 * tsconfig path shuffle to platform/core.
 *
 * Decision engine (platform/core) still owns the full native ABAC pipeline
 * (SoD + lifecycle-auth). This port exists so Cerbos can participate as
 * primary or shadow under the same uniform verdict shape.
 */
export interface AbacPrincipal {
    userId: string;
    tenantId: string;
    roles: string[];
    attributes?: Record<string, unknown>;
}
export interface AbacResource {
    type: string;
    id?: string;
    tenantId: string;
    attributes?: Record<string, unknown>;
}
export interface AbacRequest {
    principal: AbacPrincipal;
    resource: AbacResource;
    action: string;
    context?: Record<string, unknown>;
}
export interface AbacVerdict {
    decision: 'allow' | 'deny' | 'abstain';
    reasonCode?: string;
    reason?: string;
    policyVersion?: string;
    obligations?: Record<string, unknown>;
    source: 'native' | 'cerbos' | 'opa' | 'custom';
    latencyMs?: number;
}
export interface AbacAdapter {
    readonly name: 'native' | 'cerbos' | 'opa' | 'custom';
    evaluate(request: AbacRequest): Promise<AbacVerdict>;
    currentPolicyVersion(): Promise<string>;
}
/**
 * Default pass-through native adapter. Always abstains so that a shadow
 * Cerbos verdict isn't compared against a synthetic "allow" from a stub.
 *
 * Services that want real native ABAC (SoD + lifecycle) should register
 * their own adapter via `initAbacFactory({ native: <adapter> })` — the
 * platform/core `NativeAbacAdapter` is the canonical implementation.
 */
export declare class AbstainAbacAdapter implements AbacAdapter {
    readonly name: "native";
    evaluate(_request: AbacRequest): Promise<AbacVerdict>;
    currentPolicyVersion(): Promise<string>;
}
