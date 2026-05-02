/**
 * Secrets port — abstracts where DAuth loads secrets from.
 *
 * Two adapters ship under this port:
 *   - `EnvSecretsAdapter`: reads from `process.env`. The production default
 *     today — matches the historical boot path where secrets live in
 *     `/etc/keycloak/keycloak.env` (sourced into PM2 env) and `.env.shared`.
 *   - `VaultSecretsAdapter`: reads from HashiCorp Vault's KV v2 engine over
 *     HTTP. Activated by `DAUTH_VAULT_ENABLED=true` + `VAULT_ADDR` +
 *     `VAULT_TOKEN` (per dauth.config.ts). Inactive by default — the Vault
 *     server itself is not deployed yet (see activation-status doc).
 *
 * Failure policy: a missing secret is NOT an error (returns null). Callers
 * decide whether that's fatal. This keeps startup paths simple — factories
 * that don't find their secret return null and degrade to no-op.
 */
export interface SecretsAdapter {
    readonly name: 'env' | 'vault';
    getSecret(path: string): Promise<string | null>;
    /** Optional bulk read — default implementation falls back to sequential get. */
    getSecrets?(paths: string[]): Promise<Record<string, string | null>>;
}
export declare class EnvSecretsAdapter implements SecretsAdapter {
    readonly name: "env";
    getSecret(path: string): Promise<string | null>;
}
