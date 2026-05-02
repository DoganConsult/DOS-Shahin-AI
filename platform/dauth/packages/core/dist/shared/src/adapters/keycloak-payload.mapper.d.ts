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
import type { MinimalAuthPayload } from '../dauth-ports/token-verifier.port';
export declare class MissingTenantClaimError extends Error {
    constructor(message: string);
}
/** Extra fields the DOS services expect on top of MinimalAuthPayload. */
export interface DosAuthPayload extends MinimalAuthPayload {
    role_profile?: string;
    role_code?: string;
    workspaceId?: string;
    roles?: string[];
    is_super_admin?: boolean;
    principalType?: 'human' | 'agent' | 'service_account' | 'external';
    name?: string;
}
export interface KeycloakPayloadMapperOptions {
    /** Client id whose resource_access.roles should be merged into `roles`. */
    resourceAudience?: string;
    /**
     * When true (default) and `dos_tenant_id` is missing in the token, throw.
     * Set false for services that tolerate missing tenant context (e.g. a
     * public-health endpoint verifier); the platform default is true.
     */
    requireTenantClaim?: boolean;
}
/**
 * Build a KC → DosAuthPayload mapper closure suitable for passing to
 * `KeycloakTokenVerifier.payloadMapper` or `bootstrapDauth({ keycloakPayloadMapper })`.
 */
export declare function buildKeycloakPayloadMapper(opts?: KeycloakPayloadMapperOptions): (raw: Record<string, unknown>) => DosAuthPayload;
