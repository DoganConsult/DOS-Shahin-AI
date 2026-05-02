"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.VaultSecretsAdapter = exports.EnvSecretsAdapter = exports.MissingTenantClaimError = exports.buildKeycloakPayloadMapper = exports.buildDefaultKeycloakLoginClient = exports.KeycloakGrantError = exports.KeycloakLoginClient = exports.buildDefaultKeycloakAdminClient = exports.KeycloakAdminClient = exports.CerbosAbacAdapter = exports.AbstainAbacAdapter = exports.resetRebacFactory = exports.getRebacAdapter = exports.initRebacFactory = exports.OpenFgaRebacAdapter = exports.NativeRebacAdapter = exports.readAuthDecision = exports.writeAuthDecision = exports.resetTokenVerifierFactory = exports.getTokenVerifier = exports.registerKeycloakVerifier = exports.initTokenVerifierFactory = exports.verifyDivergenceClean = exports.assertDauthConfigSafe = exports.getDauthSecretsAdapter = exports.getLastDauthBootstrapResult = exports.bootstrapDauth = exports.KeycloakTokenVerifier = exports.NativeTokenVerifier = exports.InvalidTokenError = exports.resetAuthzEvaluator = exports.getAuthzEvaluator = exports.setAuthzEvaluator = exports.LegacyClaimAuthzEvaluator = exports.requireOwnershipOf = exports.requireDauth = exports.requireTenantId = exports.requireSuperAdmin = exports.requireAnyPermission = exports.requirePermission = exports.optionalAuthenticate = exports.authenticate = exports.getAuthMiddleware = exports.setAuthMiddleware = exports.requireGatewayOrigin = exports.GATEWAY_ORIGIN_HEADER = exports.STRIPPED_INBOUND_HEADERS = exports.createInMemoryReplayRegistry = exports.verifyGatewayOrigin = exports.signGatewayOrigin = void 0;
exports.DAUTH_CONCERNS = exports.DAUTH_VERSION = exports.jwt = exports.issueRefreshToken = exports.issueAccessToken = exports.requireSodClearance = exports.evaluateAgentSod = exports.attachPrincipalContext = exports.getPrincipalContextFromRequest = exports.rotateAgentCredential = exports.listAgentCredentials = exports.revokeAgentCredential = exports.verifyAgentCredential = exports.issueAgentCredential = exports.rotateKeysManually = exports.verifyToken = exports.generateToken = exports.registerActor = exports.getActor = exports.getLifecycleAuthPort = exports.setLifecycleAuthPort = exports.evaluateLifecycleTransition = exports.invalidateKeyCache = exports.revokeKey = exports.rotateSigningKey = exports.listKeys = exports.getKeyByKid = exports.getActiveSigningKey = exports.createCanonicalAuthMiddleware = exports.checkRebacAndLog = exports.resetAbacFactory = exports.getAbacAdapter = exports.initAbacFactory = exports.buildDefaultSecretsAdapter = void 0;
exports.isUserEmailVerified = isUserEmailVerified;
require("./express-augment");
// ── Wave 1 — Gateway-origin trust contract ────────────────────────────────
// Cryptographic proof that a request entered through the API gateway. The
// gateway signs `x-dos-gateway-token` (HMAC-SHA-256) and downstream services
// verify it via `requireGatewayOrigin`. After Wave 1 cutover this is the
// SOLE source of truth for identity downstream — raw `x-user-*` /
// `x-tenant-id` headers are ignored once `LEGACY_HEADER_TRUST=false`.
var gateway_origin_1 = require("./gateway-origin");
Object.defineProperty(exports, "signGatewayOrigin", { enumerable: true, get: function () { return gateway_origin_1.signGatewayOrigin; } });
Object.defineProperty(exports, "verifyGatewayOrigin", { enumerable: true, get: function () { return gateway_origin_1.verifyGatewayOrigin; } });
Object.defineProperty(exports, "createInMemoryReplayRegistry", { enumerable: true, get: function () { return gateway_origin_1.createInMemoryReplayRegistry; } });
Object.defineProperty(exports, "STRIPPED_INBOUND_HEADERS", { enumerable: true, get: function () { return gateway_origin_1.STRIPPED_INBOUND_HEADERS; } });
Object.defineProperty(exports, "GATEWAY_ORIGIN_HEADER", { enumerable: true, get: function () { return gateway_origin_1.GATEWAY_ORIGIN_HEADER; } });
var gateway_origin_middleware_1 = require("./middleware/gateway-origin.middleware");
Object.defineProperty(exports, "requireGatewayOrigin", { enumerable: true, get: function () { return gateway_origin_middleware_1.requireGatewayOrigin; } });
var middleware_1 = require("./middleware");
Object.defineProperty(exports, "setAuthMiddleware", { enumerable: true, get: function () { return middleware_1.setAuthMiddleware; } });
Object.defineProperty(exports, "getAuthMiddleware", { enumerable: true, get: function () { return middleware_1.getAuthMiddleware; } });
Object.defineProperty(exports, "authenticate", { enumerable: true, get: function () { return middleware_1.authenticate; } });
Object.defineProperty(exports, "optionalAuthenticate", { enumerable: true, get: function () { return middleware_1.optionalAuthenticate; } });
Object.defineProperty(exports, "requirePermission", { enumerable: true, get: function () { return middleware_1.requirePermission; } });
Object.defineProperty(exports, "requireAnyPermission", { enumerable: true, get: function () { return middleware_1.requireAnyPermission; } });
Object.defineProperty(exports, "requireSuperAdmin", { enumerable: true, get: function () { return middleware_1.requireSuperAdmin; } });
Object.defineProperty(exports, "requireTenantId", { enumerable: true, get: function () { return middleware_1.requireTenantId; } });
Object.defineProperty(exports, "requireDauth", { enumerable: true, get: function () { return middleware_1.requireDauth; } });
Object.defineProperty(exports, "requireOwnershipOf", { enumerable: true, get: function () { return middleware_1.requireOwnershipOf; } });
var dauth_ports_1 = require("./dauth-ports");
Object.defineProperty(exports, "LegacyClaimAuthzEvaluator", { enumerable: true, get: function () { return dauth_ports_1.LegacyClaimAuthzEvaluator; } });
Object.defineProperty(exports, "setAuthzEvaluator", { enumerable: true, get: function () { return dauth_ports_1.setAuthzEvaluator; } });
Object.defineProperty(exports, "getAuthzEvaluator", { enumerable: true, get: function () { return dauth_ports_1.getAuthzEvaluator; } });
Object.defineProperty(exports, "resetAuthzEvaluator", { enumerable: true, get: function () { return dauth_ports_1.resetAuthzEvaluator; } });
var dauth_ports_2 = require("./dauth-ports");
Object.defineProperty(exports, "InvalidTokenError", { enumerable: true, get: function () { return dauth_ports_2.InvalidTokenError; } });
var native_token_verifier_1 = require("./adapters/native-token-verifier");
Object.defineProperty(exports, "NativeTokenVerifier", { enumerable: true, get: function () { return native_token_verifier_1.NativeTokenVerifier; } });
var keycloak_token_verifier_1 = require("./adapters/keycloak-token-verifier");
Object.defineProperty(exports, "KeycloakTokenVerifier", { enumerable: true, get: function () { return keycloak_token_verifier_1.KeycloakTokenVerifier; } });
var bootstrap_1 = require("./bootstrap");
Object.defineProperty(exports, "bootstrapDauth", { enumerable: true, get: function () { return bootstrap_1.bootstrapDauth; } });
Object.defineProperty(exports, "getLastDauthBootstrapResult", { enumerable: true, get: function () { return bootstrap_1.getLastDauthBootstrapResult; } });
Object.defineProperty(exports, "getDauthSecretsAdapter", { enumerable: true, get: function () { return bootstrap_1.getDauthSecretsAdapter; } });
var config_safety_1 = require("./config-safety");
Object.defineProperty(exports, "assertDauthConfigSafe", { enumerable: true, get: function () { return config_safety_1.assertDauthConfigSafe; } });
Object.defineProperty(exports, "verifyDivergenceClean", { enumerable: true, get: function () { return config_safety_1.verifyDivergenceClean; } });
var token_verifier_factory_1 = require("./token-verifier-factory");
Object.defineProperty(exports, "initTokenVerifierFactory", { enumerable: true, get: function () { return token_verifier_factory_1.initTokenVerifierFactory; } });
Object.defineProperty(exports, "registerKeycloakVerifier", { enumerable: true, get: function () { return token_verifier_factory_1.registerKeycloakVerifier; } });
Object.defineProperty(exports, "getTokenVerifier", { enumerable: true, get: function () { return token_verifier_factory_1.getTokenVerifier; } });
Object.defineProperty(exports, "resetTokenVerifierFactory", { enumerable: true, get: function () { return token_verifier_factory_1.resetTokenVerifierFactory; } });
// ── DAuth decision ledger (Part 3, DAuth-ECP-COMPLETE) ──
// Shape-correct writer for the live `platform_dauth.authz_decision_log` schema after
// migration 011_dauth_enterprise_ledger.sql. See
// packages/dos-auth/src/audit/decision-ledger.ts for history.
var decision_ledger_1 = require("./audit/decision-ledger");
Object.defineProperty(exports, "writeAuthDecision", { enumerable: true, get: function () { return decision_ledger_1.writeAuthDecision; } });
Object.defineProperty(exports, "readAuthDecision", { enumerable: true, get: function () { return decision_ledger_1.readAuthDecision; } });
var native_rebac_adapter_1 = require("./adapters/native-rebac.adapter");
Object.defineProperty(exports, "NativeRebacAdapter", { enumerable: true, get: function () { return native_rebac_adapter_1.NativeRebacAdapter; } });
var openfga_rebac_adapter_1 = require("./adapters/openfga-rebac.adapter");
Object.defineProperty(exports, "OpenFgaRebacAdapter", { enumerable: true, get: function () { return openfga_rebac_adapter_1.OpenFgaRebacAdapter; } });
var rebac_factory_1 = require("./rebac-factory");
Object.defineProperty(exports, "initRebacFactory", { enumerable: true, get: function () { return rebac_factory_1.initRebacFactory; } });
Object.defineProperty(exports, "getRebacAdapter", { enumerable: true, get: function () { return rebac_factory_1.getRebacAdapter; } });
Object.defineProperty(exports, "resetRebacFactory", { enumerable: true, get: function () { return rebac_factory_1.resetRebacFactory; } });
var abac_port_1 = require("./dauth-ports/abac.port");
Object.defineProperty(exports, "AbstainAbacAdapter", { enumerable: true, get: function () { return abac_port_1.AbstainAbacAdapter; } });
var cerbos_abac_adapter_1 = require("./adapters/cerbos-abac.adapter");
Object.defineProperty(exports, "CerbosAbacAdapter", { enumerable: true, get: function () { return cerbos_abac_adapter_1.CerbosAbacAdapter; } });
// ── Keycloak Admin-API write client (dual-write on register / hire / fire) ──
// Uses a narrow-scoped service account with `manage-users` — separate from
// the read-only client used by KeycloakIdentityAdapter. buildDefaultKeycloakAdminClient
// returns null if env config is absent so consumers degrade to DAuth-only.
var keycloak_admin_client_1 = require("./adapters/keycloak-admin-client");
Object.defineProperty(exports, "KeycloakAdminClient", { enumerable: true, get: function () { return keycloak_admin_client_1.KeycloakAdminClient; } });
Object.defineProperty(exports, "buildDefaultKeycloakAdminClient", { enumerable: true, get: function () { return keycloak_admin_client_1.buildDefaultKeycloakAdminClient; } });
// ── Keycloak ROPC (backend login) client + shared payload mapper ──
// The login client mints RS256 access tokens via `dauth-login` ROPC for
// `/api/auth/login`. The payload mapper projects KC claims onto the DOS
// AuthPayload shape consumers expect.
var keycloak_login_client_1 = require("./adapters/keycloak-login-client");
Object.defineProperty(exports, "KeycloakLoginClient", { enumerable: true, get: function () { return keycloak_login_client_1.KeycloakLoginClient; } });
Object.defineProperty(exports, "KeycloakGrantError", { enumerable: true, get: function () { return keycloak_login_client_1.KeycloakGrantError; } });
Object.defineProperty(exports, "buildDefaultKeycloakLoginClient", { enumerable: true, get: function () { return keycloak_login_client_1.buildDefaultKeycloakLoginClient; } });
var keycloak_payload_mapper_1 = require("./adapters/keycloak-payload.mapper");
Object.defineProperty(exports, "buildKeycloakPayloadMapper", { enumerable: true, get: function () { return keycloak_payload_mapper_1.buildKeycloakPayloadMapper; } });
Object.defineProperty(exports, "MissingTenantClaimError", { enumerable: true, get: function () { return keycloak_payload_mapper_1.MissingTenantClaimError; } });
var secrets_port_1 = require("./dauth-ports/secrets.port");
Object.defineProperty(exports, "EnvSecretsAdapter", { enumerable: true, get: function () { return secrets_port_1.EnvSecretsAdapter; } });
var vault_secrets_adapter_1 = require("./adapters/vault-secrets.adapter");
Object.defineProperty(exports, "VaultSecretsAdapter", { enumerable: true, get: function () { return vault_secrets_adapter_1.VaultSecretsAdapter; } });
Object.defineProperty(exports, "buildDefaultSecretsAdapter", { enumerable: true, get: function () { return vault_secrets_adapter_1.buildDefaultSecretsAdapter; } });
var abac_factory_1 = require("./abac-factory");
Object.defineProperty(exports, "initAbacFactory", { enumerable: true, get: function () { return abac_factory_1.initAbacFactory; } });
Object.defineProperty(exports, "getAbacAdapter", { enumerable: true, get: function () { return abac_factory_1.getAbacAdapter; } });
Object.defineProperty(exports, "resetAbacFactory", { enumerable: true, get: function () { return abac_factory_1.resetAbacFactory; } });
var rebac_check_1 = require("./access/rebac-check");
Object.defineProperty(exports, "checkRebacAndLog", { enumerable: true, get: function () { return rebac_check_1.checkRebacAndLog; } });
var canonical_middleware_1 = require("./canonical-middleware");
Object.defineProperty(exports, "createCanonicalAuthMiddleware", { enumerable: true, get: function () { return canonical_middleware_1.createCanonicalAuthMiddleware; } });
var key_store_1 = require("./key-store");
Object.defineProperty(exports, "getActiveSigningKey", { enumerable: true, get: function () { return key_store_1.getActiveSigningKey; } });
Object.defineProperty(exports, "getKeyByKid", { enumerable: true, get: function () { return key_store_1.getKeyByKid; } });
Object.defineProperty(exports, "listKeys", { enumerable: true, get: function () { return key_store_1.listKeys; } });
Object.defineProperty(exports, "rotateSigningKey", { enumerable: true, get: function () { return key_store_1.rotateSigningKey; } });
Object.defineProperty(exports, "revokeKey", { enumerable: true, get: function () { return key_store_1.revokeKey; } });
Object.defineProperty(exports, "invalidateKeyCache", { enumerable: true, get: function () { return key_store_1.invalidateKeyCache; } });
var index_1 = require("./lifecycle/index");
Object.defineProperty(exports, "evaluateLifecycleTransition", { enumerable: true, get: function () { return index_1.evaluateLifecycleTransition; } });
Object.defineProperty(exports, "setLifecycleAuthPort", { enumerable: true, get: function () { return index_1.setLifecycleAuthPort; } });
Object.defineProperty(exports, "getLifecycleAuthPort", { enumerable: true, get: function () { return index_1.getLifecycleAuthPort; } });
var actor_registry_1 = require("./actor/actor-registry");
Object.defineProperty(exports, "getActor", { enumerable: true, get: function () { return actor_registry_1.getActor; } });
Object.defineProperty(exports, "registerActor", { enumerable: true, get: function () { return actor_registry_1.registerActor; } });
var jwt_rotation_1 = require("./jwt-rotation");
Object.defineProperty(exports, "generateToken", { enumerable: true, get: function () { return jwt_rotation_1.generateToken; } });
Object.defineProperty(exports, "verifyToken", { enumerable: true, get: function () { return jwt_rotation_1.verifyToken; } });
Object.defineProperty(exports, "rotateKeysManually", { enumerable: true, get: function () { return jwt_rotation_1.rotateKeysManually; } });
// W2 — Agent / service-account credential store
var agent_credentials_service_1 = require("./actor/agent-credentials.service");
Object.defineProperty(exports, "issueAgentCredential", { enumerable: true, get: function () { return agent_credentials_service_1.issueAgentCredential; } });
Object.defineProperty(exports, "verifyAgentCredential", { enumerable: true, get: function () { return agent_credentials_service_1.verifyAgentCredential; } });
Object.defineProperty(exports, "revokeAgentCredential", { enumerable: true, get: function () { return agent_credentials_service_1.revokeAgentCredential; } });
Object.defineProperty(exports, "listAgentCredentials", { enumerable: true, get: function () { return agent_credentials_service_1.listAgentCredentials; } });
Object.defineProperty(exports, "rotateAgentCredential", { enumerable: true, get: function () { return agent_credentials_service_1.rotateAgentCredential; } });
// W2 — Principal-context middleware (for withTenantClient actor binding)
var principal_context_middleware_1 = require("./middleware/principal-context.middleware");
Object.defineProperty(exports, "getPrincipalContextFromRequest", { enumerable: true, get: function () { return principal_context_middleware_1.getPrincipalContextFromRequest; } });
Object.defineProperty(exports, "attachPrincipalContext", { enumerable: true, get: function () { return principal_context_middleware_1.attachPrincipalContext; } });
// W2 — Agent-aware SOD engine
var agent_sod_engine_1 = require("./sod/agent-sod-engine");
Object.defineProperty(exports, "evaluateAgentSod", { enumerable: true, get: function () { return agent_sod_engine_1.evaluateAgentSod; } });
// SoD HTTP gate — front-edge middleware. The full decision-engine path
// (with ledger writes) still runs downstream; this is only the request
// admission check used by routes that want a hard SoD block before the
// handler executes.
var sod_clearance_middleware_1 = require("./middleware/sod-clearance.middleware");
Object.defineProperty(exports, "requireSodClearance", { enumerable: true, get: function () { return sod_clearance_middleware_1.requireSodClearance; } });
var jwt_issuer_1 = require("./jwt-issuer");
Object.defineProperty(exports, "issueAccessToken", { enumerable: true, get: function () { return jwt_issuer_1.issueAccessToken; } });
Object.defineProperty(exports, "issueRefreshToken", { enumerable: true, get: function () { return jwt_issuer_1.issueRefreshToken; } });
// Re-export the low-level jsonwebtoken API for edge cases that need a
// custom signing key (e.g. notification-service's SSE ticket uses its
// own SSE_STREAM_KEY rather than the platform JWT secret). Downstream
// services import { jwt } from '@dos/dauth-shared' so contract-boundary tests
// can enforce "no direct jsonwebtoken imports" without forcing the
// full generateToken/verifyToken abstraction on every caller.
exports.jwt = __importStar(require("jsonwebtoken"));
function isUserEmailVerified(row) {
    return row?.email_verified === true || row?.email_verified_at != null;
}
exports.DAUTH_VERSION = '1.0.0';
exports.DAUTH_CONCERNS = [
    'access',
    'authority',
    'delegation',
    'lifecycle-auth',
    'scope',
    'session',
    'sod',
];
//# sourceMappingURL=index.js.map