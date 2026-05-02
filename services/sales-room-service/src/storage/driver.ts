import type { Readable } from 'node:stream';

export interface PutObjectInput {
  key: string;
  body: Buffer | Readable;
  contentType: string;
  contentLength?: number;
  metadata?: Record<string, string>;
}

export interface PutObjectResult {
  key: string;
  sha256: string;
  size: number;
}

export interface StorageDriver {
  readonly name: 'fs' | 's3' | 'r2';
  put(input: PutObjectInput): Promise<PutObjectResult>;
  stream(key: string): Promise<Readable>;
  head(key: string): Promise<{ size: number; contentType?: string } | null>;
  delete(key: string): Promise<void>;
  /** Optional: filesystem-resident drivers expose the absolute path
   *  so callers can rename a temp file directly into the canonical
   *  key (avoids re-streaming bytes). Non-FS drivers must return null. */
  absPath?(key: string): string | null;
}
