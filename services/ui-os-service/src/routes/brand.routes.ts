import { Router, type Request, type Response } from 'express';
import type { DbPool } from '../db.js';

/**
 * Phase M0 — Public marketing brand resolver.
 *
 * GET /brand?brand_code=<shahin-ai|dogan-ai-os>
 *   → { brandCode, tokens, assets }
 *
 * GET /marketing/config?brand=<code>&locale=<en|ar>
 *   → { brandCode, locale, direction, publicMarketingEnabled, navItems,
 *       footerGroups, flags }
 *
 * Both endpoints are PUBLIC (no tenant header, no auth) — they are consumed
 * by the unauthenticated marketing surface. Refuses unknown brand codes.
 *
 * Rows come from:
 *   • dos.marketing_brand_tokens   (M0 migration 20260503_0023)
 *   • dos.marketing_brand_assets   (M0 migration 20260503_0023)
 */

const ALLOWED_BRANDS = new Set(['shahin-ai', 'dogan-ai-os']);
const ALLOWED_LOCALES = new Set(['en', 'ar']);

interface BrandTokenRow { token_key: string; token_value: string }
interface BrandAssetRow {
  asset_kind: string;
  asset_code: string | null;
  theme: string;
  locale: string | null;
  direction: string | null;
  source_kind: string;
  svg: string | null;
  url: string | null;
  mime: string | null;
  width: number;
  height: number;
  alt_en: string;
  alt_ar: string;
  version: number;
}

export function createBrandRouter(pool: DbPool): Router {
  const router = Router();

  router.get('/brand', async (req: Request, res: Response) => {
    const brandCode = String(req.query.brand_code ?? '').trim();
    if (!ALLOWED_BRANDS.has(brandCode)) {
      res.status(404).json({ error: 'unknown_brand', brand_code: brandCode });
      return;
    }
    try {
      const tokensQ = await pool.query<BrandTokenRow>(
        `SELECT token_key, token_value
           FROM dos.marketing_brand_tokens
          WHERE brand_code = $1`,
        [brandCode],
      );
      const assetsQ = await pool.query<BrandAssetRow>(
        `SELECT asset_kind, asset_code, theme, locale, direction, source_kind,
                svg, url, mime, width, height, alt_en, alt_ar, version
           FROM dos.marketing_brand_assets
          WHERE brand_code = $1 AND active = TRUE
          ORDER BY asset_kind, asset_code NULLS FIRST, theme`,
        [brandCode],
      );

      const tokens: Record<string, string> = {};
      for (const r of tokensQ.rows) tokens[r.token_key.replace(/^--/, '')] = r.token_value;

      const assets = assetsQ.rows.map((r) => ({
        brandCode,
        assetKind: r.asset_kind,
        assetCode: r.asset_code,
        theme: r.theme,
        locale: r.locale,
        direction: r.direction,
        source:
          r.source_kind === 'svg'
            ? { kind: 'svg', svg: r.svg ?? '' }
            : { kind: 'url', url: r.url ?? '', mime: r.mime ?? 'image/svg+xml' },
        width: r.width,
        height: r.height,
        altEn: r.alt_en,
        altAr: r.alt_ar,
        version: r.version,
      }));

      // Sanity refusal: brand must have at least the eagle asset, otherwise
      // serving an empty bundle would silently break the public landing.
      if (!assets.some((a) => a.assetKind === 'logo-eagle')) {
        res.status(503).json({ error: 'brand_incomplete', detail: 'logo-eagle missing' });
        return;
      }

      res.json({ brandCode, tokens, assets });
    } catch (e) {
      res.status(500).json({ error: 'brand_get_failed', message: (e as Error).message });
    }
  });

  router.get('/marketing/config', async (req: Request, res: Response) => {
    const brandCode = String(req.query.brand ?? '').trim();
    const locale = String(req.query.locale ?? 'en').trim();
    if (!ALLOWED_BRANDS.has(brandCode)) {
      res.status(404).json({ error: 'unknown_brand', brand: brandCode });
      return;
    }
    if (!ALLOWED_LOCALES.has(locale)) {
      res.status(400).json({ error: 'invalid_locale', locale });
      return;
    }
    const direction = locale === 'ar' ? 'rtl' : 'ltr';

    // Static M0 baseline — Phase M1 swaps to dos.marketing_pages-driven config.
    res.json({
      brandCode,
      locale,
      direction,
      publicMarketingEnabled: true,
      navItems: [
        { id: 'platform', labelKey: 'marketing.nav.platform', href: '/platform', variant: 'link' },
        { id: 'products', labelKey: 'marketing.nav.products', href: '/products', variant: 'link' },
        { id: 'trust', labelKey: 'marketing.nav.trust', href: '/trust', variant: 'link' },
        { id: 'pricing', labelKey: 'marketing.nav.pricing', href: '/pricing', variant: 'link' },
        { id: 'cta-trial', labelKey: 'marketing.cta.start_trial', href: '/trial', variant: 'primary' },
      ],
      footerGroups: [
        {
          id: 'product',
          titleKey: 'marketing.footer.product',
          items: [
            { id: 'platform', labelKey: 'marketing.nav.platform', href: '/platform' },
            { id: 'products', labelKey: 'marketing.nav.products', href: '/products' },
            { id: 'pricing', labelKey: 'marketing.nav.pricing', href: '/pricing' },
          ],
        },
        {
          id: 'trust',
          titleKey: 'marketing.footer.trust',
          items: [
            { id: 'security', labelKey: 'marketing.footer.security', href: '/trust/security' },
            { id: 'compliance', labelKey: 'marketing.footer.compliance', href: '/trust/compliance' },
            { id: 'privacy', labelKey: 'marketing.footer.privacy', href: '/trust/privacy' },
          ],
        },
        {
          id: 'company',
          titleKey: 'marketing.footer.company',
          items: [
            { id: 'about', labelKey: 'marketing.footer.about', href: '/about' },
            { id: 'contact', labelKey: 'marketing.footer.contact', href: '/contact' },
          ],
        },
      ],
      flags: {
        landingHeroVideo: false,
        landingLiveStatusPill: true,
        landingAgenticProof: true,
      },
    });
  });

  return router;
}
