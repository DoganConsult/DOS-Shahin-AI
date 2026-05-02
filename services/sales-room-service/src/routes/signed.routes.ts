import { Router, Request, Response } from 'express';
import { mintToken, verifyToken, type SignedScope } from '../signing/hmac';
import { container } from '../container';
import { authenticate, requirePermission } from '../adapters/auth.adapter';
import {
  publishPreviewTokenIssued, publishDownloadTokenIssued,
} from '../events/publisher';
import { recordAudit } from '../adapters/audit.adapter';

export const signedRouter = Router();

signedRouter.get('/healthz', (_req: Request, res: Response) => {
  res.json({ ok: true, surface: 'signed', wave: 2 });
});

// ── Token mint endpoints (admin-authenticated) ───────────────────────
// These are called by the admin UI / API consumers to mint a token
// they can hand to a viewer. Public client-room mint is W4 (with room
// context + per-item override resolution).

signedRouter.post('/mint/preview/:assetId',
  authenticate, requirePermission('sales_room.asset.manage'),
  async (req, res, next) => {
    try {
      const asset = await container().assetsService.get(req.params.assetId);
      if (!asset) return res.status(404).json({ error: 'not_found' });
      if (!asset.allow_preview) return res.status(403).json({ error: 'preview_disabled' });
      const minted = mintToken({ assetId: asset.asset_id, scope: 'preview' });
      const u: any = (req as any).user;
      const userId = u?.userId || u?.id || u?.sub;
      const tenantId = (req as any).tenantId || u?.tenantId || null;
      await Promise.all([
        publishPreviewTokenIssued(asset.asset_id, { expiresAt: minted.expiresAt }, userId),
        recordAudit(tenantId, 'sales_room.asset.preview_token_issued', 'sales_room_asset', asset.asset_id, userId),
      ]);
      return res.json({ token: minted.token, expiresAt: minted.expiresAt });
    } catch (err) { return next(err); }
  });

signedRouter.post('/mint/download/:assetId',
  authenticate, requirePermission('sales_room.asset.manage'),
  async (req, res, next) => {
    try {
      const asset = await container().assetsService.get(req.params.assetId);
      if (!asset) return res.status(404).json({ error: 'not_found' });
      if (!asset.allow_download) return res.status(403).json({ error: 'download_disabled' });
      const minted = mintToken({ assetId: asset.asset_id, scope: 'download' });
      const u: any = (req as any).user;
      const userId = u?.userId || u?.id || u?.sub;
      const tenantId = (req as any).tenantId || u?.tenantId || null;
      await Promise.all([
        publishDownloadTokenIssued(asset.asset_id, { expiresAt: minted.expiresAt }, userId),
        recordAudit(tenantId, 'sales_room.asset.download_token_issued', 'sales_room_asset', asset.asset_id, userId),
      ]);
      return res.json({ token: minted.token, expiresAt: minted.expiresAt });
    } catch (err) { return next(err); }
  });

// ── Stream (token-verified, no auth) ─────────────────────────────────
// GET /api/sales-room/sig/:scope/:assetId?t=<token>&r=<roomCode>
//   - preview: streams inline (Content-Disposition: inline)
//   - download: streams attachment (Content-Disposition: attachment)
//   - allow_preview=false → 404 even with valid token
//   - allow_download=false → 404 on download scope (even with valid token)
//   - private (is_public=false) preview is allowed only when a roomCode
//     is bound in the token (W4) OR when caller has admin perm. W2
//     requires admin context for non-public assets.

signedRouter.get('/:scope/:assetId', async (req: Request, res: Response) => {
  const scope = req.params.scope as SignedScope;
  const assetId = req.params.assetId;
  const token = String(req.query.t || '');
  const roomCode = String(req.query.r || '');

  if (!['preview', 'download'].includes(scope)) {
    return res.status(400).json({ error: 'invalid_scope' });
  }
  if (!token) {
    return res.status(401).json({ error: 'missing_token' });
  }

  const verdict = verifyToken({ token, scope, assetId, roomCode: roomCode || undefined });
  if (verdict.ok !== true) {
    return res.status(403).json({ error: verdict.reason });
  }

  const asset = await container().assetsService.get(assetId);
  if (!asset) return res.status(404).json({ error: 'not_found' });
  if (!asset.storage_key) return res.status(404).json({ error: 'no_bytes' });

  // Distribution flag enforcement — never trust the token alone.
  if (scope === 'preview' && !asset.allow_preview) return res.status(404).json({ error: 'not_found' });
  if (scope === 'download' && !asset.allow_download) return res.status(404).json({ error: 'not_found' });

  // For private assets we don't yet have a room-based override path
  // (W4). In W2, non-public + no roomCode = 404 unless the asset is
  // is_public=true. is_active=false also 404s.
  if (!asset.is_active) return res.status(404).json({ error: 'not_found' });
  if (!asset.is_public && !roomCode) return res.status(404).json({ error: 'not_found' });

  const storage = container().storage;
  const stream = await storage.stream(asset.storage_key);

  res.setHeader('Content-Type', asset.mime_type || 'application/octet-stream');
  if (asset.file_size_bytes) res.setHeader('Content-Length', String(asset.file_size_bytes));
  const filename = (asset.original_filename || asset.slug).replace(/"/g, '');
  res.setHeader(
    'Content-Disposition',
    `${scope === 'download' ? 'attachment' : 'inline'}; filename="${filename}"`,
  );
  res.setHeader('Cache-Control', 'private, max-age=0, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // `nodownload` is video-element specific but harmless elsewhere.
  if (scope === 'preview' && asset.asset_type === 'video') {
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  }

  stream.on('error', (err) => {
    if (!res.headersSent) res.status(500).json({ error: 'stream_failed', detail: String(err) });
    else res.destroy(err);
  });
  stream.pipe(res);
});
