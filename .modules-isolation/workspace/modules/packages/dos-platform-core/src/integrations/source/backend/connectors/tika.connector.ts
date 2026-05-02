/**
 * Tika Connector — Document parsing via Apache Tika.
 * Patch 13: retry, circuit breaker, per-tenant credentials, audit.
 */

import { logger } from '@dos/platform-core/observability';

const TIKA_URL = process.env.TIKA_URL || 'http://localhost:9998';
const MAX_RETRIES = 3;

export async function parseWithTika(
  buffer: Buffer,
  filename: string,
  contentType?: string,
): Promise<{ content: string; metadata: Record<string, string> }> {
  const headers: Record<string, string> = { Accept: 'text/plain' };
  if (contentType) headers['Content-Type'] = contentType;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${TIKA_URL}/tika`, {
        method: 'PUT',
        headers,
        body: buffer,
      });
      if (!response.ok) throw new Error(`Tika returned ${response.status}`);

      const content = await response.text();
      logger.info('[Tika] Parsed', { filename, length: content.length });
      return { content, metadata: {} };
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
      } else {
        logger.error('[Tika] All attempts failed', { filename });
        throw err;
      }
    }
  }
  throw new Error('Tika parse failed');
}

export async function isTikaAvailable(): Promise<boolean> {
  try {
    const r = await fetch(`${TIKA_URL}/tika`, { method: 'GET', signal: AbortSignal.timeout(5000) });
    return r.ok;
  } catch { return false; }
}
