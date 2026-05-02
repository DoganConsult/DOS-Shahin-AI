import { unlink } from 'node:fs/promises';
import type { AssetsRepo } from './assets.repo';
import { commitTempFile, contentAddressedKey, UploadError } from '../upload/multipart';
import { isMimeAllowed } from '../upload/mime';
import type { StorageDriver } from '../storage';
import type { AssetRow, CreateAssetInput, ListQuery, PatchAssetInput } from './assets.types';
import { recordAudit } from '../adapters/audit.adapter';
import {
  publishAssetCreated, publishAssetUpdated, publishAssetUploaded, publishAssetDeactivated,
} from '../events/publisher';

export interface AssetsServiceDeps {
  repo: AssetsRepo;
  storage: StorageDriver;
}

export interface UploadCommitInput {
  tempPath: string;
  sha256: string;
  size: number;
  mimeType: string;
  originalFilename: string;
}

export class AssetsService {
  constructor(private readonly deps: AssetsServiceDeps) {}

  async create(input: CreateAssetInput, actor: { user?: string; tenant?: string }): Promise<AssetRow> {
    const row = await this.deps.repo.create(input, actor);
    await Promise.all([
      recordAudit(actor.tenant ?? null, 'sales_room.asset.created', 'sales_room_asset', row.asset_id, actor.user, {
        slug: row.slug, asset_type: row.asset_type,
      }),
      publishAssetCreated(row.asset_id, { slug: row.slug, asset_type: row.asset_type }, actor.user),
    ]);
    return row;
  }

  async get(id: string): Promise<AssetRow | null> {
    return this.deps.repo.getById(id);
  }

  async list(q: ListQuery) {
    return this.deps.repo.list(q);
  }

  async patch(id: string, p: PatchAssetInput, actor: { user?: string; tenant?: string }): Promise<AssetRow | null> {
    const updated = await this.deps.repo.patch(id, p, actor);
    if (updated) {
      await Promise.all([
        recordAudit(actor.tenant ?? null, 'sales_room.asset.updated', 'sales_room_asset', id, actor.user, p as any),
        publishAssetUpdated(id, { changed: Object.keys(p) }, actor.user),
      ]);
    }
    return updated;
  }

  async softDelete(id: string, actor: { user?: string; tenant?: string }): Promise<AssetRow | null> {
    const out = await this.deps.repo.softDelete(id, actor);
    if (out) {
      await Promise.all([
        recordAudit(actor.tenant ?? null, 'sales_room.asset.deactivated', 'sales_room_asset', id, actor.user),
        publishAssetDeactivated(id, { slug: out.slug }, actor.user),
      ]);
    }
    return out;
  }

  /**
   * Move a streamed temp file into the canonical content-addressed key
   * and attach to the given asset row. If another row already has the
   * same sha256 (dedupe hit), we still write THIS asset's row to point
   * at the same storage_key — the bytes are shared, the metadata is
   * not.
   */
  async commitUpload(
    assetId: string,
    upload: UploadCommitInput,
    actor: { user?: string; tenant?: string },
  ): Promise<{ asset: AssetRow; deduped: boolean }> {
    const existing = await this.deps.repo.getById(assetId);
    if (!existing) {
      try { await unlink(upload.tempPath); } catch { /* ignore */ }
      throw new UploadError('asset_not_found', `asset ${assetId} not found`, 404);
    }
    if (!isMimeAllowed(existing.asset_type, upload.mimeType)) {
      try { await unlink(upload.tempPath); } catch { /* ignore */ }
      throw new UploadError('mime_not_allowed',
        `MIME ${upload.mimeType} not allowed for asset_type=${existing.asset_type}`, 415);
    }

    const key = contentAddressedKey(upload.sha256, upload.originalFilename);
    const absPath = this.deps.storage.absPath ? this.deps.storage.absPath(key) : null;
    if (!absPath) {
      // Non-FS driver path is W3+. Fail loudly for now.
      try { await unlink(upload.tempPath); } catch { /* ignore */ }
      throw new UploadError('driver_not_supported', 'non-fs storage driver not yet implemented', 500);
    }

    const { deduped } = await commitTempFile(upload.tempPath, absPath);

    const updated = await this.deps.repo.attachUpload(
      assetId,
      {
        storage_driver: this.deps.storage.name,
        storage_key: key,
        mime_type: upload.mimeType,
        file_size_bytes: upload.size,
        content_sha256: upload.sha256,
        original_filename: upload.originalFilename,
      },
      actor,
    );

    if (!updated) {
      throw new UploadError('attach_failed', 'asset disappeared during upload', 500);
    }

    await Promise.all([
      recordAudit(actor.tenant ?? null, 'sales_room.asset.uploaded', 'sales_room_asset', assetId, actor.user, {
        sha256: upload.sha256, size: upload.size, mime: upload.mimeType, deduped,
      }),
      publishAssetUploaded(assetId, {
        sha256: upload.sha256, size: upload.size, mime: upload.mimeType, deduped, key,
      }, actor.user),
    ]);

    return { asset: updated, deduped };
  }
}
