/**
 * Layer 5 of the Carbon-only enforcement stack — Web Components allowlist.
 *
 * Wraps `customElements.define` so any attempt to register a non-IBM-Carbon
 * custom element raises immediately at runtime. Carbon WC components and
 * IBM Products WC components register elements with the prefixes:
 *
 *   - cds-…   (carbon-design-system / @carbon/web-components)
 *   - c4p-…   (carbon-4-products / @carbon/ibm-products-web-components)
 *
 * Anything else — eg. a third-party library trying to register
 * `mui-button` or `kendo-grid` — is rejected before it can attach to the
 * DOM. This is defence-in-depth for the WC tier; Layers 1-4 already
 * filter at DB / lint / bundle time.
 *
 * USAGE — call once at app bootstrap, before importing any Carbon WC
 * registration modules:
 *
 *   import { armCarbonOnlyCustomElementRegistry } from '@dos/ui-system/carbon';
 *   armCarbonOnlyCustomElementRegistry();
 *
 * Idempotent: re-arming is a no-op.
 */
export interface CarbonOnlyArmOptions {
    /**
     * If true (default) the patrol throws on a banned `define` call. Set
     * to false to log + swallow — useful in test harnesses where a
     * non-Carbon stub element is intentionally registered.
     */
    throwOnBannedRegistration?: boolean;
    /**
     * Extra prefixes to allow alongside `cds-` / `c4p-`. Use sparingly —
     * each addition is a permanent vendor exception that future audits
     * will scrutinise.
     */
    extraAllowedPrefixes?: readonly string[];
    /**
     * Optional logger; defaults to `console.error`.
     */
    log?: (msg: string) => void;
}
export declare function armCarbonOnlyCustomElementRegistry(opts?: CarbonOnlyArmOptions): void;
/**
 * Test-only helper to reset the patrol state. NOT part of the public API.
 * @internal
 */
export declare function __resetCarbonOnlyArmed(): void;
export declare function isCarbonOnlyArmed(): boolean;
