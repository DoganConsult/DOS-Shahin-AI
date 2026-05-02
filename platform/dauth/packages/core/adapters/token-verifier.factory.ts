/**
 * TokenVerifier factory — resolves the correct verifier based on
 * `DAUTH_CONFIG.keycloak.shadow` / `.enforce` flags.
 *
 * Behavior:
 * - enforce + shadow OFF:       native only
 * - enforce OFF + shadow ON:    native authoritative, keycloak runs in parallel
 * - enforce ON  + shadow ON:    keycloak authoritative, native runs in parallel
 * - enforce ON  + shadow OFF:   keycloak authoritative, no shadow comparison
 *
 * The caller invokes `primary` for the authoritative verdict. When a shadow
 * verifier is configured, the caller is expected to invoke `shadow` in
 * parallel and record the delta on the decision ledger.
 */
import { logger } from '@dos/platform-core/observability';
import type { TokenVerifier } from '../ports/token-verifier.port';
import { DAUTH_CONFIG } from '../dauth.config';
import { NativeTokenVerifier } from './native/native-token-verifier';
import { KeycloakTokenVerifier } from './keycloak/keycloak-token-verifier';

let cachedPrimary: TokenVerifier | null = null;
let cachedShadow: TokenVerifier | null | undefined;

export interface VerifierStack {
  primary: TokenVerifier;
  shadow?: TokenVerifier;
}

export function getTokenVerifiers(): VerifierStack {
  if (!cachedPrimary) {
    const native = new NativeTokenVerifier();
    let keycloak: TokenVerifier | null = null;
    if (DAUTH_CONFIG.keycloak.shadow || DAUTH_CONFIG.keycloak.enforce) {
      try {
        keycloak = new KeycloakTokenVerifier();
      } catch (err) {
        // Missing config — log and leave Keycloak disabled. Callers fall back
        // to native. This keeps boot from crashing when the Keycloak config
        // is still being provisioned.
        logger.error('[DAuth:TokenVerifier] Keycloak verifier unavailable', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (DAUTH_CONFIG.keycloak.enforce && keycloak) {
      cachedPrimary = keycloak;
      cachedShadow = DAUTH_CONFIG.keycloak.shadow ? native : undefined;
    } else if (DAUTH_CONFIG.keycloak.shadow && keycloak) {
      cachedPrimary = native;
      cachedShadow = keycloak;
    } else {
      cachedPrimary = native;
      cachedShadow = undefined;
    }
  }
  return { primary: cachedPrimary, shadow: cachedShadow ?? undefined };
}

/** Reset factory cache — for tests and hot config reloads. */
export function resetTokenVerifierFactory(): void {
  cachedPrimary = null;
  cachedShadow = undefined;
}
