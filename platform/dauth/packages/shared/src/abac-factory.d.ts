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
export declare function initAbacFactory(options?: InitAbacFactoryOptions): AbacStack;
export declare function getAbacAdapter(): AbacStack;
export declare function resetAbacFactory(): void;
