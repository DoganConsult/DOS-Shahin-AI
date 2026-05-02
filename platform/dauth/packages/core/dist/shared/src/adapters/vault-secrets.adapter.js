"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VaultSecretsAdapter = void 0;
exports.buildDefaultSecretsAdapter = buildDefaultSecretsAdapter;
const secrets_port_1 = require("../dauth-ports/secrets.port");
class VaultSecretsAdapter {
    name = 'vault';
    addr;
    token;
    mount;
    timeoutMs;
    fetchImpl;
    constructor(opts) {
        if (!opts.addr)
            throw new Error('[DAuth:Vault] addr is required');
        if (!opts.token)
            throw new Error('[DAuth:Vault] token is required');
        this.addr = opts.addr.replace(/\/$/, '');
        this.token = opts.token;
        this.mount = opts.mount ?? 'secret';
        this.timeoutMs = opts.timeoutMs ?? 2000;
        const f = opts.fetchImpl ?? globalThis.fetch;
        if (!f)
            throw new Error('[DAuth:Vault] no fetch impl available');
        this.fetchImpl = f;
    }
    /**
     * Read a secret. `path` is the logical Vault path under the mount
     * (e.g. "keycloak/admin" → GET /v1/{mount}/data/keycloak/admin).
     * Keys within the secret payload are joined with `#` (e.g.
     * "keycloak/admin#client_secret" → field `client_secret`).
     */
    async getSecret(path) {
        const [kvPath, field] = path.split('#');
        const url = `${this.addr}/v1/${encodeURIComponent(this.mount)}/data/${kvPath.split('/').map(encodeURIComponent).join('/')}`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
            const res = await this.fetchImpl(url, {
                headers: { 'X-Vault-Token': this.token, Accept: 'application/json' },
                signal: controller.signal,
            });
            if (res.status === 404)
                return null;
            if (!res.ok)
                return null;
            const body = (await res.json());
            const record = body.data?.data;
            if (!record)
                return null;
            if (field) {
                const v = record[field];
                return typeof v === 'string' ? v : v != null ? String(v) : null;
            }
            // Whole-secret read: return JSON string so caller can parse.
            return JSON.stringify(record);
        }
        catch {
            return null;
        }
        finally {
            clearTimeout(timer);
        }
    }
}
exports.VaultSecretsAdapter = VaultSecretsAdapter;
/**
 * Factory — returns Vault adapter when config is complete + flag is on,
 * otherwise the env adapter. Never throws; failures fall through to env.
 */
function buildDefaultSecretsAdapter() {
    const enabled = (process.env.DAUTH_VAULT_ENABLED ?? 'false').toLowerCase() === 'true';
    const addr = process.env.VAULT_ADDR;
    const tokenEnv = process.env.VAULT_TOKEN_ENV ?? 'VAULT_TOKEN';
    const token = process.env[tokenEnv];
    const mount = process.env.VAULT_MOUNT ?? 'secret';
    if (!enabled || !addr || !token) {
        return new secrets_port_1.EnvSecretsAdapter();
    }
    try {
        return new VaultSecretsAdapter({ addr, token, mount });
    }
    catch {
        return new secrets_port_1.EnvSecretsAdapter();
    }
}
//# sourceMappingURL=vault-secrets.adapter.js.map