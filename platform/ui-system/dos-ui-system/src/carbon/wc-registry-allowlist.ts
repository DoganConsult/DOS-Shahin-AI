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

export function armCarbonOnlyCustomElementRegistry(
  opts: CarbonOnlyArmOptions = {},
): void {
  if (armed) return;
  if (typeof globalThis === 'undefined' || !(globalThis as any).customElements) {
    // SSR / non-browser environment — nothing to patrol.
    return;
  }

  const allowedPrefixes = [
    ...ALLOWED_WC_PREFIXES,
    ...(opts.extraAllowedPrefixes ?? []),
  ];
  const shouldThrow = opts.throwOnBannedRegistration !== false;
  const log = opts.log ?? ((msg: string) => console.error(msg));

  const registry = (globalThis as any).customElements as CustomElementRegistry;
  const original = registry.define.bind(registry);

  registry.define = function patrolledDefine(
    name: string,
    constructor: CustomElementConstructor,
    options?: ElementDefinitionOptions,
  ): void {
    const allowed = allowedPrefixes.some((p) => name.startsWith(p));
    if (!allowed) {
      const msg =
        `[carbon-only/wc] BLOCKED registration of "${name}" — only Carbon WC ` +
        `prefixes allowed (${allowedPrefixes.join(', ')}). IBM Carbon is the ` +
        `only approved UI ecosystem.`;
      log(msg);
      if (shouldThrow) {
        throw new Error(msg);
      }
      return;
    }
    return original(name, constructor, options);
  } as typeof registry.define;

  armed = true;
}

/**
 * Test-only helper to reset the patrol state. NOT part of the public API.
 * @internal
 */
export function __resetCarbonOnlyArmed(): void {
  armed = false;
}

export function isCarbonOnlyArmed(): boolean {
  return armed;
}
