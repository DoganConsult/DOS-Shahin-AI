"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvSecretsAdapter = void 0;
class EnvSecretsAdapter {
    name = 'env';
    async getSecret(path) {
        // Accept both "dot.path" (e.g. "keycloak.admin_secret") and flat ENV_VARS.
        // Flat ENV wins when set.
        const envKey = path.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
        const flat = process.env[envKey];
        if (flat !== undefined && flat !== '')
            return flat;
        // No dot-path rewriter by default — callers should pass the env var name.
        return null;
    }
}
exports.EnvSecretsAdapter = EnvSecretsAdapter;
//# sourceMappingURL=secrets.port.js.map