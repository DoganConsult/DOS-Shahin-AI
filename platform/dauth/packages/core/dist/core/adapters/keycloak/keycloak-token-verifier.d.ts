import { type TokenVerifier, type TokenVerifyResult } from '../../ports/token-verifier.port';
export interface KeycloakVerifierOptions {
    jwksUrl?: string;
    issuer?: string;
    audience?: string;
    cacheTtlMs?: number;
    /** Allow injecting a custom fetcher for tests or non-node runtimes. */
    fetchImpl?: typeof fetch;
}
export declare class KeycloakTokenVerifier implements TokenVerifier {
    readonly name: "keycloak";
    private cache;
    private readonly options;
    constructor(options?: KeycloakVerifierOptions);
    verify(token: string): Promise<TokenVerifyResult>;
    private getKey;
    private refreshJwks;
}
