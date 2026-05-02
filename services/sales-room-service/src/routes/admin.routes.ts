import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../adapters/auth.adapter';
import { validate, ok, paginated } from '@dos/platform-core/http';
import {
  createAssetSchema, patchAssetSchema, listQuerySchema,
} from '../domain/assets.types';
import { container } from '../container';
import { parseUpload, UploadError } from '../upload/multipart';

export const adminRouter = Router();

// Surface healthz first (no auth), useful for local checks.
adminRouter.get('/healthz', (_req: Request, res: Response) => {
  res.json({ ok: true, surface: 'admin', wave: 2 });
});

// ─────────────────────────────────────────────────────────────────────
// All admin routes below require authentication + sales_room.asset.manage
// ─────────────────────────────────────────────────────────────────────
adminRouter.use(authenticate);

const requireManage = requirePermission('sales_room.asset.manage');

function actor(req: Request) {
  // Auth middleware populates req.user / req.tenantId in canonical
  // shape; we only need the bits relevant for audit + outbox.
  const u: any = (req as any).user;
  return {
    user: u?.userId || u?.id || u?.sub,
    tenant: (req as any).tenantId || u?.tenantId || undefined,
  };
}

// ── Create (metadata only) ───────────────────────────────────────────
adminRouter.post('/assets', requireManage, validate({ body: createAssetSchema }), async (req, res, next) => {
  try {
    const row = await container().assetsService.create(req.body, actor(req));
    res.status(201);
    return ok(res, row);
  } catch (err: any) {
    if (err?.code === 'unique_violation_slug' || err?.code === '23505') {
      return res.status(409).json({ error: 'slug_already_exists' });
    }
    return next(err);
  }
});

// ── List ─────────────────────────────────────────────────────────────
adminRouter.get('/assets', requirePermission('sales_room.asset.read'), validate({ query: listQuerySchema }), async (req, res, next) => {
  try {
    const q = (req as any).validatedQuery ?? req.query;
    const out = await container().assetsService.list(q as any);
    return paginated(res, out.data, out.total, (q as any).page, (q as any).pageSize);
  } catch (err) { return next(err); }
});

// ── Get by id ────────────────────────────────────────────────────────
adminRouter.get('/assets/:id', requirePermission('sales_room.asset.read'), async (req, res, next) => {
  try {
    const row = await container().assetsService.get(req.params.id);
    if (!row) return res.status(404).json({ error: 'not_found' });
    return ok(res, row);
  } catch (err) { return next(err); }
});

// ── Patch ────────────────────────────────────────────────────────────
adminRouter.patch('/assets/:id', requireManage, validate({ body: patchAssetSchema }), async (req, res, next) => {
  try {
    const updated = await container().assetsService.patch(req.params.id, req.body, actor(req));
    if (!updated) return res.status(404).json({ error: 'not_found' });
    return ok(res, updated);
  } catch (err) { return next(err); }
});

// ── Soft delete ──────────────────────────────────────────────────────
adminRouter.delete('/assets/:id', requireManage, async (req, res, next) => {
  try {
    const out = await container().assetsService.softDelete(req.params.id, actor(req));
    if (!out) return res.status(404).json({ error: 'not_found' });
    return ok(res, out);
  } catch (err) { return next(err); }
});

// ── Single-shot upload (multipart: metadata fields + 'file' part) ───
// Form fields must precede the file part. asset_type is enforced
// against the MIME table on the fly.
adminRouter.post('/assets/upload', requireManage, async (req, res, next) => {
  try {
    const parsed = await parseUpload(req, { enforceAssetTypeFromField: true });
    if (!parsed.file) {
      return res.status(400).json({ error: 'file_part_missing' });
    }
    // Build CreateAssetInput from form fields, run through zod.
    const formObj: Record<string, unknown> = { ...parsed.fields };
    if (formObj.tags && typeof formObj.tags === 'string') {
      try { formObj.tags = JSON.parse(formObj.tags as string); }
      catch { formObj.tags = String(formObj.tags).split(',').map(s => s.trim()).filter(Boolean); }
    }
    for (const k of [
      'is_public', 'is_active', 'allow_preview', 'allow_download',
      'require_lead_capture', 'watermark_required',
    ]) {
      if (formObj[k] !== undefined) formObj[k] = String(formObj[k]) === 'true';
    }
    if (formObj.sort_order !== undefined) {
      formObj.sort_order = Number(formObj.sort_order);
    }
    const parsedMeta = createAssetSchema.safeParse(formObj);
    if (!parsedMeta.success) {
      return res.status(400).json({ error: 'invalid_metadata', issues: parsedMeta.error.issues });
    }

    const row = await container().assetsService.create(parsedMeta.data, actor(req));
    const { asset, deduped } = await container().assetsService.commitUpload(
      row.asset_id,
      {
        tempPath: parsed.file.tempPath,
        sha256: parsed.file.sha256,
        size: parsed.file.sizeBytes,
        mimeType: parsed.file.mimeType,
        originalFilename: parsed.file.originalFilename,
      },
      actor(req),
    );
    res.status(201);
    return ok(res, { asset, deduped });
  } catch (err: any) {
    if (err instanceof UploadError) {
      return res.status(err.status).json({ error: err.code, message: err.message });
    }
    return next(err);
  }
});
