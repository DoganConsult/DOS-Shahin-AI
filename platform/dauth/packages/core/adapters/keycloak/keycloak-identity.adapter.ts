/**
 * Keycloak IdentityAdapter — links Keycloak principals to local DAuth users.
 *
 * Responsibilities:
 * - `linkPrincipal`: given a verified Keycloak token's claims, ensure a local
 *   DAuth `users` row exists, upsert `iam_identities` so we can find the user
 *   by Keycloak sub next time, and return the local userId.
 * - `syncAll`: bulk reconciliation — pulls the realm's user list via
 *   Keycloak Admin API and updates / deactivates local users accordingly.
 *
 * Admin-API calls are authenticated with a Keycloak service account (client
 * credentials grant). The token is cached until ~30s before expiry.
 *
 * This adapter does NOT own tenant membership, entitlements, or onboarding
 * state — those remain DAuth-owned. Keycloak only asserts identity.
 */
import { logger } from '@dos/platform-core/observability';
import {
  resolvePrincipalByEmail,
  resolvePrincipalMinimal,
} from '../../identity/identity.service';
import {
  linkIamIdentity,
  logIamSync,
} from '../../identity/iam-integration.service';
import type {
  ExternalPrincipal,
  IdentityAdapter,
  IdentityLinkResult,
  SyncResult,
} from '../../ports/identity.port';
import { DAUTH_CONFIG } from '../../dauth.config';

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

export class KeycloakIdentityAdapter implements IdentityAdapter {
  readonly name = 'keycloak' as const;
  private adminToken: { value: string; expiresAt: number } | null = null;

  constructor(private readonly options: KeycloakIdentityOptions) {}

  async linkPrincipal(principal: ExternalPrincipal): Promise<IdentityLinkResult> {
    if (principal.provider !== 'keycloak') {
      logger.warn('[DAuth:KeycloakIdentity] linkPrincipal called with non-keycloak provider', {
        provider: principal.provider,
      });
    }

    const user = await resolvePrincipalByEmail(principal.email);
    if (!user) {
      // User unknown to DAuth — we do NOT auto-provision here. DAuth users
      // must be created through the invitation / onboarding flow so they
      // receive a tenant and role. Returning `created: false` + empty userId
      // signals the caller (login orchestrator) to reject or kick off
      // invitation.
      return { userId: '', created: false, tenantMemberships: [] };
    }

    // Preserve the Keycloak sub → local userId mapping for every active
    // tenant this user participates in.
    try {
      const memberships = await collectActiveMemberships(user.userId);
      for (const tenantId of memberships) {
        const connectionId = await this.options.connectionIdForTenant(tenantId);
        await linkIamIdentity(
          tenantId,
          connectionId,
          user.userId,
          principal.externalId,
          principal.email,
        );
      }
      return { userId: user.userId, created: false, tenantMemberships: memberships };
    } catch (err) {
      logger.error('[DAuth:KeycloakIdentity] linkIamIdentity failed', {
        userId: user.userId,
        error: err instanceof Error ? err.message : String(err),
      });
      return { userId: user.userId, created: false, tenantMemberships: [] };
    }
  }

  async syncAll(tenantId: string): Promise<SyncResult> {
    const admin = this.options.admin;
    if (!admin) {
      throw new Error('[DAuth:KeycloakIdentity] syncAll requires admin credentials');
    }
    const connectionId = await this.options.connectionIdForTenant(tenantId);
    const fetchFn = this.options.fetchImpl ?? globalThis.fetch;
    if (!fetchFn) {
      throw new Error('[DAuth:KeycloakIdentity] no fetch impl available');
    }

    const token = await this.getAdminToken(fetchFn, admin);
    const result: SyncResult = {
      usersProcessed: 0,
      created: 0,
      updated: 0,
      deactivated: 0,
      errors: [],
    };

    // Paginated fetch.
    let first = 0;
    const max = 200;
    while (true) {
      const res = await fetchFn(
        `${admin.baseUrl.replace(/\/$/, '')}/admin/realms/${encodeURIComponent(admin.realm)}/users?first=${first}&max=${max}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) {
        const body = await res.text();
        result.errors.push({ externalId: `(page ${first})`, reason: `${res.status}: ${body}` });
        break;
      }
      const users = (await res.json()) as KeycloakUserRecord[];
      if (!users.length) break;

      for (const u of users) {
        result.usersProcessed++;
        try {
          if (!u.email) continue;
          const existing = await resolvePrincipalByEmail(u.email);
          if (!existing) {
            // Keycloak has a user DAuth does not. We do not auto-create —
            // that must flow through invitation/onboarding. Report as a
            // skip, not an error.
            result.errors.push({
              externalId: u.id,
              reason: 'unknown to DAuth — requires invitation flow',
            });
            continue;
          }
          await linkIamIdentity(tenantId, connectionId, existing.userId, u.id, u.email);
          result.updated++;
          if (u.enabled === false) {
            // Record the intent — the caller's reconciliation job maps this
            // into `users.status = 'inactive'` once SoD and review gates pass.
            result.deactivated++;
          }
        } catch (err) {
          result.errors.push({
            externalId: u.id,
            reason: err instanceof Error ? err.message : String(err),
          });
        }
      }

      if (users.length < max) break;
      first += max;
    }

    await logIamSync(
      tenantId,
      connectionId,
      result.errors.length === 0 ? 'success' : 'partial',
      result.usersProcessed,
      result.errors,
    );
    return result;
  }

  private async getAdminToken(
    fetchFn: typeof fetch,
    admin: KeycloakAdminCredentials,
  ): Promise<string> {
    if (this.adminToken && Date.now() < this.adminToken.expiresAt - 30_000) {
      return this.adminToken.value;
    }
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: admin.clientId,
      client_secret: admin.clientSecret,
    });
    const res = await fetchFn(
      `${admin.baseUrl.replace(/\/$/, '')}/realms/${encodeURIComponent(admin.realm)}/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      },
    );
    if (!res.ok) {
      throw new Error(`[DAuth:KeycloakIdentity] admin token fetch failed: ${res.status}`);
    }
    const payload = (await res.json()) as { access_token: string; expires_in: number };
    this.adminToken = {
      value: payload.access_token,
      expiresAt: Date.now() + payload.expires_in * 1000,
    };
    return payload.access_token;
  }
}

interface KeycloakUserRecord {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  enabled?: boolean;
  emailVerified?: boolean;
}

async function collectActiveMemberships(userId: string): Promise<string[]> {
  // Minimal lookup: which tenants does this user have active membership in?
  // We reuse `resolvePrincipalMinimal` to confirm the user exists, then query
  // the `tenant_user_memberships` table via a raw safe-query kept local to
  // this module (not elevated to identity.service to avoid widening its
  // surface for a Keycloak-specific concern).
  const present = await resolvePrincipalMinimal(userId);
  if (!present) return [];
  const { safeQuery } = await import('@dos/db');
  const res = await safeQuery(
    `SELECT tenant_id FROM public.tenant_user_memberships
     WHERE user_id = $1 AND status = 'active'`,
    [userId],
  );
  return res.rows.map((r: { tenant_id: string }) => r.tenant_id);
}

/**
 * Default factory — reads env config and returns an adapter instance.
 * Throws if Keycloak is not configured.
 */
export function buildDefaultKeycloakIdentityAdapter(
  connectionIdForTenant: (tenantId: string) => Promise<string>,
): KeycloakIdentityAdapter {
  const baseUrl = DAUTH_CONFIG.keycloak.baseUrl;
  const realm = DAUTH_CONFIG.keycloak.realm;
  if (!baseUrl || !realm) {
    throw new Error('[DAuth:KeycloakIdentity] KEYCLOAK_BASE_URL and KEYCLOAK_REALM are required');
  }
  const clientId = DAUTH_CONFIG.keycloak.clientId;
  const clientSecret = process.env.KEYCLOAK_ADMIN_CLIENT_SECRET ?? '';
  return new KeycloakIdentityAdapter({
    admin: clientSecret
      ? { baseUrl, realm, clientId, clientSecret }
      : undefined,
    connectionIdForTenant,
  });
}
