/**
 * Marketing Surface — Functional Icon Subset (Phase M0).
 *
 * Hard, curated subset of `CARBON_ICON_NAMES` used by the public-facing
 * marketing surface (landing pages, product pages, trust, pricing). All
 * names are validated against `CARBON_ICON_NAME_SET` at module load.
 *
 * RULES:
 *   1. Functional UI icons only (menu, search, arrow, close, etc.).
 *   2. The eagle (Shahin / Dogan logo) is NOT an icon — it is a brand
 *      asset rendered by `<dos-brand-eagle>` and resolved through
 *      `dos.marketing_brand_assets`.
 *   3. Marketing pages MAY NOT render any Carbon icon name not present
 *      here — `assertMarketingIcon()` throws otherwise.
 *
 * Mirrors the manifest locked in M0 (corrected agent prompt).
 */
import {
  CARBON_ICON_NAME_SET,
  type CarbonIconName,
} from './carbon-icons.allowlist';

const _MARKETING_ICONS = [
  'menu',
  'search',
  'arrow--right',
  'play--filled',
  'security',
  'certificate',
  'partnership',
  'idea',
  'growth',
  'close',
  'chevron--down',
  'user',
  'notification',
] as const;

// Validate each name against the master Carbon allowlist at load time.
// Drift fails fast at boot rather than rendering a missing glyph later.
for (const n of _MARKETING_ICONS) {
  if (!CARBON_ICON_NAME_SET.has(n as CarbonIconName)) {
    // Throwing here makes the failure visible in `pnpm build` and at SSR.
    throw new Error(
      `[marketing-icons] "${n}" is not in CARBON_ICON_NAME_SET — fix the name or regenerate the allowlist`,
    );
  }
}

export const MARKETING_ICON_NAMES = _MARKETING_ICONS;
export type MarketingIconName = (typeof MARKETING_ICON_NAMES)[number];

export const MARKETING_ICON_SET: ReadonlySet<MarketingIconName> =
  new Set(MARKETING_ICON_NAMES);

export function isMarketingIcon(name: unknown): name is MarketingIconName {
  return typeof name === 'string' && MARKETING_ICON_SET.has(name as MarketingIconName);
}

export function assertMarketingIcon(name: unknown): asserts name is MarketingIconName {
  if (!isMarketingIcon(name)) {
    throw new Error(
      `[marketing-icons] disallowed icon on marketing surface: ${JSON.stringify(name)}. ` +
        `Allowed: ${MARKETING_ICON_NAMES.join(', ')}. ` +
        `For brand logos use <dos-brand-eagle> — the eagle is a brand asset, not an icon.`,
    );
  }
}
