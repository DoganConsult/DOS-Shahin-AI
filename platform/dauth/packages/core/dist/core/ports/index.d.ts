/**
 * DAuth ports barrel — import interfaces from here.
 * Adapters live under `../adapters/` and should be wired via the factory
 * helpers, not imported directly by business code.
 */
export type { TokenVerifier, TokenVerifyResult } from './token-verifier.port';
export { InvalidTokenError } from './token-verifier.port';
export type { IdentityAdapter, ExternalPrincipal, IdentityLinkResult, SyncResult, } from './identity.port';
export type { AbacAdapter, AbacPrincipal, AbacResource, AbacRequest, AbacVerdict, } from './abac.port';
export type { RebacAdapter, RebacCheckRequest, RebacCheckResult, RebacListRequest, RebacListResult, RebacTupleWrite, } from './rebac.port';
export type { SecretsAdapter } from './secrets.port';
export { MissingSecretError } from './secrets.port';
