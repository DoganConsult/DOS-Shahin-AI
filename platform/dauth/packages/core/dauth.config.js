"use strict";
/**
 * DAuth centralized configuration.
 * All tunable constants in one place — overridable via environment variables.
 * Services import from here instead of defining local constants.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DAUTH_CONFIG = void 0;
exports.assertDauthConfigSafe = assertDauthConfigSafe;
function envInt(key, fallback) {
    const v = process.env[key];
    return v ? parseInt(v, 10) : fallback;
}
function envBool(key, fallback) {
    const v = process.env[key];
    if (v === undefined || v === '')
        return fallback;
    return v === '1' || v.toLowerCase() === 'true';
}
function envStr(key, fallback) {
    const v = process.env[key];
    return v && v.length > 0 ? v : fallback;
}
// ── Job Scheduling ───────────────────────────────────────────────
exports.DAUTH_CONFIG = {
    /** Hours of grace before expired delegations are cleaned up. */
    delegationGraceHours: envInt('DAUTH_DELEGATION_GRACE_HOURS', 0),
    /** Hours of idle time before a session is considered stale. */
    sessionMaxIdleHours: envInt('DAUTH_SESSION_MAX_IDLE_HOURS', 24),
    /** Hours before a pending invitation expires. */
    invitationExpiryHours: envInt('DAUTH_INVITATION_EXPIRY_HOURS', 72),
    /** Maximum users to scan per SoD periodic scan batch. */
    sodScanLimit: envInt('DAUTH_SOD_SCAN_LIMIT', 500),
    // ── Login Protection ─────────────────────────────────────────
    /** Maximum failed login attempts before account lockout. */
    maxFailedLoginAttempts: envInt('DAUTH_MAX_FAILED_LOGINS', 10),
    /** Minutes to lock an account after max failures reached. */
    lockoutDurationMinutes: envInt('DAUTH_LOCKOUT_MINUTES', 30),
    /** Failed attempts before CAPTCHA is required. */
    captchaThreshold: envInt('DAUTH_CAPTCHA_THRESHOLD', 5),
    // ── Auth Orchestrator ────────────────────────────────────────
    /** Timeout (ms) for fetching login context (roles, membership). */
    loginContextTimeoutMs: envInt('DAUTH_LOGIN_CONTEXT_TIMEOUT_MS', 1200),
    /** Timeout (ms) for optional authz snapshot build during login. */
    optionalAuthzTimeoutMs: envInt('DAUTH_OPTIONAL_AUTHZ_TIMEOUT_MS', 700),
    // ── Cache TTLs ───────────────────────────────────────────────
    /** TTL (ms) for role-permission lookup cache. */
    rolePermissionCacheTtlMs: envInt('DAUTH_ROLE_PERM_CACHE_TTL_MS', 300_000),
    /** TTL (seconds) for principal resolution cache. */
    principalCacheTtlSeconds: envInt('DAUTH_PRINCIPAL_CACHE_TTL_S', 300),
    /** TTL (ms) for access snapshot cache. */
    snapshotCacheTtlMs: envInt('DAUTH_SNAPSHOT_CACHE_TTL_MS', 30_000),
    /** TTL (ms) for decision engine cache. */
    decisionCacheTtlMs: envInt('DAUTH_DECISION_CACHE_TTL_MS', 60_000),
    /** Max entries in decision engine cache. */
    decisionCacheMaxEntries: envInt('DAUTH_DECISION_CACHE_MAX', 200),
    /** TTL (ms) for admin role resolver cache. */
    adminRoleCacheTtlMs: envInt('DAUTH_ADMIN_ROLE_CACHE_TTL_MS', 120_000),
    /** Maximum concurrent sessions per user. */
    maxConcurrentSessions: envInt('DAUTH_MAX_CONCURRENT_SESSIONS', 5),
    // ── Enterprise Stack feature flags ──────────────────────────────
    //
    // Defaults: Keycloak (token verify) and OpenFGA (ReBAC) are AUTHORITATIVE
    // under DAuth. Native DAuth path is retained as SHADOW + automatic fallback
    // when the external adapter is unavailable (missing config / network /
    // adapter throw). Cerbos remains OFF until rolled in.
    //
    // `<ENGINE>_SHADOW` — adapter (or native, when adapter leads) runs in
    //   parallel for ledger comparison; no effect on the live decision.
    // `<ENGINE>_ENFORCE` — adapter is authoritative. Native DAuth path becomes
    //   the fallback triggered only when the adapter is unavailable.
    //
    // Golden rule: ENFORCE requires SHADOW to have run clean for ≥ 2 cycles.
    // Enabling ENFORCE without SHADOW is a config error and will be rejected at
    // bootstrap by `assertDauthConfigSafe()`.
    keycloak: {
        shadow: envBool('DAUTH_KEYCLOAK_SHADOW', true),
        enforce: envBool('DAUTH_KEYCLOAK_ENFORCE', true),
        baseUrl: envStr('KEYCLOAK_BASE_URL', ''),
        realm: envStr('KEYCLOAK_REALM', ''),
        clientId: envStr('KEYCLOAK_CLIENT_ID', ''),
        jwksUrl: envStr('KEYCLOAK_JWKS_URL', ''),
        issuer: envStr('KEYCLOAK_ISSUER', ''),
        audience: envStr('KEYCLOAK_AUDIENCE', ''),
        jwksCacheTtlMs: envInt('KEYCLOAK_JWKS_CACHE_TTL_MS', 600_000),
    },
    cerbos: {
        shadow: envBool('DAUTH_CERBOS_SHADOW', false),
        enforce: envBool('DAUTH_CERBOS_ENFORCE', false),
        pdpUrl: envStr('CERBOS_PDP_URL', ''),
        tlsEnabled: envBool('CERBOS_TLS_ENABLED', false),
        timeoutMs: envInt('CERBOS_TIMEOUT_MS', 250),
    },
    openfga: {
        shadow: envBool('DAUTH_OPENFGA_SHADOW', true),
        enforce: envBool('DAUTH_OPENFGA_ENFORCE', true),
        apiUrl: envStr('OPENFGA_API_URL', ''),
        storeId: envStr('OPENFGA_STORE_ID', ''),
        modelId: envStr('OPENFGA_MODEL_ID', ''),
        timeoutMs: envInt('OPENFGA_TIMEOUT_MS', 250),
    },
    vault: {
        enabled: envBool('DAUTH_VAULT_ENABLED', false),
        addr: envStr('VAULT_ADDR', ''),
        mount: envStr('VAULT_MOUNT', 'secret'),
        tokenEnv: envStr('VAULT_TOKEN_ENV', 'VAULT_TOKEN'),
    },
    decisionLedger: {
        enabled: envBool('DAUTH_DECISION_LEDGER_ENABLED', true),
    },
    policySimulation: {
        enabled: envBool('DAUTH_POLICY_SIMULATION_ENABLED', true),
    },
    accessReplay: {
        enabled: envBool('DAUTH_ACCESS_REPLAY_ENABLED', true),
    },
    rls: {
        enabled: envBool('RLS_ENABLED', true),
        failClosedInProd: envBool('DAUTH_RLS_FAIL_CLOSED', true),
    },
};
/**
 * Guard — call at bootstrap to ensure dangerous combinations are rejected.
 * Currently:
 *   - ENFORCE without SHADOW is refused unless an override is set
 *   - Production boot with RLS disabled is refused
 */
function assertDauthConfigSafe() {
    const isProd = process.env.NODE_ENV === 'production';
    const override = process.env.DAUTH_ALLOW_UNSAFE_CONFIG === 'true';
    const unsafe = [];
    if (exports.DAUTH_CONFIG.keycloak.enforce && !exports.DAUTH_CONFIG.keycloak.shadow && !override) {
        unsafe.push('DAUTH_KEYCLOAK_ENFORCE=true without DAUTH_KEYCLOAK_SHADOW=true first');
    }
    if (exports.DAUTH_CONFIG.cerbos.enforce && !exports.DAUTH_CONFIG.cerbos.shadow && !override) {
        unsafe.push('DAUTH_CERBOS_ENFORCE=true without DAUTH_CERBOS_SHADOW=true first');
    }
    if (exports.DAUTH_CONFIG.openfga.enforce && !exports.DAUTH_CONFIG.openfga.shadow && !override) {
        unsafe.push('DAUTH_OPENFGA_ENFORCE=true without DAUTH_OPENFGA_SHADOW=true first');
    }
    if (isProd && !exports.DAUTH_CONFIG.rls.enabled && !override) {
        unsafe.push('RLS_ENABLED=false in production');
    }
    if (unsafe.length > 0) {
        throw new Error(`[DAuth] Unsafe configuration detected:\n  - ${unsafe.join('\n  - ')}\n` +
            `Set DAUTH_ALLOW_UNSAFE_CONFIG=true to acknowledge (not recommended in prod).`);
    }
}
//# sourceMappingURL=dauth.config.js.map