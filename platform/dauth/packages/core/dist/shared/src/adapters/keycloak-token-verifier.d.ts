import { type MinimalAuthPayload, type TokenVerifier, type TokenVerifyResult } from '../dauth-ports/token-verifier.port';
export interface KeycloakTokenVerifierOptions {
    /** Required. The full JWKS URL for the realm. */
    jwksUrl: string;
    /**
     * Optional — validated against token `iss` if set. Accepts a single
     * issuer string or an array of accepted issuers. Multi-issuer is required
     * for per-surface auth fronting hosts (e.g. `auth.shahin-ai.com` and
     * `auth.dogan-ai.com` both fronting the same realm). The token's `iss`
     * must exactly match one of the accepted values.
     */
    issuer?: string | string[];
    /** Optional — validated against token `aud` if set. */
    audience?: string;
    /** JWKS cache TTL. Defaults to 10 minutes. */
    cacheTtlMs?: number;
    /** Inject fetch impl for tests / non-node runtimes. */
    fetchImpl?: typeof fetch;
    /** Transform the decoded JWT payload into the project's AuthPayload. */
    payloadMapper?: (raw: Record<string, unknown>) => MinimalAuthPayload;
}
export declare class KeycloakTokenVerifier<P extends MinimalAuthPayload = MinimalAuthPayload> implements TokenVerifier<P> {
    readonly name: "keycloak";
    private cache;
    private readonly jwksUrl;
    private readonly issuer?;
    private readonly audience?;
    private readonly cacheTtlMs;
    private readonly fetchImpl?;
    private readonly payloadMapper?;
    constructor(options: KeycloakTokenVerifierOptions);
    verify(token: string): Promise<TokenVerifyResult<P>>;
    /**
     * Eager JWKS warmup. Called by bootstrap so a missing/unreachable JWKS
     * surfaces at startup rather than at the first verify(). Failure here
     * does NOT throw — bootstrap logs and downgrades to native-only.
     */
    warmup(): Promise<{
        ok: boolean;
        keyCount: number;
        error?: string;
    }>;
    private getKey;
    private refreshJwks;
}
