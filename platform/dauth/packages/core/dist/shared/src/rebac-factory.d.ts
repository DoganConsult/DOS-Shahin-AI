/**
 * ReBAC factory. Mirrors the TokenVerifier factory: consumer projects
 * inject config at bootstrap; `getRebacAdapter()` returns the currently-
 * resolved `{ primary, shadow? }` stack based on env flags.
 *
 * When `DAUTH_OPENFGA_ENFORCE=true` AND an OpenFGA config is present,
 * primary = OpenFgaRebacAdapter. Otherwise primary = NativeRebacAdapter
 * (pass-through allow). The shadow slot lets us run OpenFGA beside native
 * without flipping the decision — useful during Part 5 soak.
 *
 * Rollback: unset `DAUTH_OPENFGA_ENFORCE` and restart. Cached state is
 * process-local.
 */
import type { RebacAdapter } from './dauth-ports/rebac.port';
import { type OpenFgaRebacOptions } from './adapters/openfga-rebac.adapter';
export interface RebacStack {
    primary: RebacAdapter;
    shadow?: RebacAdapter;
}
export interface InitRebacFactoryOptions {
    /**
     * OpenFGA config. When omitted, the factory stays in native-only mode
     * even if DAUTH_OPENFGA_ENFORCE=true — i.e. missing config is treated
     * like the flag being off. A loud warning is logged via `onMissingConfig`.
     */
    openfga?: OpenFgaRebacOptions;
    /** Optional warning callback when enforce=true but config is missing. */
    onMissingConfig?: (reason: string) => void;
}
export declare function initRebacFactory(opts?: InitRebacFactoryOptions): void;
export declare function getRebacAdapter(): RebacStack;
export declare function resetRebacFactory(): void;
