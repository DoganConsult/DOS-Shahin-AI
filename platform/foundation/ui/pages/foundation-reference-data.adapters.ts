/**
 * Pure-TS adapters for the Foundation Reference Data page.
 * Kept Angular-free so they can be unit-tested under a plain Node vitest
 * environment without pulling Angular partial-compiled bundles.
 *
 * The component (foundation-reference-data.component.ts) re-exports these.
 */

export interface RefItem {
  id?: string;
  code?: string;
  name_en?: string;
  name_ar?: string;
  [k: string]: unknown;
}

/**
 * Single documented place where `getReferenceData(endpoint)` responses are
 * normalized. Backends may return an array or an envelope with
 * `data`/`items`/`rows` (in that priority). Any other shape → `[]`.
 *
 * This deliberately does NOT silently pass through arbitrary objects — when
 * the backend drifts, the adapter returns [] and the caller can surface an
 * empty / error state. No hardcoded fallback content is ever emitted.
 */
export function normalizeReferenceItems(res: unknown): RefItem[] {
  if (Array.isArray(res)) return res as RefItem[];
  if (res && typeof res === 'object') {
    const obj = res as Record<string, unknown>;
    for (const key of ['data', 'items', 'rows'] as const) {
      const v = obj[key];
      if (Array.isArray(v)) return v as RefItem[];
    }
  }
  return [];
}
