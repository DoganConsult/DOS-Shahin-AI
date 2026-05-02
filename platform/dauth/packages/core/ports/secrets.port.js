"use strict";
/**
 * Secrets port — abstracts secret retrieval so DAuth can read from Vault /
 * Azure Key Vault / SOPS / AWS Secrets Manager / plain env.
 *
 * JWT secret, JWT refresh secret, Keycloak client secret, Cerbos/OpenFGA
 * auth tokens, IdP API keys — all flow through this interface.
 *
 * The native adapter reads `process.env`. In production,
 * `DAUTH_SECRETS_ADAPTER=vault` must be set and the native env adapter is
 * refused (see `adapters/secrets/factory.ts`).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissingSecretError = void 0;
class MissingSecretError extends Error {
    key;
    source;
    constructor(key, source) {
        super(`Required secret '${key}' not found in ${source}`);
        this.key = key;
        this.source = source;
        this.name = 'MissingSecretError';
    }
}
exports.MissingSecretError = MissingSecretError;
//# sourceMappingURL=secrets.port.js.map