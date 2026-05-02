/**
 * Identity adapter factory — returns { primary, shadow } based on flags.
 * Mirrors the token-verifier factory so caller code can treat both the same.
 *
 * Default: native only. When Keycloak is shadowed/enforced, the Keycloak
 * adapter is constructed and either placed as primary (enforce) or shadow
 * (shadow-only).
 */
import { logger } from '@dos/platform-core/observability';
import type { IdentityAdapter } from '../ports/identity.port';
import { DAUTH_CONFIG } from '../dauth.config';
import { NativeIdentityAdapter } from './native/native-identity.adapter';
import {
  KeycloakIdentityAdapter,
  type KeycloakIdentityOptions,
} from './keycloak/keycloak-identity.adapter';

export interface IdentityStack {
  primary: IdentityAdapter;
  shadow?: IdentityAdapter;
}

let cached: IdentityStack | null = null;

export interface IdentityFactoryOptions {
  /** How to resolve the `iam_connections.connection_id` for a tenant. */
  connectionIdForTenant?: (tenantId: string) => Promise<string>;
  /** Override for tests. */
  keycloakOptions?: Partial<KeycloakIdentityOptions>;
}

export function getIdentityAdapters(opts: IdentityFactoryOptions = {}): IdentityStack {
  if (cached) return cached;

  const native = new NativeIdentityAdapter();
  let keycloak: IdentityAdapter | null = null;

  if (DAUTH_CONFIG.keycloak.shadow || DAUTH_CONFIG.keycloak.enforce) {
    try {
      if (!opts.connectionIdForTenant) {
        throw new Error(
          'connectionIdForTenant is required when Keycloak is shadowed/enforced',
        );
      }
      keycloak = new KeycloakIdentityAdapter({
        connectionIdForTenant: opts.connectionIdForTenant,
        ...opts.keycloakOptions,
      });
    } catch (err) {
      logger.error('[DAuth:Identity] Keycloak adapter unavailable — falling back to native', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (DAUTH_CONFIG.keycloak.enforce && keycloak) {
    cached = {
      primary: keycloak,
      shadow: DAUTH_CONFIG.keycloak.shadow ? native : undefined,
    };
  } else if (DAUTH_CONFIG.keycloak.shadow && keycloak) {
    cached = { primary: native, shadow: keycloak };
  } else {
    cached = { primary: native };
  }

  return cached;
}

/** Reset factory cache — for tests and hot config reloads. */
export function resetIdentityFactory(): void {
  cached = null;
}
