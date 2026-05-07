import { Router, type Request, type Response } from 'express';
import type { DbPool } from '../db.js';

/**
 * Phase M0 — Public marketing brand resolver.
 *
 * GET /brand?brand_code=<shahin-ai|dogan-ai-os>
 *   → { brandCode, tokens, assets }
 *
 * GET /marketing/config?brand=<code>&locale=<en|ar>&route=<path>
 *   → { brandCode, locale, direction, publicMarketingEnabled, navItems,
 *       navGroups, footerGroups, flags, homeContent }
 *
 * homeContent is READ FROM DB (dos.ui_route_template_binding.props.homeContent).
 * buildMarketingHomeContent() DELETED — zero static fallback, zero hardcoded copy.
 * If DB has no homeContent row, resolver returns null and frontend renders empty state.
 *
 * Rows come from:
 *   • dos.marketing_brand_tokens   (M0 migration 20260503_0023)
 *   • dos.marketing_brand_assets   (M0 migration 20260503_0023)
 *   • dos.marketing_nav_items      (nav items)
 *   • dos.marketing_nav_groups     (nav groups)
 *   • dos.marketing_footer_groups  (footer groups)
 *   • dos.marketing_footer_items   (footer items)
 *   • dos.ui_route_template_binding.props.homeContent  (page content — ALL regions)
 */

const ALLOWED_BRANDS = new Set(['shahin-ai', 'dogan-ai-os']);
const ALLOWED_LOCALES = new Set(['en', 'ar']);

/** Read homeContent from ui_route_template_binding.props for the given route.
 *  Returns null if no row or no homeContent — frontend renders empty state.
 *  NO fallback. NO static copy. DB is the only source. */
async function loadHomeContentFromDb(
  pool: DbPool,
  route: string,
): Promise<Record<string, unknown> | null> {
  const { rows } = await pool.query<{ props: Record<string, unknown> }>(
    `SELECT props FROM dos.ui_route_template_binding WHERE route = $1 LIMIT 1`,
    [route],
  );
  if (!rows.length || !rows[0].props) return null;
  const hc = (rows[0].props['homeContent'] ?? null) as Record<string, unknown> | null;
  return hc;
}

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

interface BrandConfigRow {
  brand_color_primary: string;
  brand_color_accent: string;
  brand_color_background: string;
  brand_color_surface: string;
  brand_color_text: string;
  brand_color_muted: string;
  brand_icon: string;
  brand_token_prefix: string;
  dogan_meaning_en: string;
  dogan_meaning_ar: string;
}

interface MarketingPageRow {
  slug: string;
  title_en: string;
  title_ar: string;
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
    const locale    = String(req.query.locale ?? 'en').trim();
    // route param: which page's homeContent to load (default /marketing)
    const routePath = String(req.query.route ?? '/marketing').trim();

    if (!ALLOWED_BRANDS.has(brandCode)) {
      res.status(404).json({ error: 'unknown_brand', brand: brandCode });
      return;
    }
    if (!ALLOWED_LOCALES.has(locale)) {
      res.status(400).json({ error: 'invalid_locale', locale });
      return;
    }
    const direction = locale === 'ar' ? 'rtl' : 'ltr';

    try {
      // ── DB-driven nav + footer ────────────────────────────────────────────
      const [navQ, navGroupQ, footerGroupQ, footerItemQ, brandConfigQ, legalPagesQ] = await Promise.all([
        pool.query(
          `SELECT id, label_en, label_ar, label_key, href, variant, carbon_key,
                  hide_for_locales, nav_group
             FROM dos.marketing_nav_items
            WHERE brand_code = $1 AND is_active = TRUE
            ORDER BY sort_order`,
          [brandCode],
        ),
        pool.query(
          `SELECT id, label_en, label_ar, sort_order
             FROM dos.marketing_nav_groups
            WHERE brand_code = $1 AND is_active = TRUE
            ORDER BY sort_order`,
          [brandCode],
        ),
        pool.query(
          `SELECT id, title_en, title_ar, title_key
             FROM dos.marketing_footer_groups
            WHERE brand_code = $1 AND is_active = TRUE
            ORDER BY sort_order`,
          [brandCode],
        ),
        pool.query(
          `SELECT id, group_id, label_en, label_ar, label_key, href
             FROM dos.marketing_footer_items
            WHERE brand_code = $1 AND is_active = TRUE
            ORDER BY group_id, sort_order`,
          [brandCode],
        ),
        pool.query<BrandConfigRow>(
          `SELECT brand_color_primary, brand_color_accent, brand_color_background,
                  brand_color_surface, brand_color_text, brand_color_muted,
                  brand_icon, brand_token_prefix, dogan_meaning_en, dogan_meaning_ar
             FROM dos.brand_config
            WHERE domain = $1`,
          [brandCode],
        ),
        pool.query<MarketingPageRow>(
          `SELECT slug, title_en, title_ar
             FROM dos.marketing_pages
            ORDER BY slug`,
        ),
      ]);

      const navItems = navQ.rows.map((r) => ({
        id:             r.id,
        labelKey:       r.label_key,
        label:          locale === 'ar' ? r.label_ar : r.label_en,
        href:           r.href,
        variant:        r.variant,
        carbonKey:      r.carbon_key,
        navGroup:       r.nav_group ?? null,
        hideForLocales: r.hide_for_locales ?? null,
      }));

      const navGroups = navGroupQ.rows.map((g) => ({
        id:    g.id,
        label: locale === 'ar' ? g.label_ar : g.label_en,
        items: navItems.filter((n) => n.navGroup === g.id),
      }));

      const itemsByGroup = new Map<string, typeof footerItemQ.rows>();
      for (const item of footerItemQ.rows) {
        const g = itemsByGroup.get(item.group_id) ?? [];
        g.push(item);
        itemsByGroup.set(item.group_id, g);
      }

      const footerGroups = footerGroupQ.rows.map((g) => ({
        id:       g.id,
        titleKey: g.title_key,
        title:    locale === 'ar' ? g.title_ar : g.title_en,
        items: (itemsByGroup.get(g.id) ?? []).map((it) => ({
          id:       it.id,
          labelKey: it.label_key,
          label:    locale === 'ar' ? it.label_ar : it.label_en,
          href:     it.href,
        })),
      }));

      // ── Brand config (from Branding.docx) ────────────────────────────────
      const brandConfig = brandConfigQ.rows.length > 0 ? {
        brandColorPrimary: brandConfigQ.rows[0].brand_color_primary,
        brandColorAccent: brandConfigQ.rows[0].brand_color_accent,
        brandColorBackground: brandConfigQ.rows[0].brand_color_background,
        brandColorSurface: brandConfigQ.rows[0].brand_color_surface,
        brandColorText: brandConfigQ.rows[0].brand_color_text,
        brandColorMuted: brandConfigQ.rows[0].brand_color_muted,
        brandIcon: brandConfigQ.rows[0].brand_icon,
        brandTokenPrefix: brandConfigQ.rows[0].brand_token_prefix,
        doganMeaningEn: brandConfigQ.rows[0].dogan_meaning_en,
        doganMeaningAr: brandConfigQ.rows[0].dogan_meaning_ar,
      } : null;

      // ── Legal pages (from legal and terms .docx) ───────────────────────────
      const legalPages = legalPagesQ.rows.map((r) => ({
        slug: r.slug,
        title_en: r.title_en,
        title_ar: r.title_ar,
      }));

      // ── Footer config with ecosystem notice ────────────────────────────────
      const footerConfig = {
        legalPages,
        ecosystemNoticeEn: 'Part of the Dogan ecosystem. Each product, platform, initiative, portal, service, or profile may operate under its own purpose, scope, terms, privacy notice, and commercial structure. Dogan / Doğan is a Turkish name meaning falcon. It is not related to the English word dog.',
        ecosystemNoticeAr: 'جزء من منظومة Dogan. قد يكون لكل منتج أو منصة أو مبادرة أو بوابة أو خدمة أو ملف شخصي غرضه ونطاقه وشروطه وإشعار الخصوصية والهيكل التجاري الخاص به. Dogan / Doğan اسم تركي معناه الصقر أو الشاهين، ولا يرتبط بكلمة Dog الإنجليزية.',
      };

      // ── DB-driven homeContent (ZERO static fallback) ──────────────────────
      const homeContent = await loadHomeContentFromDb(pool, routePath);

      res.json({
        brandCode,
        locale,
        direction,
        publicMarketingEnabled: true,
        navItems,
        navGroups,
        footerGroups,
        flags: {
          landingHeroVideo:      false,
          landingLiveStatusPill: false,
          landingAgenticProof:   true,
        },
        homeContent, // null if DB has no row → frontend renders empty state
        brandConfig, // from dos.brand_config
        legalConfig: {
          legalEntityName: 'Dogan Consult',
          commercialRegistrationNumber: '[COMMERCIAL_REGISTRATION_NUMBER]',
          vatNumber: '[VAT_NUMBER]',
          registeredAddress: '[REGISTERED_ADDRESS]',
          supportEmail: '[SUPPORT_EMAIL]',
          billingEmail: '[BILLING_EMAIL]',
          country: 'Saudi Arabia',
          lastUpdated: '2026-05-15',
        },
        footerConfig, // from dos.marketing_pages + ecosystem notice
      });
    } catch (e) {
      res.status(500).json({ error: 'marketing_config_failed', message: (e as Error).message });
    }
  });

  return router;
}
