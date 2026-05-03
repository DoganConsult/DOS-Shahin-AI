/**
 * Brand Asset Contract (Phase M0).
 *
 * The eagle (Shahin / Dogan logo) and other brand assets are NOT Carbon
 * icons. They live in `dos.marketing_brand_assets` and are resolved via
 * the BrandResolverService at runtime. This contract is the single source
 * of truth for the asset shape — every renderer (web, email, PDF, OG
 * image) consumes it.
 */
import type { DosBrandCode } from '@dos/design-tokens';

/** Functional kinds shipped in M0 seed. */
export type DosBrandAssetKind =
  | 'logo-eagle'        // primary brand mark (eagle pictogram, no wordmark)
  | 'logo-wordmark'     // wordmark only (text)
  | 'logo-lockup'       // eagle + wordmark composed
  | 'favicon'           // 32×32 / 64×64 ico/svg
  | 'og-image'          // 1200×630 social card
  | 'hero-bg';          // hero background plate

/** Theme variants. */
export type DosBrandAssetTheme = 'light' | 'dark' | 'mono-light' | 'mono-dark';

/** Source — inline SVG (preferred) OR external URL (e.g. CDN). */
export type DosBrandAssetSource =
  | { kind: 'svg'; svg: string }
  | { kind: 'url'; url: string; mime: 'image/svg+xml' | 'image/png' | 'image/webp' };

export interface DosBrandAsset {
  brandCode: DosBrandCode;
  assetKind: DosBrandAssetKind;
  theme: DosBrandAssetTheme;
  /** Optional locale narrowing — `null` = applies to all locales. */
  locale: 'en' | 'ar' | null;
  /** Optional direction narrowing — `null` = applies to LTR + RTL. */
  direction: 'ltr' | 'rtl' | null;
  source: DosBrandAssetSource;
  /** Intrinsic dimensions for SVG/raster — required for layout stability. */
  width: number;
  height: number;
  /** Accessible label — REQUIRED. Falls back to `<brandCode> logo` if empty. */
  altEn: string;
  altAr: string;
  /** Last update — drives client cache invalidation. */
  version: number;
}

/** Resolver query — narrowest match wins. */
export interface DosBrandAssetQuery {
  brandCode: DosBrandCode;
  assetKind: DosBrandAssetKind;
  theme?: DosBrandAssetTheme;
  locale?: 'en' | 'ar';
  direction?: 'ltr' | 'rtl';
}
