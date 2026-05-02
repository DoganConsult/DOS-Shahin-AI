/**
 * Identity port — abstracts identity resolution / provisioning from an external
 * IdP (Keycloak) so DAuth can map `keycloak_user_id → dauth_user_id` and
 * pull profile updates on login.
 *
 * DAuth keeps tenant membership, onboarding state, entitlements. The IdP only
 * owns authentication, MFA, password policy, email verification.
 */
export interface ExternalPrincipal {
    /** IdP-native user id (sub claim in Keycloak). */
    externalId: string;
    /** IdP that issued this principal. */
    provider: 'keycloak' | 'okta' | 'azure-ad' | 'custom' | 'native';
    email: string;
    emailVerified: boolean;
    displayName?: string;
    /** IdP-reported groups/roles — used by RBAC sync, not by the decision engine. */
    groups?: string[];
    roles?: string[];
    /** Arbitrary claims the IdP asserts — forwarded into `AccessDecisionContext.attributes`. */
    claims?: Record<string, unknown>;
}
export interface IdentityLinkResult {
    /** DAuth-local user id — the canonical identifier for the rest of the platform. */
    userId: string;
    /** Whether this principal already existed or was provisioned now. */
    created: boolean;
    /** Tenant ids the user has an active membership in. */
    tenantMemberships: string[];
}
export interface SyncResult {
    usersProcessed: number;
    created: number;
    updated: number;
    deactivated: number;
    errors: Array<{
        externalId: string;
        reason: string;
    }>;
}
export interface IdentityAdapter {
    readonly name: 'native' | 'keycloak' | 'custom';
    /**
     * Resolve an external principal to a DAuth user. If the user does not exist
     * and the adapter is configured for auto-provision, create the local record.
     * Callers MUST still validate tenant membership via
     * `identity.service.ts#validateTenantMembership` — this adapter only
     * guarantees the `users` row exists.
     */
    linkPrincipal(principal: ExternalPrincipal): Promise<IdentityLinkResult>;
    /**
     * Bulk sync principals from the IdP. Used for periodic reconciliation and
     * initial migration. Write failures must not halt the entire batch.
     */
    syncAll(tenantId: string): Promise<SyncResult>;
}
