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
const ALLOWED_WC_PREFIXES = ['cds-', 'c4p-'];
let armed = false;
export function armCarbonOnlyCustomElementRegistry(opts = {}) {
    if (armed)
        return;
    if (typeof globalThis === 'undefined' || !globalThis.customElements) {
        // SSR / non-browser environment — nothing to patrol.
        return;
    }
    const allowedPrefixes = [
        ...ALLOWED_WC_PREFIXES,
        ...(opts.extraAllowedPrefixes ?? []),
    ];
    const shouldThrow = opts.throwOnBannedRegistration !== false;
    const log = opts.log ?? ((msg) => console.error(msg));
    const registry = globalThis.customElements;
    const original = registry.define.bind(registry);
    registry.define = function patrolledDefine(name, constructor, options) {
        const allowed = allowedPrefixes.some((p) => name.startsWith(p));
        if (!allowed) {
            const msg = `[carbon-only/wc] BLOCKED registration of "${name}" — only Carbon WC ` +
                `prefixes allowed (${allowedPrefixes.join(', ')}). IBM Carbon is the ` +
                `only approved UI ecosystem.`;
            log(msg);
            if (shouldThrow) {
                throw new Error(msg);
            }
            return;
        }
        return original(name, constructor, options);
    };
    armed = true;
}
/**
 * Test-only helper to reset the patrol state. NOT part of the public API.
 * @internal
 */
export function __resetCarbonOnlyArmed() {
    armed = false;
}
export function isCarbonOnlyArmed() {
    return armed;
}
//# sourceMappingURL=wc-registry-allowlist.js.map