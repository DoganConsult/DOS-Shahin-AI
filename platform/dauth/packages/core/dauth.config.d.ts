/**
 * DAuth centralized configuration.
 * All tunable constants in one place — overridable via environment variables.
 * Services import from here instead of defining local constants.
 */
export declare const DAUTH_CONFIG: {
    /** Hours of grace before expired delegations are cleaned up. */
    readonly delegationGraceHours: number;
    /** Hours of idle time before a session is considered stale. */
    readonly sessionMaxIdleHours: number;
    /** Hours before a pending invitation expires. */
    readonly invitationExpiryHours: number;
    /** Maximum users to scan per SoD periodic scan batch. */
    readonly sodScanLimit: number;
    /** Maximum failed login attempts before account lockout. */
    readonly maxFailedLoginAttempts: number;
    /** Minutes to lock an account after max failures reached. */
    readonly lockoutDurationMinutes: number;
    /** Failed attempts before CAPTCHA is required. */
    readonly captchaThreshold: number;
    /** Timeout (ms) for fetching login context (roles, membership). */
    readonly loginContextTimeoutMs: number;
    /** Timeout (ms) for optional authz snapshot build during login. */
    readonly optionalAuthzTimeoutMs: number;
    /** TTL (ms) for role-permission lookup cache. */
    readonly rolePermissionCacheTtlMs: number;
    /** TTL (seconds) for principal resolution cache. */
    readonly principalCacheTtlSeconds: number;
    /** TTL (ms) for access snapshot cache. */
    readonly snapshotCacheTtlMs: number;
    /** TTL (ms) for decision engine cache. */
    readonly decisionCacheTtlMs: number;
    /** Max entries in decision engine cache. */
    readonly decisionCacheMaxEntries: number;
    /** TTL (ms) for admin role resolver cache. */
    readonly adminRoleCacheTtlMs: number;
    /** Maximum concurrent sessions per user. */
    readonly maxConcurrentSessions: number;
    readonly keycloak: {
        readonly shadow: boolean;
        readonly enforce: boolean;
        readonly baseUrl: string;
        readonly realm: string;
        readonly clientId: string;
        readonly jwksUrl: string;
        readonly issuer: string;
        readonly audience: string;
        readonly jwksCacheTtlMs: number;
    };
    readonly cerbos: {
        readonly shadow: boolean;
        readonly enforce: boolean;
        readonly pdpUrl: string;
        readonly tlsEnabled: boolean;
        readonly timeoutMs: number;
    };
    readonly openfga: {
        readonly shadow: boolean;
        readonly enforce: boolean;
        readonly apiUrl: string;
        readonly storeId: string;
        readonly modelId: string;
        readonly timeoutMs: number;
    };
    readonly vault: {
        readonly enabled: boolean;
        readonly addr: string;
        readonly mount: string;
        readonly tokenEnv: string;
    };
    readonly decisionLedger: {
        readonly enabled: boolean;
    };
    readonly policySimulation: {
        readonly enabled: boolean;
    };
    readonly accessReplay: {
        readonly enabled: boolean;
    };
    readonly rls: {
        readonly enabled: boolean;
        readonly failClosedInProd: boolean;
    };
};
/**
 * Guard — call at bootstrap to ensure dangerous combinations are rejected.
 * Currently:
 *   - ENFORCE without SHADOW is refused unless an override is set
 *   - Production boot with RLS disabled is refused
 */
export declare function assertDauthConfigSafe(): void;
