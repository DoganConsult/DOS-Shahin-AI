import './express-augment';

// ── Wave 1 — Gateway-origin trust contract ────────────────────────────────
// Cryptographic proof that a request entered through the API gateway. The
// gateway signs `x-dos-gateway-token` (HMAC-SHA-256) and downstream services
// verify it via `requireGatewayOrigin`. After Wave 1 cutover this is the
// SOLE source of truth for identity downstream — raw `x-user-*` /
// `x-tenant-id` headers are ignored once `LEGACY_HEADER_TRUST=false`.
export {
  signGatewayOrigin,
  verifyGatewayOrigin,
  createInMemoryReplayRegistry,
  STRIPPED_INBOUND_HEADERS,
  GATEWAY_ORIGIN_HEADER,
  type GatewayOriginPayload,
  type GatewayOriginPrincipal,
  type SignGatewayOriginInput,
  type VerifyGatewayOriginOptions,
  type VerifyGatewayOriginResult,
  type VerifyGatewayOriginSuccess,
  type VerifyGatewayOriginFailure,
  type VerifyFailureReason,
  type ReplayRegistry,
} from './gateway-origin';
export {
  requireGatewayOrigin,
  type RequireGatewayOriginOptions,
} from './middleware/gateway-origin.middleware';

export {
  setAuthMiddleware,
  getAuthMiddleware,
  authenticate,
  optionalAuthenticate,
  requirePermission,
  requireAnyPermission,
  requireSuperAdmin,
  requireTenantId,
  requireDauth,
  requireOwnershipOf,
} from './middleware';
export type {
  AuthMiddleware,
  RequireDauthOptions,
  RequireOwnershipOptions,
} from './middleware';

// Phase C — authz evaluator port. dauth-core registers the native
// 14-step pipeline adapter via setAuthzEvaluator() during bootstrap.
export type {
  AuthzEvaluator,
  AuthzEvaluationContext,
  AuthzDecision,
} from './dauth-ports';
export {
  LegacyClaimAuthzEvaluator,
  setAuthzEvaluator,
  getAuthzEvaluator,
  resetAuthzEvaluator,
} from './dauth-ports';

// ── DAuth Enterprise ports (Part 1–6 scaffold; native-only until flags flip) ──
// Note: directory named `dauth-ports` (not `ports`) to avoid collision with
// the existing `src/ports.ts` file which declares an unrelated set of
// interfaces (IdentityPort, SessionPort, etc).
export type {
  TokenVerifier,
  TokenVerifyResult,
  MinimalAuthPayload,
} from './dauth-ports';
export { InvalidTokenError } from './dauth-ports';
export {
  NativeTokenVerifier,
  type NativeVerifyFn,
  type NativeTokenVerifierOptions,
} from './adapters/native-token-verifier';
export {
  KeycloakTokenVerifier,
  type KeycloakTokenVerifierOptions,
} from './adapters/keycloak-token-verifier';
export {
  bootstrapDauth,
  getLastDauthBootstrapResult,
  getDauthSecretsAdapter,
  type DauthBootstrapOptions,
  type DauthBootstrapResult,
} from './bootstrap';
export {
  assertDauthConfigSafe,
  verifyDivergenceClean,
  type AssertDauthConfigSafeOptions,
  type DauthConfigSafetyReport,
} from './config-safety';
export {
  initTokenVerifierFactory,
  registerKeycloakVerifier,
  getTokenVerifier,
  resetTokenVerifierFactory,
  type InitTokenVerifierFactoryOptions,
  type TokenVerifierStack,
} from './token-verifier-factory';

// ── DAuth decision ledger (Part 3, DAuth-ECP-COMPLETE) ──
// Shape-correct writer for the live `platform_dauth.authz_decision_log` schema after
// migration 011_dauth_enterprise_ledger.sql. See
// packages/dos-auth/src/audit/decision-ledger.ts for history.
export {
  writeAuthDecision,
  readAuthDecision,
  type WriteDecisionInput,
  type SqlClient as AuthDecisionSqlClient,
} from './audit/decision-ledger';

// ── DAuth ReBAC port (Part 5, DAuth-ECP-COMPLETE) ──
// Native (pass-through) + OpenFGA adapters, factory gated on
// DAUTH_OPENFGA_SHADOW / DAUTH_OPENFGA_ENFORCE. Flipping these env flags
// changes the authoritative adapter at restart time; native stays as
// rollback.
export type {
  RebacAdapter,
  RebacCheckRequest,
  RebacCheckResult,
} from './dauth-ports/rebac.port';
export { NativeRebacAdapter } from './adapters/native-rebac.adapter';
export {
  OpenFgaRebacAdapter,
  type OpenFgaRebacOptions,
  type RebacTupleWrite,
} from './adapters/openfga-rebac.adapter';
export {
  initRebacFactory,
  getRebacAdapter,
  resetRebacFactory,
  type InitRebacFactoryOptions,
  type RebacStack,
} from './rebac-factory';

// ── DAuth ABAC port (Cerbos adapter under DAuth, shadow by default) ──
// Native ABAC (14-step pipeline) stays in platform/core; services can inject
// their native adapter via bootstrap `nativeAbac`. Default is AbstainAbacAdapter.
export type {
  AbacAdapter,
  AbacRequest,
  AbacVerdict,
  AbacPrincipal,
  AbacResource,
} from './dauth-ports/abac.port';
export { AbstainAbacAdapter } from './dauth-ports/abac.port';
export {
  CerbosAbacAdapter,
  type CerbosAdapterOptions,
} from './adapters/cerbos-abac.adapter';

// ── Keycloak Admin-API write client (dual-write on register / hire / fire) ──
// Uses a narrow-scoped service account with `manage-users` — separate from
// the read-only client used by KeycloakIdentityAdapter. buildDefaultKeycloakAdminClient
// returns null if env config is absent so consumers degrade to DAuth-only.
export {
  KeycloakAdminClient,
  buildDefaultKeycloakAdminClient,
  type KeycloakAdminClientOptions,
  type KeycloakUserPayload,
  type KeycloakGroupPayload,
} from './adapters/keycloak-admin-client';

// ── Keycloak ROPC (backend login) client + shared payload mapper ──
// The login client mints RS256 access tokens via `dauth-login` ROPC for
// `/api/auth/login`. The payload mapper projects KC claims onto the DOS
// AuthPayload shape consumers expect.
export {
  KeycloakLoginClient,
  KeycloakGrantError,
  buildDefaultKeycloakLoginClient,
  type KeycloakLoginClientOptions,
  type PasswordGrantRequest,
  type TokenGrantResponse,
  type KeycloakGrantErrorCode,
} from './adapters/keycloak-login-client';
export {
  buildKeycloakPayloadMapper,
  MissingTenantClaimError,
  type DosAuthPayload,
  type KeycloakPayloadMapperOptions,
} from './adapters/keycloak-payload.mapper';

// ── Secrets port (Vault when deployed, env fallback today) ──
// VaultSecretsAdapter is only used when DAUTH_VAULT_ENABLED=true + VAULT_ADDR +
// VAULT_TOKEN (per dauth.config.ts). buildDefaultSecretsAdapter picks the right
// impl at construction time and never throws.
export type { SecretsAdapter } from './dauth-ports/secrets.port';
export { EnvSecretsAdapter } from './dauth-ports/secrets.port';
export {
  VaultSecretsAdapter,
  buildDefaultSecretsAdapter,
  type VaultSecretsOptions,
} from './adapters/vault-secrets.adapter';
export {
  initAbacFactory,
  getAbacAdapter,
  resetAbacFactory,
  type InitAbacFactoryOptions,
  type AbacStack,
} from './abac-factory';
export {
  checkRebacAndLog,
  type CheckRebacAndLogInput,
  type CheckRebacAndLogResult,
  type SodGuardEvaluator,
  type SodGuardResult,
} from './access/rebac-check';

export { createCanonicalAuthMiddleware } from './canonical-middleware';
export type { CanonicalMiddlewareOptions } from './canonical-middleware';

export {
  getActiveSigningKey,
  getKeyByKid,
  listKeys,
  rotateSigningKey,
  revokeKey,
  invalidateKeyCache,
} from './key-store';
export type { SigningKey } from './key-store';

export type {
  IdentityPort,
  SessionPort,
  AccessPort,
  ScopePort,
  AuthorityPort,
  DelegationPort,
  SodPort,
  LifecycleAuthPort,
  AuditPort,
  SecurityPolicyPort,
  DauthRuntimePorts,
} from './ports';

export {
  evaluateLifecycleTransition,
  setLifecycleAuthPort,
  getLifecycleAuthPort,
} from './lifecycle/index';

export { getActor, registerActor } from './actor/actor-registry';
export type { Actor } from './actor/actor-registry';
export { generateToken, verifyToken, rotateKeysManually } from './jwt-rotation';

// W2 — Agent / service-account credential store
export {
  issueAgentCredential,
  verifyAgentCredential,
  revokeAgentCredential,
  listAgentCredentials,
  rotateAgentCredential,
} from './actor/agent-credentials.service';
export type {
  AgentCredentialMetadata,
  IssuedCredential,
  VerifyResult as AgentCredentialVerifyResult,
} from './actor/agent-credentials.service';

// W2 — Principal-context middleware (for withTenantClient actor binding)
export {
  getPrincipalContextFromRequest,
  attachPrincipalContext,
} from './middleware/principal-context.middleware';

// W2 — Agent-aware SOD engine
export { evaluateAgentSod } from './sod/agent-sod-engine';
export type { ActorPair, AgentSodDecision, SodOutcome } from './sod/agent-sod-engine';

// SoD HTTP gate — front-edge middleware. The full decision-engine path
// (with ledger writes) still runs downstream; this is only the request
// admission check used by routes that want a hard SoD block before the
// handler executes.
export {
  requireSodClearance,
  type SodClearanceOptions,
  type SodClearanceVerdict,
} from './middleware/sod-clearance.middleware';

export { issueAccessToken, issueRefreshToken } from './jwt-issuer';
export type {
  AccessTokenClaims,
  IssueAccessTokenOptions,
  IssueRefreshTokenOptions,
  RefreshTokenResult,
} from './jwt-issuer';

// Re-export the low-level jsonwebtoken API for edge cases that need a
// custom signing key (e.g. notification-service's SSE ticket uses its
// own SSE_STREAM_KEY rather than the platform JWT secret). Downstream
// services import { jwt } from '@dos/dauth-shared' so contract-boundary tests
// can enforce "no direct jsonwebtoken imports" without forcing the
// full generateToken/verifyToken abstraction on every caller.
export * as jwt from 'jsonwebtoken';

export function isUserEmailVerified(row: { email_verified?: boolean | null; email_verified_at?: string | Date | null } | null | undefined): boolean {
  return row?.email_verified === true || row?.email_verified_at != null;
}

export const DAUTH_VERSION = '1.0.0';

export const DAUTH_CONCERNS = [
  'access',
  'authority',
  'delegation',
  'lifecycle-auth',
  'scope',
  'session',
  'sod',
] as const;
