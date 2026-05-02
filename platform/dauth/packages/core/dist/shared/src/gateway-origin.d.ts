export interface GatewayOriginPayload {
    /** Issued-at (epoch seconds). */
    iat: number;
    /** Expires-at (epoch seconds). */
    exp: number;
    /** Unique token id; verifier rejects duplicates within the TTL window. */
    jti: string;
    /** Verified Keycloak subject (= user id). */
    sub: string;
    /** Verified tenant id. May be empty string for tenant-less principals. */
    tenantId: string;
    /** Verified email claim. */
    email: string;
    /** Verified roles claim (Keycloak realm + resource roles, normalized). */
    roles: string[];
    /** Constant marker — readers MUST reject any other value. */
    src: 'gateway';
    /** Schema version. Bump when payload shape changes. */
    v: 1;
}
export interface GatewayOriginPrincipal {
    sub: string;
    tenantId: string;
    email: string;
    roles: string[];
}
export interface SignGatewayOriginInput {
    sub: string;
    tenantId?: string | null;
    email: string;
    roles?: string[];
    /** TTL in seconds. Default 60. Hard-capped at 300s. */
    ttlSeconds?: number;
    /** Inject a fixed jti for tests; default = crypto.randomUUID(). */
    jti?: string;
    /** Inject a fixed `iat` (epoch seconds) for tests; default = now. */
    nowSeconds?: number;
}
export declare function signGatewayOrigin(input: SignGatewayOriginInput, secret: string): string;
export type VerifyFailureReason = 'MISSING' | 'MALFORMED' | 'BAD_HMAC' | 'PAYLOAD_INVALID' | 'WRONG_SOURCE' | 'WRONG_VERSION' | 'EXPIRED' | 'NOT_YET_VALID' | 'REPLAYED';
export interface VerifyGatewayOriginSuccess {
    ok: true;
    payload: GatewayOriginPayload;
    principal: GatewayOriginPrincipal;
}
export interface VerifyGatewayOriginFailure {
    ok: false;
    reason: VerifyFailureReason;
    detail?: string;
}
export type VerifyGatewayOriginResult = VerifyGatewayOriginSuccess | VerifyGatewayOriginFailure;
export interface VerifyGatewayOriginOptions {
    secret: string;
    /** Replay registry; pass the same instance per service. */
    replayRegistry: ReplayRegistry;
    /** Clock skew tolerance in seconds. Default 5. */
    clockSkewSeconds?: number;
    /** Inject a fixed `now` (epoch seconds) for tests; default = real now. */
    nowSeconds?: number;
}
export declare function verifyGatewayOrigin(rawToken: string | undefined | null, options: VerifyGatewayOriginOptions): VerifyGatewayOriginResult;
/**
 * In-memory replay registry. Bounded: each entry expires automatically when
 * its `expiresAt` is reached on the next `seen()` call. For multi-instance
 * deployments, replace with a Redis-backed implementation that exposes the
 * same `seen()` semantics — the verifier does not depend on the storage.
 */
export interface ReplayRegistry {
    /**
     * Returns `true` if the jti was already seen and is still within its TTL
     * window; otherwise records it and returns `false`.
     *
     * `nowSeconds` is the verifier's clock; the registry must use it (not a
     * wall-clock) so GC stays consistent with the freshness checks.
     */
    seen(jti: string, expEpochSeconds: number, nowSeconds?: number): boolean;
    /** Number of currently-tracked jti entries. Diagnostic only. */
    size(): number;
}
export declare function createInMemoryReplayRegistry(opts?: {
    maxEntries?: number;
    nowSeconds?: () => number;
}): ReplayRegistry;
/**
 * The full set of incoming headers the gateway MUST strip before the auth
 * pass and before injecting verified identity. Any of these arriving on the
 * inbound request from the public internet is a spoof attempt.
 */
export declare const STRIPPED_INBOUND_HEADERS: ReadonlyArray<string>;
export declare const GATEWAY_ORIGIN_HEADER = "x-dos-gateway-token";
