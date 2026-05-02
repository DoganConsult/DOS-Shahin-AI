"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeycloakAdminClient = void 0;
exports.buildDefaultKeycloakAdminClient = buildDefaultKeycloakAdminClient;
class KeycloakAdminClient {
    baseUrl;
    realm;
    clientId;
    clientSecret;
    timeoutMs;
    fetchImpl;
    log;
    adminToken = null;
    constructor(opts) {
        if (!opts.baseUrl)
            throw new Error('[DAuth:KeycloakAdmin] baseUrl is required');
        if (!opts.realm)
            throw new Error('[DAuth:KeycloakAdmin] realm is required');
        if (!opts.clientId)
            throw new Error('[DAuth:KeycloakAdmin] clientId is required');
        if (!opts.clientSecret)
            throw new Error('[DAuth:KeycloakAdmin] clientSecret is required');
        this.baseUrl = opts.baseUrl.replace(/\/$/, '');
        this.realm = opts.realm;
        this.clientId = opts.clientId;
        this.clientSecret = opts.clientSecret;
        this.timeoutMs = opts.timeoutMs ?? 3000;
        const f = opts.fetchImpl ?? globalThis.fetch;
        if (!f)
            throw new Error('[DAuth:KeycloakAdmin] no fetch impl available');
        this.fetchImpl = f;
        this.log = {
            info: opts.log?.info ?? (() => { }),
            warn: opts.log?.warn ?? ((m, meta) => console.warn(m, meta ?? {})),
            error: opts.log?.error ?? ((m, meta) => console.error(m, meta ?? {})),
        };
    }
    /**
     * Create a Keycloak user. Returns the user id assigned by Keycloak.
     * Idempotent on email: if a user with that email already exists, returns
     * that existing id instead of erroring (dual-write replay safety).
     */
    async createUser(payload) {
        const existing = await this.findUserByEmail(payload.email);
        if (existing) {
            this.log.info('[DAuth:KeycloakAdmin] createUser idempotent skip — user exists', {
                email: payload.email,
                userId: existing.id,
            });
            return { userId: existing.id, created: false };
        }
        const body = {
            username: payload.username ?? payload.email,
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            enabled: payload.enabled ?? true,
            emailVerified: payload.emailVerified ?? false,
            attributes: payload.attributes,
        };
        const res = await this.fetch('POST', `/admin/realms/${encodeURIComponent(this.realm)}/users`, body);
        if (res.status !== 201) {
            const text = await res.text();
            throw new Error(`[DAuth:KeycloakAdmin] createUser failed: ${res.status} ${text}`);
        }
        // Keycloak returns the new user id via the Location header only.
        const location = res.headers.get('location') ?? '';
        const userId = location.split('/').pop() ?? '';
        if (!userId) {
            throw new Error('[DAuth:KeycloakAdmin] createUser succeeded but Location header missing id');
        }
        this.log.info('[DAuth:KeycloakAdmin] user created', { email: payload.email, userId });
        if (payload.temporaryPassword) {
            await this.setTemporaryPassword(userId, payload.temporaryPassword);
        }
        return { userId, created: true };
    }
    async findUserByEmail(email) {
        const url = `/admin/realms/${encodeURIComponent(this.realm)}/users?email=${encodeURIComponent(email)}&exact=true`;
        const res = await this.fetch('GET', url);
        if (!res.ok)
            return null;
        const list = (await res.json());
        if (!list.length)
            return null;
        return { id: list[0].id, enabled: list[0].enabled ?? true };
    }
    /** Set a user's password. `temporary=true` forces reset on next login. */
    async setTemporaryPassword(userId, password, temporary = true) {
        const res = await this.fetch('PUT', `/admin/realms/${encodeURIComponent(this.realm)}/users/${encodeURIComponent(userId)}/reset-password`, { type: 'password', value: password, temporary });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`[DAuth:KeycloakAdmin] setTemporaryPassword failed: ${res.status} ${text}`);
        }
    }
    /**
     * Disable a Keycloak user AND revoke all their sessions.
     * This is the "fire" primitive — both operations must succeed so the
     * fired user cannot continue using an already-issued access token.
     */
    async disableUserAndLogout(userId) {
        const disableRes = await this.fetch('PUT', `/admin/realms/${encodeURIComponent(this.realm)}/users/${encodeURIComponent(userId)}`, { enabled: false });
        if (!disableRes.ok) {
            const text = await disableRes.text();
            throw new Error(`[DAuth:KeycloakAdmin] disableUser failed: ${disableRes.status} ${text}`);
        }
        const logoutRes = await this.fetch('POST', `/admin/realms/${encodeURIComponent(this.realm)}/users/${encodeURIComponent(userId)}/logout`);
        if (!logoutRes.ok) {
            const text = await logoutRes.text();
            // Disable succeeded — logout failure downgraded to warn. Access tokens
            // expire in 15 min (realm default) so sessions close naturally.
            this.log.warn('[DAuth:KeycloakAdmin] logout-all after disable failed', {
                userId,
                status: logoutRes.status,
                body: text,
            });
        }
        this.log.info('[DAuth:KeycloakAdmin] user disabled + logout-all', { userId });
    }
    /**
     * Create a group at the given parent path. Idempotent: if a group with the
     * same name already exists under that parent, returns the existing id.
     * Parent path defaults to realm root (/).
     */
    async createGroup(payload) {
        const parentPath = payload.parentPath ?? '';
        let parentId = null;
        if (parentPath) {
            parentId = await this.findGroupIdByPath(parentPath);
            if (!parentId) {
                throw new Error(`[DAuth:KeycloakAdmin] parent group not found: ${parentPath}`);
            }
        }
        // Idempotent check — does a child named `payload.name` already exist?
        const fullPath = `${parentPath}/${payload.name}`.replace(/^\/+/, '/');
        const existing = await this.findGroupIdByPath(fullPath);
        if (existing) {
            return { groupId: existing, created: false };
        }
        const body = { name: payload.name, attributes: payload.attributes };
        const url = parentId
            ? `/admin/realms/${encodeURIComponent(this.realm)}/groups/${encodeURIComponent(parentId)}/children`
            : `/admin/realms/${encodeURIComponent(this.realm)}/groups`;
        const res = await this.fetch('POST', url, body);
        if (res.status !== 201) {
            const text = await res.text();
            throw new Error(`[DAuth:KeycloakAdmin] createGroup failed: ${res.status} ${text}`);
        }
        const location = res.headers.get('location') ?? '';
        const groupId = location.split('/').pop() ?? '';
        if (!groupId)
            throw new Error('[DAuth:KeycloakAdmin] createGroup: missing Location id');
        this.log.info('[DAuth:KeycloakAdmin] group created', { path: fullPath, groupId });
        return { groupId, created: true };
    }
    /** Resolve a group path like `/tenants/acme` to its Keycloak group id. */
    async findGroupIdByPath(path) {
        const normalized = path.startsWith('/') ? path : `/${path}`;
        const res = await this.fetch('GET', `/admin/realms/${encodeURIComponent(this.realm)}/group-by-path/${normalized.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/')}`);
        if (res.status === 404)
            return null;
        if (!res.ok)
            return null;
        const body = (await res.json());
        return body.id ?? null;
    }
    /** Add a user to a group. Idempotent — Keycloak returns 204 either way. */
    async addUserToGroup(userId, groupId) {
        const res = await this.fetch('PUT', `/admin/realms/${encodeURIComponent(this.realm)}/users/${encodeURIComponent(userId)}/groups/${encodeURIComponent(groupId)}`);
        if (!res.ok && res.status !== 204) {
            const text = await res.text();
            throw new Error(`[DAuth:KeycloakAdmin] addUserToGroup failed: ${res.status} ${text}`);
        }
    }
    /** Assign a realm-level role to a user by role name. */
    async assignRealmRole(userId, roleName) {
        const roleRes = await this.fetch('GET', `/admin/realms/${encodeURIComponent(this.realm)}/roles/${encodeURIComponent(roleName)}`);
        if (!roleRes.ok) {
            const text = await roleRes.text();
            throw new Error(`[DAuth:KeycloakAdmin] realm role not found: ${roleName} (${roleRes.status} ${text})`);
        }
        const role = (await roleRes.json());
        const assignRes = await this.fetch('POST', `/admin/realms/${encodeURIComponent(this.realm)}/users/${encodeURIComponent(userId)}/role-mappings/realm`, [{ id: role.id, name: role.name }]);
        if (!assignRes.ok && assignRes.status !== 204) {
            const text = await assignRes.text();
            throw new Error(`[DAuth:KeycloakAdmin] assignRealmRole failed: ${assignRes.status} ${text}`);
        }
    }
    /**
     * List realm-level roles. Used by the role-sync job to reconcile Keycloak
     * realm roles into DAuth `functional_roles`. Service-account client must
     * have `view-realm` or `manage-realm` scope.
     */
    async listRealmRoles() {
        const res = await this.fetch('GET', `/admin/realms/${encodeURIComponent(this.realm)}/roles?briefRepresentation=true&max=500`);
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`[DAuth:KeycloakAdmin] listRealmRoles failed: ${res.status} ${text}`);
        }
        const body = (await res.json());
        return Array.isArray(body) ? body : [];
    }
    /** Create a realm role if it doesn't already exist. */
    async ensureRealmRole(name, description) {
        const check = await this.fetch('GET', `/admin/realms/${encodeURIComponent(this.realm)}/roles/${encodeURIComponent(name)}`);
        if (check.ok)
            return;
        const res = await this.fetch('POST', `/admin/realms/${encodeURIComponent(this.realm)}/roles`, {
            name,
            description,
        });
        if (res.status !== 201 && res.status !== 409) {
            const text = await res.text();
            throw new Error(`[DAuth:KeycloakAdmin] ensureRealmRole failed: ${res.status} ${text}`);
        }
    }
    async fetch(method, path, body) {
        const token = await this.getAdminToken();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
            return await this.fetchImpl(`${this.baseUrl}${path}`, {
                method,
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: body === undefined ? undefined : JSON.stringify(body),
                signal: controller.signal,
            });
        }
        finally {
            clearTimeout(timer);
        }
    }
    async getAdminToken() {
        if (this.adminToken && Date.now() < this.adminToken.expiresAt - 30_000) {
            return this.adminToken.value;
        }
        const body = new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: this.clientId,
            client_secret: this.clientSecret,
        });
        const res = await this.fetchImpl(`${this.baseUrl}/realms/${encodeURIComponent(this.realm)}/protocol/openid-connect/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
        });
        if (!res.ok) {
            throw new Error(`[DAuth:KeycloakAdmin] admin token fetch failed: ${res.status}`);
        }
        const payload = (await res.json());
        this.adminToken = {
            value: payload.access_token,
            expiresAt: Date.now() + payload.expires_in * 1000,
        };
        return payload.access_token;
    }
}
exports.KeycloakAdminClient = KeycloakAdminClient;
/**
 * Factory — returns a client instance when env config is present, else null.
 * Callers treat null as "Keycloak writes disabled — DAuth-only mode".
 */
function buildDefaultKeycloakAdminClient() {
    // Service-to-service Admin-API calls must use the internal URL when the
    // public host (KEYCLOAK_BASE_URL = https://auth.shahin-ai.com) is not
    // reachable from inside the platform (DNS/routing only resolves the public
    // hostname for browsers). KEYCLOAK_INTERNAL_BASE_URL is the canonical
    // internal endpoint (typically http://127.0.0.1:8180); fall back to the
    // public KEYCLOAK_BASE_URL only when the internal one is not set.
    const baseUrl = process.env.KEYCLOAK_INTERNAL_BASE_URL ??
        process.env.KEYCLOAK_BASE_URL;
    const realm = process.env.KEYCLOAK_REALM;
    const clientId = process.env.KEYCLOAK_ADMIN_WRITE_CLIENT_ID ??
        process.env.KEYCLOAK_ADMIN_CLIENT_ID ??
        process.env.KEYCLOAK_CLIENT_ID;
    const clientSecret = process.env.KEYCLOAK_ADMIN_WRITE_CLIENT_SECRET ??
        process.env.KEYCLOAK_ADMIN_CLIENT_SECRET;
    if (!baseUrl || !realm || !clientId || !clientSecret)
        return null;
    return new KeycloakAdminClient({ baseUrl, realm, clientId, clientSecret });
}
//# sourceMappingURL=keycloak-admin-client.js.map