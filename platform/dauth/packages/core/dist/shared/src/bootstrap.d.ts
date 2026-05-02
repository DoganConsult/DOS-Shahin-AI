/**
 * DAuth Enterprise Stack bootstrap — single entry point every service
 * calls once at startup to wire the pluggable adapters (TokenVerifier,
 * ReBAC) behind the @dos/auth ports.
 *
 * Contract:
 * - Reads env flags (`DAUTH_KEYCLOAK_SHADOW/ENFORCE`, `DAUTH_OPENFGA_SHADOW/ENFORCE`,
 *   `KEYCLOAK_*`, `OPENFGA_*`) and constructs the corresponding adapter
 *   only when the flag is on AND the config is complete.
 * - Never throws into the caller. Any construction failure is logged via
 *   the injected `log` hook and the factory falls back to native-only.
 * - Idempotent — calling twice reseats adapters, useful for hot reload in
 *   tests. Call sites in services should invoke this once in the
 *   entrypoint (typically `server.ts` before routes are mounted).
 *
 * The TokenVerifier factory additionally requires a project-supplied
 * native verify function; this module accepts it via `nativeVerify`.
 */
import type { MinimalAuthPayload } from './dauth-ports/token-verifier.port';
import type { AbacAdapter } from './dauth-ports/abac.port';
import { type InitTokenVerifierFactoryOptions } from './token-verifier-factory';
import type { SecretsAdapter } from './dauth-ports/secrets.port';
export interface DauthBootstrapOptions<P extends MinimalAuthPayload> {
    /** Native verify function (project's own JWT path). Required. */
    nativeVerify: InitTokenVerifierFactoryOptions<P>['nativeVerify'];
    /** Optional: map Keycloak claims → project AuthPayload. */
    keycloakPayloadMapper?: (raw: Record<string, unknown>) => P;
    /**
     * Project-supplied native ABAC adapter (platform/core's `NativeAbacAdapter`
     * runs the full 14-step pipeline). If omitted, bootstrap uses
     * `AbstainAbacAdapter` which always returns abstain — Cerbos still
     * participates but has nothing to diverge against.
     */
    nativeAbac?: AbacAdapter;
    /** Structured logger hooks. Defaults to console. */
    log?: {
        info?: (msg: string, meta?: Record<string, unknown>) => void;
        warn?: (msg: string, meta?: Record<string, unknown>) => void;
        error?: (msg: string, meta?: Record<string, unknown>) => void;
    };
}
export interface DauthBootstrapResult {
    keycloak: {
        enabled: boolean;
        mode: 'off' | 'shadow' | 'enforce';
        jwksUrl?: string;
    };
    openfga: {
        enabled: boolean;
        mode: 'off' | 'shadow' | 'enforce';
        apiUrl?: string;
        storeId?: string;
    };
    cerbos: {
        enabled: boolean;
        mode: 'off' | 'shadow' | 'enforce';
        pdpUrl?: string;
    };
    secrets: {
        adapter: 'env' | 'vault';
        enabled: boolean;
        addr?: string;
        mount?: string;
    };
}
/**
 * Read the last-resolved secrets adapter. Returns the env adapter when
 * Vault is not enabled; returns the Vault adapter when
 * `DAUTH_VAULT_ENABLED=true` + `VAULT_ADDR` + `VAULT_TOKEN` are present.
 * Never throws. Callers that need secrets should go through this so the
 * rollout can flip to Vault without code changes.
 */
export declare function getDauthSecretsAdapter(): SecretsAdapter;
export declare function bootstrapDauth<P extends MinimalAuthPayload = MinimalAuthPayload>(opts: DauthBootstrapOptions<P>): DauthBootstrapResult;
/**
 * Read the last `bootstrapDauth()` result. Used by /health/dauth endpoints
 * so ops can see which adapters are enabled and in what mode without
 * re-running bootstrap. Returns null if bootstrap has not yet run.
 */
export declare function getLastDauthBootstrapResult(): DauthBootstrapResult | null;
/**
 * Parse a comma-separated KEYCLOAK_ISSUER env into the shape the verifier
 * expects. Empty → undefined (no issuer check). Single → string. Multiple →
 * string[]. The verifier accepts a token whose `iss` exactly matches any
 * entry — required for per-surface auth fronting hosts where the same KC
 * realm is reached via multiple hostnames.
 *
 * Exported for unit-testing. Callers should not read `KEYCLOAK_ISSUER`
 * directly — always route through this to keep parsing rules consistent
 * (trim, drop empties, collapse singleton list).
 */
export declare function parseIssuerList(raw: string | undefined): string | string[] | undefined;
