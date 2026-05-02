/**
 * ReBAC adapter factory — same shape as ABAC factory.
 * Primary + optional shadow. Defaults to native only.
 */
import { logger } from '@dos/platform-core/observability';
import type { RebacAdapter } from '../ports/rebac.port';
import { DAUTH_CONFIG } from '../dauth.config';
import { NativeRebacAdapter } from './native/native-rebac.adapter';
import { OpenFgaRebacAdapter } from './openfga/openfga.adapter';

export interface RebacStack {
  primary: RebacAdapter;
  shadow?: RebacAdapter;
}

let cached: RebacStack | null = null;

export function getRebacAdapters(): RebacStack {
  if (cached) return cached;
  const native = new NativeRebacAdapter();
  let openfga: RebacAdapter | null = null;

  if (DAUTH_CONFIG.openfga.shadow || DAUTH_CONFIG.openfga.enforce) {
    try {
      openfga = new OpenFgaRebacAdapter();
    } catch (err) {
      logger.error('[DAuth:ReBAC] OpenFGA adapter unavailable — falling back to native', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (DAUTH_CONFIG.openfga.enforce && openfga) {
    cached = { primary: openfga, shadow: DAUTH_CONFIG.openfga.shadow ? native : undefined };
  } else if (DAUTH_CONFIG.openfga.shadow && openfga) {
    cached = { primary: native, shadow: openfga };
  } else {
    cached = { primary: native };
  }
  return cached;
}

export function resetRebacFactory(): void {
  cached = null;
}
