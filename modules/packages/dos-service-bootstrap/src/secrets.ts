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

/** Normalize vault/HTTP JSON wrappers and plain-text secret payloads. */
export function trimSecret(raw: string): string {
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
export function buildHttpSecretUrl(baseRaw: string, httpPath: string): string {
  const base = baseRaw.replace(/\/$/, '');
  const trimmed = httpPath.replace(/^\//, '');
  const segments = trimmed.split('/').filter(Boolean).map((s) => encodeURIComponent(s));
  return segments.length ? `${base}/${segments.join('/')}` : base;
}

export type HttpSecretProviderOptions = {
  /** Overrides `DOS_SECRET_HTTP_BASE_URL` when set. */
  baseUrl?: string;
  /** Overrides `DOS_SECRET_HTTP_BEARER` when set. */
  bearer?: string;
};

/**
 * Injectable HTTP secret backend for tests and services that need an explicit
 * base URL instead of process env alone. Defaults match {@link resolveSecret} HTTP stage.
 */
export class HttpSecretProvider {
  constructor(private readonly opts: HttpSecretProviderOptions = {}) {}

  async fetchSecret(httpPath: string, timeoutMs: number): Promise<string | undefined> {
    const base = (this.opts.baseUrl ?? process.env.DOS_SECRET_HTTP_BASE_URL)?.trim();
    if (!base) return undefined;

    const url = buildHttpSecretUrl(base, httpPath);
    const bearer = (this.opts.bearer ?? process.env.DOS_SECRET_HTTP_BEARER)?.trim();

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
}

let defaultHttpProvider: HttpSecretProvider | undefined;

/** Singleton used by {@link resolveSecret} for the HTTP stage (env-backed by default). */
export function getDefaultHttpSecretProvider(): HttpSecretProvider {
  if (!defaultHttpProvider) defaultHttpProvider = new HttpSecretProvider();
  return defaultHttpProvider;
}

async function fetchHttpSecret(httpPath: string, timeoutMs: number): Promise<string | undefined> {
  return getDefaultHttpSecretProvider().fetchSecret(httpPath, timeoutMs);
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

/**
 * Cached bearer token for OpenFGA HTTP writes/checks.
 *
 * Uses {@link resolveSecret} with:
 * - Vault path `openfga/api_token` (when Vault enabled)
 * - HTTP `openfga/api_token` under {@link DOS_SECRET_HTTP_BASE_URL}
 * - Env `OPENFGA_API_TOKEN`
 *
 * Env:
 * - `OPENFGA_SECRET_CACHE_TTL_MS` — cache TTL in ms (default 300000). Set `0` to disable caching.
 */
let openFgaApiTokenCache: { token: string; fetchedAt: number } | null = null;

export async function resolveOpenFgaApiToken(timeoutMs = 8000): Promise<string | undefined> {
  const ttlRaw = process.env.OPENFGA_SECRET_CACHE_TTL_MS;
  const ttlMs = ttlRaw === undefined ? 300_000 : Number(ttlRaw);
  const now = Date.now();
  if (ttlMs > 0 && openFgaApiTokenCache && now - openFgaApiTokenCache.fetchedAt < ttlMs) {
    return openFgaApiTokenCache.token || undefined;
  }

  const token = await resolveSecret({
    key: 'OPENFGA_API_TOKEN',
    vaultPath: 'openfga/api_token',
    env: 'OPENFGA_API_TOKEN',
    httpPath: 'openfga/api_token',
    timeoutMs,
  });

  if (token && ttlMs > 0) {
    openFgaApiTokenCache = { token, fetchedAt: now };
  }

  return token;
}

/** Drop cached OpenFGA token (e.g. after rotation or failed auth). */
export function invalidateOpenFgaApiTokenCache(): void {
  openFgaApiTokenCache = null;
}
