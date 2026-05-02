/**
 * Native IdentityAdapter — the default. Treats the DAuth `users` table as
 * the source of truth. `linkPrincipal` resolves a user by email; auto-
 * provisioning is NOT the adapter's job — that flows through invitation /
 * onboarding and must create the user with a tenant and role set. If the
 * email is unknown, `linkPrincipal` returns `{ userId: '', created: false }`
 * and the caller (typically the login orchestrator) is expected to reject
 * the login or trigger an invitation flow.
 */
import { resolvePrincipalByEmail, validateTenantMembership } from '../../identity/identity.service';
import type {
  ExternalPrincipal,
  IdentityAdapter,
  IdentityLinkResult,
  SyncResult,
} from '../../ports/identity.port';

export class NativeIdentityAdapter implements IdentityAdapter {
  readonly name = 'native' as const;

  async linkPrincipal(principal: ExternalPrincipal): Promise<IdentityLinkResult> {
    const existing = await resolvePrincipalByEmail(principal.email);
    if (!existing) {
      return { userId: '', created: false, tenantMemberships: [] };
    }
    return {
      userId: existing.userId,
      created: false,
      tenantMemberships: [],
    };
  }

  async syncAll(_tenantId: string): Promise<SyncResult> {
    return {
      usersProcessed: 0,
      created: 0,
      updated: 0,
      deactivated: 0,
      errors: [],
    };
  }
}

// Reference kept explicit so callers of the adapter can still reach membership
// validation via `dauth.identity.validateTenantMembership` if needed.
export { validateTenantMembership };

export const nativeIdentityAdapter = new NativeIdentityAdapter();
