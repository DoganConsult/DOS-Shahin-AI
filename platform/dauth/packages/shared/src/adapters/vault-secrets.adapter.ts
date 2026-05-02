/**
 * Vault secrets adapter — HashiCorp Vault KV v2 HTTP client.
 *
 * Gated on `DAUTH_VAULT_ENABLED=true`. When Vault isn't deployed (current
 * state per declarations/dauth-activation-status.md), callers should
 * instantiate via `buildDefaultSecretsAdapter()` which returns the env-based
 * adapter — no Vault calls are made.
 *
 * Scope: read-only. DAuth does not write to Vault; secrets are rotated via
 * the usual Vault tooling and DAuth just reads.
 */
import type { SecretsAdapter } from '../dauth-ports/secrets.port';
import { EnvSecretsAdapter } from '../dauth-ports/secrets.port';

export interface VaultSecretsOptions {
  /** Required. Vault address (e.g. `https://vault.internal:8200`). */
  addr: string;
  /** Required. Vault token with read policy on the configured mount. */
  token: string;
  /** KV v2 mount path. Defaults to `secret`. */
  mount?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export class VaultSecretsAdapter implements SecretsAdapter {
  readonly name = 'vault' as const;
  private readonly addr: string;
  private readonly token: string;
  private readonly mount: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: VaultSecretsOptions) {
    if (!opts.addr) throw new Error('[DAuth:Vault] addr is required');
    if (!opts.token) throw new Error('[DAuth:Vault] token is required');
    this.addr = opts.addr.replace(/\/$/, '');
    this.token = opts.token;
    this.mount = opts.mount ?? 'secret';
    this.timeoutMs = opts.timeoutMs ?? 2000;
    const f = opts.fetchImpl ?? globalThis.fetch;
    if (!f) throw new Error('[DAuth:Vault] no fetch impl available');
    this.fetchImpl = f;
  }

  /**
   * Read a secret. `path` is the logical Vault path under the mount
   * (e.g. "keycloak/admin" → GET /v1/{mount}/data/keycloak/admin).
   * Keys within the secret payload are joined with `#` (e.g.
   * "keycloak/admin#client_secret" → field `client_secret`).
   */
  async getSecret(path: string): Promise<string | null> {
    const [kvPath, field] = path.split('#');
    const url = `${this.addr}/v1/${encodeURIComponent(this.mount)}/data/${kvPath.split('/').map(encodeURIComponent).join('/')}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this.fetchImpl(url, {
        headers: { 'X-Vault-Token': this.token, Accept: 'application/json' },
        signal: controller.signal,
      });
      if (res.status === 404) return null;
      if (!res.ok) return null;
      const body = (await res.json()) as { data?: { data?: Record<string, unknown> } };
      const record = body.data?.data;
      if (!record) return null;
      if (field) {
        const v = record[field];
        return typeof v === 'string' ? v : v != null ? String(v) : null;
      }
      // Whole-secret read: return JSON string so caller can parse.
      return JSON.stringify(record);
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * Factory — returns Vault adapter when config is complete + flag is on,
 * otherwise the env adapter. Never throws; failures fall through to env.
 */
export function buildDefaultSecretsAdapter(): SecretsAdapter {
  const enabled = (process.env.DAUTH_VAULT_ENABLED ?? 'false').toLowerCase() === 'true';
  const addr = process.env.VAULT_ADDR;
  const tokenEnv = process.env.VAULT_TOKEN_ENV ?? 'VAULT_TOKEN';
  const token = process.env[tokenEnv];
  const mount = process.env.VAULT_MOUNT ?? 'secret';
  if (!enabled || !addr || !token) {
    return new EnvSecretsAdapter();
  }
  try {
    return new VaultSecretsAdapter({ addr, token, mount });
  } catch {
    return new EnvSecretsAdapter();
  }
}
