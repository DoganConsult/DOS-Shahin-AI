import { type CarbonIconEntry, type CarbonIconName, type CarbonIconSize } from '../allowlists/carbon-icons.allowlist';
export interface CarbonIconResolution {
    /** Allowlist-validated name (only present if allowed). */
    readonly name: CarbonIconName | null;
    /** Whether the requested name passed the allowlist. */
    readonly allowed: boolean;
    /** Resolved entry from the static index (if allowed). */
    readonly entry: CarbonIconEntry | null;
    /** The size actually available for this icon (closest match to `requestedSize`). */
    readonly resolvedSize: CarbonIconSize | null;
}
/**
 * CarbonIconAllowlistService
 *
 * Single source of truth for icon-name validation at runtime. Anything
 * that renders a Carbon icon (DosCarbonIcon directive, dynamic-UI props,
 * config-driven nav items, etc.) MUST validate the user-/data-supplied
 * name through this service before passing it to `<svg ibmIcon>` or to
 * `@carbon/icons-angular` factory imports.
 *
 * Why:
 *   - Rule #8 (icons are package-level assets, not per-icon DB rows). The
 *     allowlist is the runtime side of the catalog row.
 *   - Prevents arbitrary SVG injection / typo'd names rendering nothing.
 *   - Telemetry: every disallowed lookup increments a counter and emits
 *     `dos:telemetry:icon-disallowed` (window CustomEvent) so observability
 *     can flag drift before deploy.
 *
 * Usage:
 *   const ok = svc.isAllowed('add');           // boolean
 *   const e  = svc.resolve('add');             // CarbonIconEntry | null
 *   svc.assertAllowed(maybeName);              // throws if not allowed
 *   const r  = svc.resolveAtSize('add', 16);   // returns closest available size
 */
export declare class CarbonIconAllowlistService {
    /** Total icons in the allowlist (frozen at build time). */
    readonly totalCount: number;
    /** Counter of disallowed lookups since process start. */
    readonly disallowedAttempts: import("@angular/core").WritableSignal<number>;
    /** Last 50 disallowed names — circular buffer, kept for debug surfaces. */
    private readonly recentDisallowed;
    /** Fast O(1) allowlist check. */
    isAllowed(name: unknown): name is CarbonIconName;
    /** Returns the indexed entry, or null if the name is not on the allowlist. */
    resolve(name: string): CarbonIconEntry | null;
    /**
     * Returns an icon entry plus the **closest available size** ≥ requestedSize.
     * If `requestedSize` is omitted, returns the smallest available size.
     * If the name fails the allowlist, returns a "disallowed" resolution and
     * emits telemetry — the caller should swap to a fallback icon (`circle`,
     * `warning-alt`, etc.) instead of rendering an empty `<svg>`.
     */
    resolveAtSize(name: string, requestedSize?: 16 | 20 | 24 | 32): CarbonIconResolution;
    /**
     * Returns a known-good icon name, falling back to a sensible default if
     * the input is not on the allowlist. Use this in templates where
     * rendering an empty SVG would be a worse UX than rendering a stand-in.
     */
    resolveOrFallback(name: string, fallback?: CarbonIconName): CarbonIconName;
    /**
     * Throws if the name is not on the allowlist. Use sparingly — only in
     * non-recoverable code paths (e.g. config-validator boot checks).
     */
    assertAllowed(name: string): asserts name is CarbonIconName;
    /** Returns `entry.angularModule` (e.g. 'Add16') for direct factory imports. */
    angularModuleName(name: string, size?: 16 | 20 | 24 | 32): string | null;
    /** Diagnostic snapshot for observability dashboards. */
    diagnostics(): {
        total: number;
        disallowedAttempts: number;
        recentDisallowed: readonly string[];
    };
    private recordDisallowed;
}
