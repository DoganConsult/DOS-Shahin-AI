import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, stat, unlink } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import type { StorageDriver, PutObjectInput, PutObjectResult } from './driver';

export class FsDriver implements StorageDriver {
  readonly name = 'fs' as const;

  constructor(private readonly root: string) {}

  private resolve(key: string): string {
    // Block path traversal: key must be a relative POSIX-style path.
    const safe = normalize(key).replace(/^([./\\]+)+/, '');
    if (safe.includes('..')) throw new Error(`fs.driver: invalid key ${key}`);
    return join(this.root, safe);
  }

  /** Absolute filesystem path for a key. Exposed for content-addressed
   *  commit (rename from temp). Path-traversal-checked. */
  absPath(key: string): string {
    return this.resolve(key);
  }

  async put(input: PutObjectInput): Promise<PutObjectResult> {
    const abs = this.resolve(input.key);
    await mkdir(dirname(abs), { recursive: true });

    const hash = createHash('sha256');
    let size = 0;

    const source: Readable = Buffer.isBuffer(input.body)
      ? Readable.from(input.body)
      : input.body;

    // Tee: write to disk and hash simultaneously.
    const sink = createWriteStream(abs);
    source.on('data', (chunk: Buffer) => {
      hash.update(chunk);
      size += chunk.length;
    });
    await pipeline(source, sink);

    return { key: input.key, sha256: hash.digest('hex'), size };
  }

  async stream(key: string): Promise<Readable> {
    return createReadStream(this.resolve(key));
  }

  async head(key: string): Promise<{ size: number } | null> {
    try {
      const s = await stat(this.resolve(key));
      return { size: s.size };
    } catch (err: any) {
      if (err?.code === 'ENOENT') return null;
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.resolve(key));
    } catch (err: any) {
      if (err?.code !== 'ENOENT') throw err;
    }
  }
}
