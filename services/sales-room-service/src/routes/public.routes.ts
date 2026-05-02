import { Router, Request, Response } from 'express';
import { container } from '../container';
import { listQuerySchema } from '../domain/assets.types';
import { mintToken } from '../signing/hmac';
import {
  publishPreviewTokenIssued, publishDownloadTokenIssued,
} from '../events/publisher';

export const publicRouter = Router();

publicRouter.get('/healthz', (_req: Request, res: Response) => {
  res.json({ ok: true, surface: 'public', wave: 3 });
});

// ── Public asset hub: only is_public=true AND is_active=true ─────────
// Pre-login. No tenant context required. Filterable by asset_type,
// language, product_code; full-text search across titles/descriptions.
publicRouter.get('/assets', async (req, res, next) => {
  try {
    // Reuse the admin list query schema; force is_public + is_active
    // server-side regardless of caller input. Any caller-supplied
    // is_public/is_active is ignored.
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid_query', issues: parsed.error.issues });
    }
    const q = { ...parsed.data, is_public: true, is_active: true };
    const out = await container().assetsService.list(q as any);
    return res.json({
      success: true,
      data: out.data.map(stripInternalFields),
      meta: { page: q.page, pageSize: q.pageSize, total: out.total },
    });
  } catch (err) { return next(err); }
});

// ── Public asset detail by slug ──────────────────────────────────────
publicRouter.get('/assets/:slug', async (req, res, next) => {
  try {
    // Brute-list by slug: small public catalogue, paged search is fine.
    // Real impl in PgAssetsRepo uses the unique idx_sra_slug.
    const repo = (container().assetsService as any).deps.repo;
    const found = await repo.getBySlug(req.params.slug);
    if (!found || !found.is_public || !found.is_active || found.deleted_at) {
      return res.status(404).json({ error: 'not_found' });
    }
    return res.json({ success: true, data: stripInternalFields(found) });
  } catch (err) { return next(err); }
});

// ── Public token mint — only for is_public=true assets ──────────────
// Anonymous visitors call these from the /resources hub to render
// previews and (when allowed) trigger downloads. Returns 404 if the
// asset is not publicly distributable — never leak the asset's
// existence by returning 403.
publicRouter.post('/assets/:idOrSlug/preview-url', async (req, res, next) => {
  try {
    const asset = await resolvePublicAsset(req.params.idOrSlug);
    if (!asset) return res.status(404).json({ error: 'not_found' });
    if (!asset.allow_preview) return res.status(404).json({ error: 'not_found' });
    const minted = mintToken({ assetId: asset.asset_id, scope: 'preview' });
    publishPreviewTokenIssued(asset.asset_id, { expiresAt: minted.expiresAt, public: true })
      .catch(() => { /* outbox is best-effort */ });
    return res.json({
      token: minted.token,
      expiresAt: minted.expiresAt,
      asset_id: asset.asset_id,
      streamUrl: `/api/sales-room/sig/preview/${asset.asset_id}?t=${encodeURIComponent(minted.token)}`,
    });
  } catch (err) { return next(err); }
});

publicRouter.post('/assets/:idOrSlug/download-url', async (req, res, next) => {
  try {
    const asset = await resolvePublicAsset(req.params.idOrSlug);
    if (!asset) return res.status(404).json({ error: 'not_found' });
    if (!asset.allow_download) return res.status(404).json({ error: 'not_found' });
    const minted = mintToken({ assetId: asset.asset_id, scope: 'download' });
    publishDownloadTokenIssued(asset.asset_id, { expiresAt: minted.expiresAt, public: true })
      .catch(() => { /* outbox is best-effort */ });
    return res.json({
      token: minted.token,
      expiresAt: minted.expiresAt,
      asset_id: asset.asset_id,
      streamUrl: `/api/sales-room/sig/download/${asset.asset_id}?t=${encodeURIComponent(minted.token)}`,
    });
  } catch (err) { return next(err); }
});

// Engagement events + lead capture (Wave 4 / Wave 7)
publicRouter.post('/events', (_req, res) => res.status(501).json({ error: 'not_implemented', wave: 4 }));
publicRouter.post('/leads', (_req, res) => res.status(501).json({ error: 'not_implemented', wave: 7 }));

async function resolvePublicAsset(idOrSlug: string) {
  const repo = (container().assetsService as any).deps.repo;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
  const asset = isUuid ? await repo.getById(idOrSlug) : await repo.getBySlug(idOrSlug);
  if (!asset) return null;
  if (!asset.is_public || !asset.is_active || asset.deleted_at) return null;
  if (!asset.storage_key) return null;
  return asset;
}

// ── helpers ──────────────────────────────────────────────────────────
function stripInternalFields(row: any) {
  // Public callers don't need tenant attribution, raw storage keys, or
  // ingestion error payloads. Whitelist what we expose.
  return {
    asset_id: row.asset_id,
    slug: row.slug,
    title_en: row.title_en,
    title_ar: row.title_ar,
    description_en: row.description_en,
    description_ar: row.description_ar,
    asset_type: row.asset_type,
    product_code: row.product_code,
    language: row.language,
    audience: row.audience,
    tags: row.tags,
    mime_type: row.mime_type,
    file_size_bytes: row.file_size_bytes,
    allow_preview: row.allow_preview,
    allow_download: row.allow_download,
    require_lead_capture: row.require_lead_capture,
    is_public: row.is_public,
    is_active: row.is_active,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
