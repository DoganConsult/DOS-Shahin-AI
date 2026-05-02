import type { ExternalPrincipal, IdentityAdapter, IdentityLinkResult, SyncResult } from '../../ports/identity.port';
export interface KeycloakAdminCredentials {
    baseUrl: string;
    realm: string;
    clientId: string;
    clientSecret: string;
}
export interface KeycloakIdentityOptions {
    /** Admin-API credentials — required for syncAll, optional for linkPrincipal. */
    admin?: KeycloakAdminCredentials;
    /** Tenant→connection map. Usually one connection per realm per tenant. */
    connectionIdForTenant: (tenantId: string) => Promise<string>;
    fetchImpl?: typeof fetch;
}
export declare class KeycloakIdentityAdapter implements IdentityAdapter {
    private readonly options;
    readonly name: "keycloak";
    private adminToken;
    constructor(options: KeycloakIdentityOptions);
    linkPrincipal(principal: ExternalPrincipal): Promise<IdentityLinkResult>;
    syncAll(tenantId: string): Promise<SyncResult>;
    private getAdminToken;
}
/**
 * Default factory — reads env config and returns an adapter instance.
 * Throws if Keycloak is not configured.
 */
export declare function buildDefaultKeycloakIdentityAdapter(connectionIdForTenant: (tenantId: string) => Promise<string>): KeycloakIdentityAdapter;
