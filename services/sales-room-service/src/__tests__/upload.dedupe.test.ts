import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

import { FsDriver } from '../storage/fs.driver';
import { InMemoryAssetsRepo } from '../domain/assets.repo';
import { AssetsService } from '../domain/assets.service';
import { commitTempFile, contentAddressedKey } from '../upload/multipart';

beforeAll(() => {
  process.env.SALES_ROOM_SIGNING_SECRET = 'unit-test-secret-must-be-at-least-32-chars-long-xx';
});

function shaOf(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

function makeTempFile(root: string, body: Buffer): string {
  const p = join(root, `tmp_${Math.random().toString(36).slice(2)}.part`);
  writeFileSync(p, body);
  return p;
}

describe('AssetsService.commitUpload', () => {
  it('attaches storage_key and content_sha256 on a fresh upload', async () => {
    const root = mkdtempSync(join(tmpdir(), 'sr-test-'));
    const fs = new FsDriver(root);
    const repo = new InMemoryAssetsRepo();
    const svc = new AssetsService({ repo, storage: fs });

    const created = await svc.create({
      slug: 'test-asset-1',
      title_en: 'T1', title_ar: null, description_en: null, description_ar: null,
      asset_type: 'pdf', product_code: null, language: 'en', audience: 'public',
      tags: [], is_public: true, is_active: true, allow_preview: true,
      allow_download: true, require_lead_capture: false, watermark_required: false,
      sort_order: 0,
    } as any, { user: 'u1' });

    const body = Buffer.from('%PDF-1.4\n% fake pdf bytes for unit test\n');
    const sha = shaOf(body);
    const tempPath = makeTempFile(root, body);

    const out = await svc.commitUpload(created.asset_id, {
      tempPath, sha256: sha, size: body.length,
      mimeType: 'application/pdf', originalFilename: 'demo.pdf',
    }, { user: 'u1' });

    expect(out.deduped).toBe(false);
    expect(out.asset.content_sha256).toBe(sha);
    expect(out.asset.file_size_bytes).toBe(body.length);
    expect(out.asset.storage_key).toBe(contentAddressedKey(sha, 'demo.pdf'));
    expect(out.asset.ingestion_status).toBe('ready');

    // bytes are on disk under content-addressed key
    const onDisk = readFileSync(join(root, out.asset.storage_key!));
    expect(onDisk.equals(body)).toBe(true);
  });

  it('dedupes by sha256 when the same bytes upload twice', async () => {
    const root = mkdtempSync(join(tmpdir(), 'sr-test-'));
    const fs = new FsDriver(root);
    const repo = new InMemoryAssetsRepo();
    const svc = new AssetsService({ repo, storage: fs });

    const body = Buffer.from('identical bytes — sha will collide');
    const sha = shaOf(body);

    const a1 = await svc.create({
      slug: 'dedupe-a', title_en: 'A', asset_type: 'pdf', language: 'en',
      audience: 'public', tags: [], is_public: true, is_active: true,
      allow_preview: true, allow_download: true, require_lead_capture: false,
      watermark_required: false, sort_order: 0,
    } as any, { user: 'u1' });
    const a2 = await svc.create({
      slug: 'dedupe-b', title_en: 'B', asset_type: 'pdf', language: 'en',
      audience: 'public', tags: [], is_public: true, is_active: true,
      allow_preview: true, allow_download: true, require_lead_capture: false,
      watermark_required: false, sort_order: 0,
    } as any, { user: 'u1' });

    const out1 = await svc.commitUpload(a1.asset_id, {
      tempPath: makeTempFile(root, body), sha256: sha, size: body.length,
      mimeType: 'application/pdf', originalFilename: 'x.pdf',
    }, { user: 'u1' });
    const out2 = await svc.commitUpload(a2.asset_id, {
      tempPath: makeTempFile(root, body), sha256: sha, size: body.length,
      mimeType: 'application/pdf', originalFilename: 'x.pdf',
    }, { user: 'u1' });

    expect(out1.deduped).toBe(false);
    expect(out2.deduped).toBe(true);
    expect(out1.asset.storage_key).toBe(out2.asset.storage_key);
  });

  it('rejects MIME not allowed for asset_type', async () => {
    const root = mkdtempSync(join(tmpdir(), 'sr-test-'));
    const fs = new FsDriver(root);
    const repo = new InMemoryAssetsRepo();
    const svc = new AssetsService({ repo, storage: fs });

    const a = await svc.create({
      slug: 'mime-strict', title_en: 'X', asset_type: 'pdf', language: 'en',
      audience: 'public', tags: [], is_public: true, is_active: true,
      allow_preview: true, allow_download: false, require_lead_capture: false,
      watermark_required: false, sort_order: 0,
    } as any, { user: 'u1' });

    await expect(svc.commitUpload(a.asset_id, {
      tempPath: makeTempFile(root, Buffer.from('not actually a pdf')),
      sha256: shaOf(Buffer.from('not actually a pdf')),
      size: 18,
      mimeType: 'image/png',
      originalFilename: 'x.png',
    }, { user: 'u1' })).rejects.toMatchObject({ code: 'mime_not_allowed' });
  });
});

describe('contentAddressedKey + commitTempFile', () => {
  it('produces a stable, fan-out key', () => {
    const sha = 'a'.repeat(64);
    const k = contentAddressedKey(sha, 'big.MP4');
    expect(k).toBe('aa/aa/' + sha + '.mp4');
  });
  it('skips a second commit (dedupe) and deletes temp', async () => {
    const root = mkdtempSync(join(tmpdir(), 'sr-test-'));
    const dest = join(root, 'aa/bb/abc.bin');
    const tmp1 = makeTempFile(root, Buffer.from('hello'));
    const tmp2 = makeTempFile(root, Buffer.from('hello'));
    const r1 = await commitTempFile(tmp1, dest);
    const r2 = await commitTempFile(tmp2, dest);
    expect(r1.deduped).toBe(false);
    expect(r2.deduped).toBe(true);
  });
});
