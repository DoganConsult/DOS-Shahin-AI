"use strict";
// Capability invocation helper
// ----------------------------------------------------------------------------
// Lets a module call a sibling-provided capability without hard-coding the
// HTTP route. The orchestrator (services/module-orchestrator-service) is the
// resolver; the SDK only knows how to ask it.
//
//   const c = await capabilities.resolve('foundation.user.lookup');
//   const json = await capabilities.invoke('foundation.user.lookup', {
//     params: { id: 'u_123' },
//   });
//
// Caching: resolved capabilities are memoized for `cacheTtlMs` (default 60s).
// On 404/410 the cache entry is invalidated so a redeploy of the provider
// is picked up within one TTL.
// ----------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.capabilities = exports.CapabilitiesClient = void 0;
exports.enrollTenantModule = enrollTenantModule;
const DEFAULT_BROKER = process.env.CAPABILITY_BROKER_URL || 'http://127.0.0.1:4150';
const DEFAULT_GATEWAY = process.env.GATEWAY_URL || 'http://127.0.0.1:4000';
class CapabilitiesClient {
    cache = new Map();
    brokerBase;
    gatewayBase;
    ttl;
    fetchImpl;
    constructor(opts = {}) {
        this.brokerBase = (opts.brokerBaseUrl || DEFAULT_BROKER).replace(/\/+$/, '');
        this.gatewayBase = (opts.gatewayBaseUrl || DEFAULT_GATEWAY).replace(/\/+$/, '');
        this.ttl = opts.cacheTtlMs ?? 60_000;
        this.fetchImpl = opts.fetchImpl ?? fetch;
    }
    async resolve(capability) {
        const now = Date.now();
        const hit = this.cache.get(capability);
        if (hit && hit.expiresAt > now)
            return hit.value;
        const url = `${this.brokerBase}/capabilities/${encodeURIComponent(capability)}`;
        const r = await this.fetchImpl(url);
        if (r.status === 404 || r.status === 410) {
            this.cache.delete(capability);
            throw new Error(`capability_not_found: ${capability}`);
        }
        if (!r.ok)
            throw new Error(`broker_error_${r.status}: ${capability}`);
        const value = (await r.json());
        if (!value.is_active) {
            this.cache.delete(capability);
            throw new Error(`capability_inactive: ${capability}`);
        }
        this.cache.set(capability, { value, expiresAt: now + this.ttl });
        return value;
    }
    invalidate(capability) {
        if (capability)
            this.cache.delete(capability);
        else
            this.cache.clear();
    }
    async invoke(capability, opts = {}) {
        const cap = await this.resolve(capability);
        if (!cap.http_route)
            throw new Error(`capability_no_http_route: ${capability}`);
        let path = cap.http_route;
        for (const [k, v] of Object.entries(opts.params ?? {})) {
            path = path.replace(`:${k}`, encodeURIComponent(String(v)));
        }
        const qs = new URLSearchParams();
        for (const [k, v] of Object.entries(opts.query ?? {})) {
            if (v !== undefined)
                qs.append(k, String(v));
        }
        const qsStr = qs.toString();
        const url = `${this.gatewayBase}${path.startsWith('/') ? path : `/${path}`}${qsStr ? `?${qsStr}` : ''}`;
        const headers = {
            'accept': 'application/json',
            'x-capability-key': capability,
            'x-consumer-module': process.env.MODULE_CODE || 'unknown',
            ...opts.headers,
        };
        const init = {
            method: opts.method ?? (opts.body ? 'POST' : 'GET'),
            headers,
            signal: opts.signal,
        };
        if (opts.body !== undefined) {
            headers['content-type'] = 'application/json';
            init.body = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
        }
        const r = await this.fetchImpl(url, init);
        if (!r.ok) {
            const text = await r.text().catch(() => '');
            throw new Error(`capability_invoke_${r.status}: ${capability} ${text.slice(0, 200)}`);
        }
        if (r.status === 204)
            return undefined;
        return (await r.json());
    }
}
exports.CapabilitiesClient = CapabilitiesClient;
async function enrollTenantModule(opts) {
    const base = (opts.brokerBaseUrl || DEFAULT_BROKER).replace(/\/+$/, '');
    const f = opts.fetchImpl ?? fetch;
    const idem = opts.idempotency_key ?? `module:${opts.module_code}:v${opts.module_version}:tenant:${opts.tenant_id}`;
    const r = await f(`${base}/enroll`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            tenant_id: opts.tenant_id,
            module_code: opts.module_code,
            module_version: opts.module_version,
            mode_override: opts.mode_override,
            idempotency_key: idem,
        }),
    });
    if (!r.ok) {
        const text = await r.text().catch(() => '');
        throw new Error(`enroll_failed_${r.status}: ${opts.module_code} ${text.slice(0, 200)}`);
    }
    return (await r.json());
}
let _default = null;
exports.capabilities = {
    client() {
        if (!_default)
            _default = new CapabilitiesClient();
        return _default;
    },
    resolve(capability) {
        return this.client().resolve(capability);
    },
    invoke(capability, opts) {
        return this.client().invoke(capability, opts);
    },
    invalidate(capability) { this.client().invalidate(capability); },
    configure(opts) { _default = new CapabilitiesClient(opts); },
};
//# sourceMappingURL=capabilities.js.map