/**
 * Vault secrets adapter — HashiCorp Vault KV v2 HTTP client.
 *
 * Gated on `DAUTH_VAULT_ENABLED=true`. When Vault isn't deployed (current
 * state per declarations/dauth-activation-status.md), callers should
 * instantiate via `buildDefaultSecretsAdapter()` which returns the env-based
 * adapter — no Vault calls are made.
 *
 * Scope: read-only. DAuth does not write to Vault; secrets are rotated via
 * the usual Vault tooling and DAuth just reads.
 */
import type { SecretsAdapter } from '../dauth-ports/secrets.port';
export interface VaultSecretsOptions {
    /** Required. Vault address (e.g. `https://vault.internal:8200`). */
    addr: string;
    /** Required. Vault token with read policy on the configured mount. */
    token: string;
    /** KV v2 mount path. Defaults to `secret`. */
    mount?: string;
    timeoutMs?: number;
    fetchImpl?: typeof fetch;
}
export declare class VaultSecretsAdapter implements SecretsAdapter {
    readonly name: "vault";
    private readonly addr;
    private readonly token;
    private readonly mount;
    private readonly timeoutMs;
    private readonly fetchImpl;
    constructor(opts: VaultSecretsOptions);
    /**
     * Read a secret. `path` is the logical Vault path under the mount
     * (e.g. "keycloak/admin" → GET /v1/{mount}/data/keycloak/admin).
     * Keys within the secret payload are joined with `#` (e.g.
     * "keycloak/admin#client_secret" → field `client_secret`).
     */
    getSecret(path: string): Promise<string | null>;
}
/**
 * Factory — returns Vault adapter when config is complete + flag is on,
 * otherwise the env adapter. Never throws; failures fall through to env.
 */
export declare function buildDefaultSecretsAdapter(): SecretsAdapter;
