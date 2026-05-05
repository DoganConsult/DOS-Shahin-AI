/**
 * SecretResolver — ordered chain: Vault KV → optional HTTP backend → env fallback.
 *
 * Env:
 * - DOS_SECRET_HTTP_BASE_URL — optional; GET `${base}/${encodedSegments}` (Bearer optional via DOS_SECRET_HTTP_BEARER)
 *
 * Vault uses existing {@link getSecret} / {@link vaultEnabled}.
 */

import { getSecret, vaultEnabled } from './vault';

export type ResolveSecretOptions = {
  /** Logical name for logs */
  key: string;
  /** Vault KV path (relative). Example: openfga/api_token */
  vaultPath?: string;
  /** Env var name for final fallback */
  env?: string;
  /** Path appended to DOS_SECRET_HTTP_BASE_URL (defaults to vaultPath or key lowercased with underscores → slashes) */
  httpPath?: string;
  timeoutMs?: number;
};

function trimSecret(raw: string): string {
  const s = raw.trim();
  try {
    const parsed = JSON.parse(s) as { value?: string; secret?: string; data?: string };
    if (typeof parsed?.value === 'string') return parsed.value.trim();
    if (typeof parsed?.secret === 'string') return parsed.secret.trim();
    if (typeof parsed?.data === 'string') return parsed.data.trim();
  } catch {
    /* plain text */
  }
  return s;
}

/** Join base URL with a logical secret path; encode each segment so slashes stay path separators. */
function buildHttpSecretUrl(baseRaw: string, httpPath: string): string {
  const base = baseRaw.replace(/\/$/, '');
  const trimmed = httpPath.replace(/^\//, '');
  const segments = trimmed.split('/').filter(Boolean).map((s) => encodeURIComponent(s));
  return segments.length ? `${base}/${segments.join('/')}` : base;
}

async function fetchHttpSecret(httpPath: string, timeoutMs: number): Promise<string | undefined> {
  const base = process.env.DOS_SECRET_HTTP_BASE_URL?.trim();
  if (!base) return undefined;

  const url = buildHttpSecretUrl(base, httpPath);
  const bearer = process.env.DOS_SECRET_HTTP_BEARER?.trim();

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: ctrl.signal,
      headers: bearer ? { Authorization: `Bearer ${bearer}` } : undefined,
    });
    if (!res.ok) return undefined;
    const text = await res.text();
    return trimSecret(text) || undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolve a secret using Vault (if enabled), then HTTP backend (if DOS_SECRET_HTTP_BASE_URL),
 * then optional env var.
 */
export async function resolveSecret(opts: ResolveSecretOptions): Promise<string | undefined> {
  const { key, vaultPath, env, timeoutMs = 8000 } = opts;
  const path =
    vaultPath ??
    opts.httpPath ??
    key.toLowerCase().replace(/_/g, '/');

  if (vaultEnabled()) {
    try {
      const v = await getSecret(path, {
        includeEnvironmentFallback: false,
      });
      if (typeof v === 'string' && v.trim()) return trimSecret(v);
    } catch {
      /* fall through */
    }
  }

  const httpVal = await fetchHttpSecret(opts.httpPath ?? path, timeoutMs);
  if (httpVal) return httpVal;

  if (env && process.env[env]) {
    const e = String(process.env[env]).trim();
    if (e) return e;
  }

  return undefined;
}
