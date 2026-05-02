/**
 * Native IdentityAdapter — the default. Treats the DAuth `users` table as
 * the source of truth. `linkPrincipal` resolves a user by email; auto-
 * provisioning is NOT the adapter's job — that flows through invitation /
 * onboarding and must create the user with a tenant and role set. If the
 * email is unknown, `linkPrincipal` returns `{ userId: '', created: false }`
 * and the caller (typically the login orchestrator) is expected to reject
 * the login or trigger an invitation flow.
 */
import { validateTenantMembership } from '../../identity/identity.service';
import type { ExternalPrincipal, IdentityAdapter, IdentityLinkResult, SyncResult } from '../../ports/identity.port';
export declare class NativeIdentityAdapter implements IdentityAdapter {
    readonly name: "native";
    linkPrincipal(principal: ExternalPrincipal): Promise<IdentityLinkResult>;
    syncAll(_tenantId: string): Promise<SyncResult>;
}
export { validateTenantMembership };
export declare const nativeIdentityAdapter: NativeIdentityAdapter;
