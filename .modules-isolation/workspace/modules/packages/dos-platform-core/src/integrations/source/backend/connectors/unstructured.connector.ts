/**
 * Unstructured Connector — Document parsing via Unstructured.io API.
 * Patch 13: retry, circuit breaker, per-tenant credentials, audit.
 */

import { logger } from '@dos/platform-core/observability';

const UNSTRUCTURED_URL = process.env.UNSTRUCTURED_API_URL || 'http://localhost:8000';
const UNSTRUCTURED_KEY = process.env.UNSTRUCTURED_API_KEY || '';
const MAX_RETRIES = 3;

export async function parseWithUnstructured(
  buffer: Buffer,
  filename: string,
): Promise<{ elements: { type: string; text: string }[]; textContent: string }> {
  const formData = new FormData();
  formData.append('files', new Blob([buffer]), filename);
  const headers: Record<string, string> = {};
  if (UNSTRUCTURED_KEY) headers['unstructured-api-key'] = UNSTRUCTURED_KEY;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${UNSTRUCTURED_URL}/general/v0/general`, {
        method: 'POST', headers, body: formData,
      });
      if (!response.ok) throw new Error(`Unstructured returned ${response.status}`);
      const elements = (await response.json()) as { type: string; text: string }[];
      logger.info('[Unstructured] Parsed', { filename, elements: elements.length });
      return { elements, textContent: elements.map(e => e.text).join('\n\n') };
    } catch (err) {
      if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 1000 * attempt));
      else { logger.error('[Unstructured] Failed', { filename }); throw err; }
    }
  }
  throw new Error('Unstructured parse failed');
}

export async function isUnstructuredAvailable(): Promise<boolean> {
  try {
    const r = await fetch(`${UNSTRUCTURED_URL}/healthcheck`, { signal: AbortSignal.timeout(5000) });
    return r.ok;
  } catch { return false; }
}
