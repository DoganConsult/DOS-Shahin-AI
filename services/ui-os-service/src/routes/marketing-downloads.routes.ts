import { Router, type Request, type Response } from 'express';
import type { DbPool } from '../db.js';

/**
 * Phase M1.5 — Public marketing-asset registry + download event sink.
 *
 *   GET  /marketing/assets?brand=<code>&locale=<en|ar>
 *     → { assets: MarketingAsset[] }
 *     PUBLIC. Rows from dos.marketing_assets WHERE active=TRUE AND
 *     approval_status='approved'.
 *
 *   GET  /marketing/assets/:assetKey?brand=<code>&locale=<en|ar>
 *     → MarketingAsset (single)
 *     PUBLIC.
 *
 *   POST /marketing/downloads
 *     body: { eventKey, assetKey, brandCode, locale, payload? }
 *     → 202 Accepted. Append-only insert into dos.marketing_download_events.
 *
 * Carbon-only / tenant-free / AccessStore-free. No PII validation beyond
 * basic shape checks — gated forms remain anti-spam at the gateway/WAF.
 */

const ALLOWED_BRANDS  = new Set(['shahin-ai', 'dogan-ai-os']);
const ALLOWED_LOCALES = new Set(['en', 'ar']);
const ALLOWED_EVENTS  = new Set([
  'marketing.download.opened',
  'marketing.download.submitted',
  'marketing.download.completed',
]);

interface AssetRow {
  asset_key: string;
  brand_code: string;
  locale: string;
  title: string;
  description: string;
  asset_type: string;
  file_url: string;
  thumbnail_url: string | null;
  is_gated: boolean;
  version: number;
}

function rowToAsset(r: AssetRow) {
  return {
    assetKey: r.asset_key,
    brandCode: r.brand_code,
    locale: r.locale,
    title: r.title,
    description: r.description,
    assetType: r.asset_type,
    fileUrl: r.file_url,
    thumbnailUrl: r.thumbnail_url,
    isGated: r.is_gated,
    version: r.version,
  };
}

export function createMarketingDownloadsRouter(pool: DbPool): Router {
  const router = Router();

  router.get('/marketing/assets', async (req: Request, res: Response) => {
    const brand = String(req.query.brand ?? '').trim();
    const locale = String(req.query.locale ?? '').trim() || null;
    if (!ALLOWED_BRANDS.has(brand)) {
      res.status(404).json({ error: 'unknown_brand', brand });
      return;
    }
    if (locale && !ALLOWED_LOCALES.has(locale)) {
      res.status(400).json({ error: 'invalid_locale', locale });
      return;
    }
    try {
      const sql = locale
        ? `SELECT asset_key, brand_code, locale, title, description, asset_type,
                  file_url, thumbnail_url, is_gated, version
             FROM dos.marketing_assets
            WHERE active = TRUE AND approval_status = 'approved'
              AND brand_code = $1 AND locale = $2
            ORDER BY asset_key`
        : `SELECT asset_key, brand_code, locale, title, description, asset_type,
                  file_url, thumbnail_url, is_gated, version
             FROM dos.marketing_assets
            WHERE active = TRUE AND approval_status = 'approved'
              AND brand_code = $1
            ORDER BY asset_key, locale`;
      const params = locale ? [brand, locale] : [brand];
      const q = await pool.query<AssetRow>(sql, params);
      res.json({ assets: q.rows.map(rowToAsset) });
    } catch (e) {
      res.status(500).json({ error: 'marketing_assets_failed', message: (e as Error).message });
    }
  });

  router.get('/marketing/assets/:assetKey', async (req: Request, res: Response) => {
    const assetKey = String(req.params.assetKey ?? '').trim();
    const brand = String(req.query.brand ?? '').trim();
    const locale = String(req.query.locale ?? 'en').trim();
    if (!ALLOWED_BRANDS.has(brand)) {
      res.status(404).json({ error: 'unknown_brand', brand });
      return;
    }
    if (!ALLOWED_LOCALES.has(locale)) {
      res.status(400).json({ error: 'invalid_locale', locale });
      return;
    }
    try {
      const q = await pool.query<AssetRow>(
        `SELECT asset_key, brand_code, locale, title, description, asset_type,
                file_url, thumbnail_url, is_gated, version
           FROM dos.marketing_assets
          WHERE active = TRUE AND approval_status = 'approved'
            AND asset_key = $1 AND brand_code = $2 AND locale = $3`,
        [assetKey, brand, locale],
      );
      if (!q.rows[0]) {
        res.status(404).json({ error: 'asset_not_found', assetKey });
        return;
      }
      res.json(rowToAsset(q.rows[0]));
    } catch (e) {
      res.status(500).json({ error: 'marketing_asset_failed', message: (e as Error).message });
    }
  });

  router.post('/marketing/downloads', async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as {
      eventKey?: string;
      assetKey?: string;
      brandCode?: string;
      locale?: string;
      payload?: Record<string, string>;
    };
    if (!body.eventKey || !ALLOWED_EVENTS.has(body.eventKey)) {
      res.status(400).json({ error: 'invalid_event_key', eventKey: body.eventKey });
      return;
    }
    if (!body.assetKey || !body.brandCode || !ALLOWED_BRANDS.has(body.brandCode)) {
      res.status(400).json({ error: 'invalid_asset_or_brand' });
      return;
    }
    if (!body.locale || !ALLOWED_LOCALES.has(body.locale)) {
      res.status(400).json({ error: 'invalid_locale', locale: body.locale });
      return;
    }
    try {
      const p = body.payload ?? {};
      await pool.query(
        `INSERT INTO dos.marketing_download_events
           (event_key, asset_key, brand_code, locale, email, company,
            job_title, country, interest_area, user_agent)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          body.eventKey, body.assetKey, body.brandCode, body.locale,
          p.email ?? null, p.company ?? null, p.jobTitle ?? null,
          p.country ?? null, p.interestArea ?? null,
          String(req.headers['user-agent'] ?? '').slice(0, 256),
        ],
      );
      res.status(202).json({ accepted: true });
    } catch (e) {
      res.status(500).json({ error: 'download_event_failed', message: (e as Error).message });
    }
  });

  return router;
}
