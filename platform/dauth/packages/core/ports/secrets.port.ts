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

export interface SecretsAdapter {
  readonly name: 'env' | 'vault' | 'azure-kv' | 'sops' | 'aws-sm' | 'custom';

  /**
   * Retrieve a secret. Returns `null` if not present. Callers decide whether
   * null is fatal (production JWT_SECRET) or acceptable (dev fallback).
   */
  get(key: string): Promise<string | null>;

  /**
   * Retrieve and require a secret. Throws `MissingSecretError` if absent.
   * Use for production-critical secrets where a missing value should
   * fail-fast at boot time, not at first use.
   */
  require(key: string): Promise<string>;

  /**
   * Opaque version id of the secret — used for rotation audits. Returns
   * `null` if the backing store does not expose versioning (plain env).
   */
  version(key: string): Promise<string | null>;
}

export class MissingSecretError extends Error {
  constructor(
    public readonly key: string,
    public readonly source: SecretsAdapter['name'],
  ) {
    super(`Required secret '${key}' not found in ${source}`);
    this.name = 'MissingSecretError';
  }
}
