/**
 * ABAC adapter factory — same shape as token-verifier-factory and rebac-factory.
 * Returns `{ primary, shadow }`. Shadow runs in parallel, verdict recorded in
 * the decision ledger under `engineResults.<name>`, never overriding primary.
 *
 * Promotion path:
 *   1. `DAUTH_CERBOS_SHADOW=true` → native primary, Cerbos shadow
 *   2. Soak ≥ 2 cycles with zero divergence (assertDauthConfigSafe guards this)
 *   3. `DAUTH_CERBOS_ENFORCE=true` → Cerbos primary, native shadow (fallback)
 */
import type { AbacAdapter } from './dauth-ports/abac.port';
import { AbstainAbacAdapter } from './dauth-ports/abac.port';

export interface AbacStack {
  primary: AbacAdapter;
  shadow?: AbacAdapter;
}

export interface InitAbacFactoryOptions {
  /**
   * Project-supplied native adapter (platform/core's `NativeAbacAdapter`).
   * Optional — defaults to `AbstainAbacAdapter` which always returns abstain.
   * Services running the full 14-step pipeline should pass their own.
   */
  native?: AbacAdapter;
  /**
   * Cerbos adapter, constructed by the caller from env config. When omitted,
   * the factory returns native-only.
   */
  cerbos?: AbacAdapter;
  /** Shadow mode: native leads, cerbos shadows. */
  shadow?: boolean;
  /** Enforce mode: cerbos leads, native shadows. */
  enforce?: boolean;
}

let cached: AbacStack | null = null;

export function initAbacFactory(options: InitAbacFactoryOptions = {}): AbacStack {
  const native = options.native ?? new AbstainAbacAdapter();
  const cerbos = options.cerbos;
  const shadow = options.shadow ?? false;
  const enforce = options.enforce ?? false;

  if (enforce && cerbos) {
    cached = {
      primary: cerbos,
      shadow: shadow ? native : undefined,
    };
  } else if (shadow && cerbos) {
    cached = { primary: native, shadow: cerbos };
  } else {
    cached = { primary: native };
  }

  return cached;
}

export function getAbacAdapter(): AbacStack {
  if (!cached) {
    cached = { primary: new AbstainAbacAdapter() };
  }
  return cached;
}

export function resetAbacFactory(): void {
  cached = null;
}
