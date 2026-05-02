"use strict";
/**
 * Shared Keycloak → DAuth AuthPayload mapper.
 *
 * Extracted so every service that calls `bootstrapDauth()` (auth-service,
 * gateway, workflow-service, …) uses the same claim-mapping logic. Drift
 * between services was the failure mode we eliminate here.
 *
 * Contract:
 *   - Input: the raw decoded Keycloak access-token payload
 *     (`Record<string, unknown>`) — already signature-verified by
 *     `KeycloakTokenVerifier`.
 *   - Output: a `MinimalAuthPayload`-compatible object with the DOS
 *     project-specific claims populated when present.
 *
 * Contract strictness (ENFORCE mode):
 *   - `dos_tenant_id` MUST be present (protocol mapper in
 *     `scripts/keycloak/provision-realm.mjs` ensures every token has it).
 *   - If missing and `DAUTH_KEYCLOAK_ENFORCE=true`, the mapper throws
 *     `MissingTenantClaimError` — the middleware treats this as an
 *     authentication failure and returns 401.
 *
 * Claim sources (in priority order):
 *   tenantId    ← dos_tenant_id > tenant_id > tenantId > first role matching /^tenant:/
 *   userId      ← dos_user_id > sub
 *   email       ← email > preferred_username
 *   role        ← dos_role_profile > first non-default realm role > 'user'
 *   roles       ← realm_access.roles ∪ resource_access[<audience>].roles
 *   workspaceId ← dos_workspace_id
 *   roleProfile ← dos_role_profile
 *   jti         ← jti
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissingTenantClaimError = void 0;
exports.buildKeycloakPayloadMapper = buildKeycloakPayloadMapper;
class MissingTenantClaimError extends Error {
    constructor(message) {
        super(message);
        this.name = 'MissingTenantClaimError';
    }
}
exports.MissingTenantClaimError = MissingTenantClaimError;
function asString(v) {
    if (typeof v === 'string' && v.length > 0)
        return v;
    return undefined;
}
function asStringArray(v) {
    if (!Array.isArray(v))
        return [];
    return v.filter((x) => typeof x === 'string');
}
function extractRealmRoles(raw) {
    const realmAccess = raw.realm_access;
    if (!realmAccess || typeof realmAccess !== 'object')
        return [];
    const roles = realmAccess.roles;
    return asStringArray(roles);
}
function extractResourceRoles(raw, audience) {
    if (!audience)
        return [];
    const resourceAccess = raw.resource_access;
    if (!resourceAccess || typeof resourceAccess !== 'object')
        return [];
    const client = resourceAccess[audience];
    if (!client || typeof client !== 'object')
        return [];
    return asStringArray(client.roles);
}
const DEFAULT_NOISE_ROLES = new Set([
    'offline_access',
    'uma_authorization',
    'default-roles-dogan',
    'default-roles-master',
]);
function pickPrimaryRole(roles, fallback) {
    const significant = roles.find((r) => !r.startsWith('tenant:') && !r.startsWith('default-roles-') && !DEFAULT_NOISE_ROLES.has(r));
    return significant ?? fallback ?? 'user';
}
function pickTenantId(raw, realmRoles) {
    return (asString(raw.dos_tenant_id) ??
        asString(raw.tenant_id) ??
        asString(raw.tenantId) ??
        (() => {
            const prefixed = realmRoles.find((r) => r.startsWith('tenant:'));
            return prefixed ? prefixed.slice('tenant:'.length) : undefined;
        })());
}
/**
 * Build a KC → DosAuthPayload mapper closure suitable for passing to
 * `KeycloakTokenVerifier.payloadMapper` or `bootstrapDauth({ keycloakPayloadMapper })`.
 */
function buildKeycloakPayloadMapper(opts = {}) {
    const audience = opts.resourceAudience ?? process.env.KEYCLOAK_AUDIENCE ?? process.env.KEYCLOAK_TARGET_AUDIENCE;
    const requireTenant = opts.requireTenantClaim ?? true;
    return (raw) => {
        const realmRoles = extractRealmRoles(raw);
        const resourceRoles = extractResourceRoles(raw, audience);
        const allRoles = Array.from(new Set([...realmRoles, ...resourceRoles]));
        const userId = asString(raw.dos_user_id) ?? asString(raw.sub);
        if (!userId) {
            throw new MissingTenantClaimError('[KC-mapper] token missing both dos_user_id and sub — cannot resolve principal');
        }
        const tenantId = pickTenantId(raw, realmRoles);
        if (!tenantId && requireTenant) {
            throw new MissingTenantClaimError('[KC-mapper] token missing dos_tenant_id and no tenant: role present — reject');
        }
        const email = asString(raw.email) ?? asString(raw.preferred_username) ?? `${userId}@unknown`;
        const roleProfile = asString(raw.dos_role_profile);
        const role = pickPrimaryRole(allRoles, roleProfile);
        const payload = {
            userId,
            email,
            tenantId: tenantId ?? '',
            role,
            roles: allRoles,
            jti: asString(raw.jti),
            name: asString(raw.name) ?? asString(raw.given_name) ?? asString(raw.preferred_username),
            principalType: 'human',
        };
        const workspaceId = asString(raw.dos_workspace_id);
        if (workspaceId)
            payload.workspaceId = workspaceId;
        if (roleProfile)
            payload.role_profile = roleProfile;
        // Super-admin flag: we treat realm role 'platform_admin' as the super-admin
        // marker per the provisioning script's base role set.
        if (allRoles.includes('platform_admin'))
            payload.is_super_admin = true;
        // Tenant-owner flag: a principal with dos_role_profile='tenant_admin' (set
        // by the callback bootstrap on first login) or realm role 'tenant_admin'
        // is the owner of THEIR tenant only — tenantId in the token is already
        // scoped to their tenant, and the canonical middleware's tenant-isolation
        // gate rejects cross-tenant requests before requirePermission() runs, so
        // surfacing this flag does not grant any platform-wide authority.
        if (roleProfile === 'tenant_admin' || allRoles.includes('tenant_admin')) {
            payload.is_tenant_owner = true;
        }
        return payload;
    };
}
//# sourceMappingURL=keycloak-payload.mapper.js.map