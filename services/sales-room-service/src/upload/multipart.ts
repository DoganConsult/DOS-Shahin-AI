import Busboy from 'busboy';
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, rename, stat, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { Request } from 'express';
import { isMimeAllowed, maxUploadBytes } from './mime';

export interface ParsedUpload {
  fields: Record<string, string>;
  file: {
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
    tempPath: string;       // absolute path on disk (caller must move/delete)
  } | null;
}

export interface ParseOptions {
  /**
   * Asset type used to validate MIME. If not provided as a form field
   * named `asset_type` first in the stream, we accept anything and let
   * the service layer enforce later. (Production path: form must send
   * asset_type before the file part.)
   */
  enforceAssetTypeFromField?: boolean;
  maxBytes?: number;
}

export class UploadError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) {
    super(message);
  }
}

/**
 * Stream a multipart/form-data request through busboy. The file part
 * is piped to a temp file while sha256 + size are computed in one
 * pass. Caller is responsible for moving the temp file into the
 * canonical content-addressed key (or deleting it on dedupe hit).
 */
export async function parseUpload(req: Request, opts: ParseOptions = {}): Promise<ParsedUpload> {
  const maxBytes = opts.maxBytes ?? maxUploadBytes();
  const fields: Record<string, string> = {};
  let fileResult: ParsedUpload['file'] = null;
  let fileError: Error | null = null;

  const tmpRoot = join(tmpdir(), 'sales-room-uploads');
  await mkdir(tmpRoot, { recursive: true });

  const bb = Busboy({
    headers: req.headers,
    limits: {
      fileSize: maxBytes,
      files: 1,
      fields: 50,
    },
  });

  let pendingFile: Promise<void> | null = null;

  await new Promise<void>((resolve, reject) => {
    bb.on('field', (name, val) => {
      // Reject suspicious field names (basic allow-list)
      if (!/^[a-zA-Z0-9_]+$/.test(name)) return;
      fields[name] = String(val).slice(0, 4096);
    });

    bb.on('file', (fieldName, fileStream, info) => {
      if (fieldName !== 'file') {
        fileStream.resume();
        return;
      }
      const { filename, mimeType } = info;
      const safeName = String(filename || 'upload.bin').replace(/[\r\n\\/\x00]/g, '_').slice(0, 255);

      if (opts.enforceAssetTypeFromField) {
        const assetType = fields['asset_type'];
        if (!assetType) {
          fileError = new UploadError('asset_type_missing', 'asset_type field must precede file part', 400);
          fileStream.resume();
          return;
        }
        if (!isMimeAllowed(assetType, mimeType)) {
          fileError = new UploadError('mime_not_allowed', `MIME ${mimeType} not allowed for asset_type=${assetType}`, 415);
          fileStream.resume();
          return;
        }
      }

      const tempPath = join(tmpRoot, `${Date.now()}_${process.pid}_${Math.random().toString(36).slice(2, 10)}.part`);
      const hash = createHash('sha256');
      let size = 0;
      let truncated = false;

      fileStream.on('data', (chunk: Buffer) => {
        hash.update(chunk);
        size += chunk.length;
      });
      fileStream.on('limit', () => {
        truncated = true;
      });

      const writer = createWriteStream(tempPath);
      pendingFile = pipeline(fileStream, writer)
        .then(async () => {
          if (truncated) {
            try { await unlink(tempPath); } catch { /* ignore */ }
            fileError = new UploadError('file_too_large', `file exceeds ${maxBytes} bytes`, 413);
            return;
          }
          fileResult = {
            originalFilename: safeName,
            mimeType,
            sizeBytes: size,
            sha256: hash.digest('hex'),
            tempPath,
          };
        })
        .catch(async (err) => {
          try { await unlink(tempPath); } catch { /* ignore */ }
          fileError = err instanceof Error ? err : new Error(String(err));
        });
    });

    bb.on('finish', async () => {
      try {
        if (pendingFile) await pendingFile;
        resolve();
      } catch (err) {
        reject(err);
      }
    });
    bb.on('error', reject);

    req.pipe(bb);
  });

  if (fileError) throw fileError;

  // Final sanity: temp file size must match the streaming-computed size.
  if (fileResult) {
    const s = await stat(fileResult.tempPath);
    if (s.size !== fileResult.sizeBytes) {
      try { await unlink(fileResult.tempPath); } catch { /* ignore */ }
      throw new UploadError('size_mismatch', 'computed size does not match disk size', 500);
    }
  }

  return { fields, file: fileResult };
}

/**
 * Move a temp file into the canonical content-addressed location.
 * Idempotent: if the target already exists (dedupe hit), the temp file
 * is deleted and the existing key is returned.
 */
export async function commitTempFile(
  tempPath: string,
  destAbsPath: string,
): Promise<{ deduped: boolean }> {
  await mkdir(join(destAbsPath, '..'), { recursive: true });
  try {
    const existing = await stat(destAbsPath);
    if (existing.isFile()) {
      // Dedupe hit — drop the temp file.
      try { await unlink(tempPath); } catch { /* ignore */ }
      return { deduped: true };
    }
  } catch (err: any) {
    if (err?.code !== 'ENOENT') throw err;
  }
  // ENOENT — atomic rename into place.
  await rename(tempPath, destAbsPath);
  return { deduped: false };
}

export function contentAddressedKey(sha256: string, originalFilename: string): string {
  // Two-level fan-out so a single dir never holds 1M+ files.
  const a = sha256.slice(0, 2);
  const b = sha256.slice(2, 4);
  // Preserve extension for nicer Content-Disposition default; strip dirs.
  const m = /\.([a-zA-Z0-9]{1,16})$/.exec(originalFilename);
  const ext = m ? '.' + m[1].toLowerCase() : '';
  return `${a}/${b}/${sha256}${ext}`;
}
