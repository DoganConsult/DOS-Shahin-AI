import type { DosNavDisabledReason } from '@dos/ui-contracts';
/**
 * PlatformReadinessService — DNA-only readiness probe.
 *
 * Probes `GET /api/health/<dna-module-code>` per platform DNA module.
 * Result feeds the nav resolver's tier-aware filter pipeline:
 *   - tier === 'dna' nav items use this for backend-offline / route-not-wired.
 *   - tier === 'module' (tenant-entitled) and tier === 'product' do NOT use it.
 *
 * Foundation gets `/api/health/foundation` today. DAuth/DNOC/DSOC/DOS/AI follow
 * the same convention as their endpoints land. 1.5s per-probe timeout, 404 → 'down'.
 */
export declare class PlatformReadinessService {
    private readonly http;
    private readonly _health;
    readonly health: import("@angular/core").Signal<Record<string, "unknown" | "up" | "down">>;
    /** Per-DNA-module readiness flag. */
    ready(moduleCode: string, hasRouteCatalog: boolean): boolean;
    /** Disabled reason for a DNA nav item, or null when ready. */
    disabledReason(moduleCode: string, hasRouteCatalog: boolean): DosNavDisabledReason | null;
    /** Probe every DNA module in the registry. Idempotent on per-call. */
    probeAll(modules: readonly string[]): Promise<void>;
    private probeOne;
}
