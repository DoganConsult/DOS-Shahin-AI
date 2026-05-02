"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenFgaRebacAdapter = void 0;
/**
 * OpenFGA ReBAC adapter — speaks the OpenFGA HTTP API directly.
 *
 * Dependency-light: no `@openfga/sdk` import. We hit the three endpoints we
 * need: `/stores/:id/check`, `/stores/:id/list-objects`, `/stores/:id/write`.
 * Authentication is via pre-shared token (`OPENFGA_API_TOKEN`) if present —
 * OpenFGA Cloud requires it; self-host typically runs unauthenticated on the
 * internal network.
 *
 * Behavior notes:
 * - Model id is pinned via `OPENFGA_MODEL_ID` to make decisions deterministic
 *   across model upgrades. Each decision stamps this id onto the ledger.
 * - Short timeouts (default 250 ms) — OpenFGA should be fast or we fall back
 *   to native, matching the Cerbos pattern.
 * - `writeTuples` batches up to 100 writes per request (OpenFGA API cap).
 */
const observability_1 = require("@dos/platform-core/observability");
const dauth_config_1 = require("../../dauth.config");
class OpenFgaRebacAdapter {
    name = 'openfga';
    apiUrl;
    storeId;
    modelId;
    apiToken;
    timeoutMs;
    fetchImpl;
    constructor(options = {}) {
        const apiUrl = options.apiUrl ?? dauth_config_1.DAUTH_CONFIG.openfga.apiUrl;
        const storeId = options.storeId ?? dauth_config_1.DAUTH_CONFIG.openfga.storeId;
        const modelId = options.modelId ?? dauth_config_1.DAUTH_CONFIG.openfga.modelId;
        if (!apiUrl)
            throw new Error('[DAuth:OpenFGA] OPENFGA_API_URL is required');
        if (!storeId)
            throw new Error('[DAuth:OpenFGA] OPENFGA_STORE_ID is required');
        if (!modelId)
            throw new Error('[DAuth:OpenFGA] OPENFGA_MODEL_ID is required');
        this.apiUrl = apiUrl.replace(/\/$/, '');
        this.storeId = storeId;
        this.modelId = modelId;
        this.apiToken = options.apiToken ?? process.env.OPENFGA_API_TOKEN;
        this.timeoutMs = options.timeoutMs ?? dauth_config_1.DAUTH_CONFIG.openfga.timeoutMs;
        const f = options.fetchImpl ?? globalThis.fetch;
        if (!f)
            throw new Error('[DAuth:OpenFGA] no fetch impl available');
        this.fetchImpl = f;
    }
    async check(request) {
        const started = Date.now();
        try {
            const res = await this.call('check', {
                authorization_model_id: this.modelId,
                tuple_key: {
                    user: request.user,
                    relation: request.relation,
                    object: request.object,
                },
                contextual_tuples: request.contextualTuples
                    ? { tuple_keys: request.contextualTuples.map((t) => ({
                            user: t.user, relation: t.relation, object: t.object,
                        })) }
                    : undefined,
            });
            if (!res.ok) {
                observability_1.logger.warn('[DAuth:OpenFGA] check returned non-2xx', { status: res.status });
                return {
                    allowed: false,
                    source: 'openfga',
                    modelVersion: this.modelId,
                    latencyMs: Date.now() - started,
                    trace: `unavailable: HTTP ${res.status}`,
                };
            }
            const body = (await res.json());
            return {
                allowed: !!body.allowed,
                source: 'openfga',
                modelVersion: this.modelId,
                latencyMs: Date.now() - started,
                trace: body.resolution,
            };
        }
        catch (err) {
            observability_1.logger.warn('[DAuth:OpenFGA] check failed', {
                error: err instanceof Error ? err.message : String(err),
            });
            return {
                allowed: false,
                source: 'openfga',
                modelVersion: this.modelId,
                latencyMs: Date.now() - started,
                trace: 'unavailable',
            };
        }
    }
    async listObjects(request) {
        try {
            const res = await this.call('list-objects', {
                authorization_model_id: this.modelId,
                user: request.user,
                relation: request.relation,
                type: request.type,
            });
            if (!res.ok)
                return { objectIds: [], source: 'openfga', modelVersion: this.modelId };
            const body = (await res.json());
            return {
                objectIds: (body.objects ?? []).map((o) => o.split(':')[1] ?? o),
                source: 'openfga',
                modelVersion: this.modelId,
            };
        }
        catch (err) {
            observability_1.logger.warn('[DAuth:OpenFGA] list-objects failed', {
                error: err instanceof Error ? err.message : String(err),
            });
            return { objectIds: [], source: 'openfga', modelVersion: this.modelId };
        }
    }
    async writeTuples(tuples) {
        if (tuples.length === 0)
            return;
        const batches = chunk(tuples, 100);
        for (const batch of batches) {
            const writes = batch.filter((t) => t.op === 'write')
                .map((t) => ({ user: t.user, relation: t.relation, object: t.object }));
            const deletes = batch.filter((t) => t.op === 'delete')
                .map((t) => ({ user: t.user, relation: t.relation, object: t.object }));
            const body = {
                authorization_model_id: this.modelId,
            };
            if (writes.length > 0)
                body.writes = { tuple_keys: writes };
            if (deletes.length > 0)
                body.deletes = { tuple_keys: deletes };
            const res = await this.call('write', body);
            if (!res.ok) {
                const text = await res.text().catch(() => '');
                throw new Error(`[DAuth:OpenFGA] write failed (${res.status}): ${text}`);
            }
        }
    }
    async currentModelVersion() {
        return this.modelId;
    }
    async call(endpoint, body) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
            return await this.fetchImpl(`${this.apiUrl}/stores/${this.storeId}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.apiToken ? { Authorization: `Bearer ${this.apiToken}` } : {}),
                },
                body: JSON.stringify(body),
                signal: controller.signal,
            });
        }
        finally {
            clearTimeout(timer);
        }
    }
}
exports.OpenFgaRebacAdapter = OpenFgaRebacAdapter;
function chunk(arr, n) {
    const out = [];
    for (let i = 0; i < arr.length; i += n)
        out.push(arr.slice(i, i + n));
    return out;
}
//# sourceMappingURL=openfga.adapter.js.map