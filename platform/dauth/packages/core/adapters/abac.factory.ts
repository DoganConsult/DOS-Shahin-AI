/**
 * ABAC adapter factory. Same shape as the token-verifier / identity factory:
 * returns `{ primary, shadow }`. Shadow adapter runs in parallel and its
 * verdict is attached to the decision ledger under `engineResults.<name>`,
 * never overriding the primary.
 */
import { logger } from '@dos/platform-core/observability';
import type { AbacAdapter } from '../ports/abac.port';
import { DAUTH_CONFIG } from '../dauth.config';
import { NativeAbacAdapter } from './native/native-abac.adapter';
import { CerbosAbacAdapter } from './cerbos/cerbos.adapter';

export interface AbacStack {
  primary: AbacAdapter;
  shadow?: AbacAdapter;
}

let cached: AbacStack | null = null;

export function getAbacAdapters(): AbacStack {
  if (cached) return cached;

  const native = new NativeAbacAdapter();
  let cerbos: AbacAdapter | null = null;

  if (DAUTH_CONFIG.cerbos.shadow || DAUTH_CONFIG.cerbos.enforce) {
    try {
      cerbos = new CerbosAbacAdapter();
    } catch (err) {
      logger.error('[DAuth:ABAC] Cerbos adapter unavailable — falling back to native', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (DAUTH_CONFIG.cerbos.enforce && cerbos) {
    cached = {
      primary: cerbos,
      shadow: DAUTH_CONFIG.cerbos.shadow ? native : undefined,
    };
  } else if (DAUTH_CONFIG.cerbos.shadow && cerbos) {
    cached = { primary: native, shadow: cerbos };
  } else {
    cached = { primary: native };
  }

  return cached;
}

/** Reset factory cache — for tests and hot config reloads. */
export function resetAbacFactory(): void {
  cached = null;
}
