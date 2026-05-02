import type { IdentityAdapter } from '../ports/identity.port';
import { type KeycloakIdentityOptions } from './keycloak/keycloak-identity.adapter';
export interface IdentityStack {
    primary: IdentityAdapter;
    shadow?: IdentityAdapter;
}
export interface IdentityFactoryOptions {
    /** How to resolve the `iam_connections.connection_id` for a tenant. */
    connectionIdForTenant?: (tenantId: string) => Promise<string>;
    /** Override for tests. */
    keycloakOptions?: Partial<KeycloakIdentityOptions>;
}
export declare function getIdentityAdapters(opts?: IdentityFactoryOptions): IdentityStack;
/** Reset factory cache — for tests and hot config reloads. */
export declare function resetIdentityFactory(): void;
