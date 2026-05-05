// Thin wrapper around node-vault that resolves a single secret path with
// caching. Designed to replace .env-stored secrets gradually — services
// keep working if VAULT_ADDR is unset (falls back to the env var directly).
//
// Configure via env:
//   VAULT_ADDR             — e.g. http://127.0.0.1:8200
//   VAULT_TOKEN            — root or scoped token
//   VAULT_KV_PATH_PREFIX   — defaults to "secret/data/dos" (kv-v2 layout)
//
// Usage:
//   import { getSecret } from '@dos/service-bootstrap/vault';
//   const dbPassword = await getSecret('database/password', { fallbackEnv: 'DB_PASSWORD' });

import vault from 'node-vault';

let _client: ReturnType<typeof vault> | null = null;
const _cache = new Map<string, { value: string; expiresAt: number }>();
const TTL_MS = 60_000;

function getClient(): ReturnType<typeof vault> | null {
  if (_client) return _client;
  if (!process.env.VAULT_ADDR || !process.env.VAULT_TOKEN) return null;
  _client = vault({
    apiVersion: 'v1',
    endpoint: process.env.VAULT_ADDR,
    token: process.env.VAULT_TOKEN,
  });
  return _client;
}

export interface GetSecretOptions {
  /** Env var name to read if Vault is unavailable. */
  fallbackEnv?: string;
  /** Override the kv-v2 mount prefix. */
  pathPrefix?: string;
  /**
   * When false, do not read `fallbackEnv` after Vault misses — lets callers chain HTTP/other providers first.
   * Default true.
   */
  includeEnvironmentFallback?: boolean;
}

export async function getSecret(key: string, opts: GetSecretOptions = {}): Promise<string | undefined> {
  const cached = _cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const client = getClient();
  if (client) {
    try {
      const prefix = opts.pathPrefix ?? process.env.VAULT_KV_PATH_PREFIX ?? 'secret/data/dos';
      const result = await client.read(`${prefix}/${key}`);
      const value = result?.data?.data?.value ?? result?.data?.value;
      if (typeof value === 'string') {
        _cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
        return value;
      }
    } catch {
      // fall through to env
    }
  }

  const allowEnv = opts.includeEnvironmentFallback !== false;
  if (allowEnv && opts.fallbackEnv) return process.env[opts.fallbackEnv];
  return undefined;
}

export function clearSecretCache(): void {
  _cache.clear();
}

export function vaultEnabled(): boolean {
  return !!getClient();
}
