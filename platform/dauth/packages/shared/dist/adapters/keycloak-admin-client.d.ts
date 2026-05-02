/**
 * Keycloak Admin-API write client — the narrow-scoped write surface that
 * DAuth is allowed to use when it needs to push identity state INTO
 * Keycloak (register → create user, fire → disable + logout-all, tenant
 * onboarding → create group).
 *
 * Why separate from `KeycloakIdentityAdapter` (read/sync):
 * - Different service-account roles per KEYCLOAK-REALM-MAPPING.md §Service
 *   accounts: `dauth-admin` reads (`view-users`, `query-users`); this write
 *   client should use a separate narrow client with `manage-users` scope.
 * - Consumers differ: identity adapter is called from login / sync cron;
 *   this client is called from register / hire / fire / onboarding flows.
 *
 * Failure policy: every write method throws on non-2xx. Callers catch and
 * decide compensation — DAuth's row commits first, Keycloak push is best
 * effort with a replayable outbox event ([dauth.kc.sync_pending]).
 *
 * SHADOW-safe: constructors fail loudly if secrets missing, so a half-baked
 * config cannot accidentally start dual-writes to a fake realm.
 */
export interface KeycloakAdminClientOptions {
    /** Required. Keycloak base URL (e.g. `http://127.0.0.1:8180`). */
    baseUrl: string;
    /** Required. Realm name (e.g. `dogan`). */
    realm: string;
    /** Required. Client id of the narrow write service account. */
    clientId: string;
    /** Required. Client secret, loaded from `/etc/keycloak/keycloak.env` or Vault. */
    clientSecret: string;
    /** Per-call timeout. Defaults to 3s — Admin API is not a hot path. */
    timeoutMs?: number;
    fetchImpl?: typeof fetch;
    log?: {
        info?: (msg: string, meta?: Record<string, unknown>) => void;
        warn?: (msg: string, meta?: Record<string, unknown>) => void;
        error?: (msg: string, meta?: Record<string, unknown>) => void;
    };
}
export interface KeycloakUserPayload {
    /** Required. Used as Keycloak `username`. */
    email: string;
    firstName?: string;
    lastName?: string;
    /** When unset, email is used. */
    username?: string;
    /** Defaults to true. */
    enabled?: boolean;
    emailVerified?: boolean;
    /** Arbitrary attributes (e.g. `tenantId`, `dauth_user_id`). */
    attributes?: Record<string, string | string[]>;
    /** If provided, a temporary password is set post-create. */
    temporaryPassword?: string;
}
export interface KeycloakGroupPayload {
    name: string;
    /** Parent group path without the name (e.g. `/tenants`). When set the
     *  group is created as a subgroup of the named parent. */
    parentPath?: string;
    attributes?: Record<string, string | string[]>;
}
export declare class KeycloakAdminClient {
    private readonly baseUrl;
    private readonly realm;
    private readonly clientId;
    private readonly clientSecret;
    private readonly timeoutMs;
    private readonly fetchImpl;
    private readonly log;
    private adminToken;
    constructor(opts: KeycloakAdminClientOptions);
    /**
     * Create a Keycloak user. Returns the user id assigned by Keycloak.
     * Idempotent on email: if a user with that email already exists, returns
     * that existing id instead of erroring (dual-write replay safety).
     */
    createUser(payload: KeycloakUserPayload): Promise<{
        userId: string;
        created: boolean;
    }>;
    findUserByEmail(email: string): Promise<{
        id: string;
        enabled: boolean;
    } | null>;
    /** Set a user's password. `temporary=true` forces reset on next login. */
    setTemporaryPassword(userId: string, password: string, temporary?: boolean): Promise<void>;
    /**
     * Disable a Keycloak user AND revoke all their sessions.
     * This is the "fire" primitive — both operations must succeed so the
     * fired user cannot continue using an already-issued access token.
     */
    disableUserAndLogout(userId: string): Promise<void>;
    /**
     * Create a group at the given parent path. Idempotent: if a group with the
     * same name already exists under that parent, returns the existing id.
     * Parent path defaults to realm root (/).
     */
    createGroup(payload: KeycloakGroupPayload): Promise<{
        groupId: string;
        created: boolean;
    }>;
    /** Resolve a group path like `/tenants/acme` to its Keycloak group id. */
    findGroupIdByPath(path: string): Promise<string | null>;
    /** Add a user to a group. Idempotent — Keycloak returns 204 either way. */
    addUserToGroup(userId: string, groupId: string): Promise<void>;
    /** Assign a realm-level role to a user by role name. */
    assignRealmRole(userId: string, roleName: string): Promise<void>;
    /**
     * List realm-level roles. Used by the role-sync job to reconcile Keycloak
     * realm roles into DAuth `functional_roles`. Service-account client must
     * have `view-realm` or `manage-realm` scope.
     */
    listRealmRoles(): Promise<Array<{
        id: string;
        name: string;
        description?: string;
    }>>;
    /** Create a realm role if it doesn't already exist. */
    ensureRealmRole(name: string, description?: string): Promise<void>;
    private fetch;
    private getAdminToken;
}
/**
 * Factory — returns a client instance when env config is present, else null.
 * Callers treat null as "Keycloak writes disabled — DAuth-only mode".
 */
export declare function buildDefaultKeycloakAdminClient(): KeycloakAdminClient | null;
