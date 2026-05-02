import { logger } from '@dos/platform-core/observability';

const AI_SERVICE_URL = process.env.AI_ENGINE_SERVICE_URL || 'http://127.0.0.1:4000';

/**
 * Request a vector embedding for `text` from the ai-engine-service.
 *
 * Call shapes:
 *   embedText(text)                            — platform-default tenant
 *   embedText(tenantId, text, metadata?)       — explicit tenant scope
 *
 * Returns an empty array when ai-engine-service is unreachable or the
 * response is not well-formed, so callers can fall back to keyword
 * search without branching on error types.
 */
export async function embedText(textOrTenantId: string): Promise<number[]>;
export async function embedText(
  tenantId: string,
  text: string,
  metadata?: Record<string, unknown>,
): Promise<number[]>;
export async function embedText(
  first: string,
  second?: string,
  metadata?: Record<string, unknown>,
): Promise<number[]> {
  const tenantId = second === undefined ? 'platform' : first;
  const text = second === undefined ? first : second;
  try {
    const res = await fetch(`${AI_SERVICE_URL}/api/ai/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenantId },
      body: JSON.stringify({ text, metadata }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { embedding: number[] };
    return data.embedding || [];
  } catch {
    logger.warn('[MemoryStore] Failed to embed text');
    return [];
  }
}

export function vectorToSql(vec: number[]): string {
  return `[${vec.join(',')}]`;
}
