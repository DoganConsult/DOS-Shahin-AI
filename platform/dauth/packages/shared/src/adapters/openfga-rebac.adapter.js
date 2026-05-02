"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenFgaRebacAdapter = void 0;
class OpenFgaRebacAdapter {
    name = 'openfga';
    apiUrl;
    storeId;
    modelId;
    apiToken;
    timeoutMs;
    retryAttempts;
    higherConsistency;
    fetchImpl;
    onLatency;
    constructor(opts) {
        if (!opts.apiUrl)
            throw new Error('[@dos/auth] OpenFgaRebacAdapter requires apiUrl');
        if (!opts.storeId)
            throw new Error('[@dos/auth] OpenFgaRebacAdapter requires storeId');
        if (!opts.modelId)
            throw new Error('[@dos/auth] OpenFgaRebacAdapter requires modelId');
        this.apiUrl = opts.apiUrl.replace(/\/$/, '');
        this.storeId = opts.storeId;
        this.modelId = opts.modelId;
        this.apiToken = opts.apiToken;
        this.timeoutMs = opts.timeoutMs ?? 250;
        this.retryAttempts = Math.max(0, opts.retryAttempts ?? 0);
        this.higherConsistency = !!opts.higherConsistency;
        const f = opts.fetchImpl ?? globalThis.fetch;
        if (!f)
            throw new Error('[@dos/auth] no fetch impl available');
        this.fetchImpl = f;
        this.onLatency = opts.onLatency;
    }
    async check(request) {
        const started = Date.now();
        const totalAttempts = 1 + this.retryAttempts;
        let lastErrTrace = 'unavailable: unknown';
        for (let attempt = 0; attempt < totalAttempts; attempt++) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), this.timeoutMs);
            try {
                const body = {
                    authorization_model_id: this.modelId,
                    tuple_key: {
                        user: request.user,
                        relation: request.relation,
                        object: request.object,
                    },
                };
                if (this.higherConsistency)
                    body.consistency = 'HIGHER_CONSISTENCY';
                const res = await this.fetchImpl(`${this.apiUrl}/stores/${this.storeId}/check`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(this.apiToken ? { Authorization: `Bearer ${this.apiToken}` } : {}),
                    },
                    body: JSON.stringify(body),
                    signal: controller.signal,
                });
                if (!res.ok) {
                    lastErrTrace = `unavailable: HTTP ${res.status}`;
                    // 4xx = client error → no retry; 5xx = retry next iteration
                    if (res.status < 500 || attempt === totalAttempts - 1) {
                        const lat = Date.now() - started;
                        this.onLatency?.('check', lat, false);
                        return {
                            allowed: false,
                            source: 'openfga',
                            modelVersion: this.modelId,
                            latencyMs: lat,
                            trace: lastErrTrace,
                        };
                    }
                }
                else {
                    const json = (await res.json());
                    const lat = Date.now() - started;
                    this.onLatency?.('check', lat, true);
                    return {
                        allowed: !!json.allowed,
                        source: 'openfga',
                        modelVersion: this.modelId,
                        latencyMs: lat,
                        trace: json.resolution,
                    };
                }
            }
            catch (err) {
                lastErrTrace = `unavailable: ${err instanceof Error ? err.message : String(err)}`;
                if (attempt === totalAttempts - 1) {
                    const lat = Date.now() - started;
                    this.onLatency?.('check', lat, false);
                    return {
                        allowed: false,
                        source: 'openfga',
                        modelVersion: this.modelId,
                        latencyMs: lat,
                        trace: lastErrTrace,
                    };
                }
            }
            finally {
                clearTimeout(timer);
            }
            // Jittered backoff: 25-75ms * (attempt+1)
            const base = 25 * (attempt + 1);
            const jitter = Math.floor(Math.random() * 50);
            await new Promise((resolve) => setTimeout(resolve, base + jitter));
        }
        const lat = Date.now() - started;
        this.onLatency?.('check', lat, false);
        return {
            allowed: false,
            source: 'openfga',
            modelVersion: this.modelId,
            latencyMs: lat,
            trace: lastErrTrace,
        };
    }
    async currentModelVersion() {
        return this.modelId;
    }
    /**
     * Write or delete relation tuples in bulk. Used by the tuple-sync
     * subscribers to mirror DAuth domain events into the OpenFGA graph.
     *
     * Partitions by op (writes vs deletes) and fires a single POST /write per
     * partition — OpenFGA accepts both in a single request but separating
     * makes failure diagnosis easier in the ledger.
     */
    async writeTuples(tuples) {
        const writes = tuples.filter((t) => t.op === 'write');
        const deletes = tuples.filter((t) => t.op === 'delete');
        const body = { authorization_model_id: this.modelId };
        if (writes.length > 0) {
            body.writes = {
                tuple_keys: writes.map((w) => ({ user: w.user, relation: w.relation, object: w.object })),
            };
        }
        if (deletes.length > 0) {
            body.deletes = {
                tuple_keys: deletes.map((d) => ({ user: d.user, relation: d.relation, object: d.object })),
            };
        }
        if (!body.writes && !body.deletes)
            return;
        const res = await this.fetchImpl(`${this.apiUrl}/stores/${this.storeId}/write`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(this.apiToken ? { Authorization: `Bearer ${this.apiToken}` } : {}),
            },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`[OpenFGA:write] ${res.status}: ${text}`);
        }
    }
}
exports.OpenFgaRebacAdapter = OpenFgaRebacAdapter;
//# sourceMappingURL=openfga-rebac.adapter.js.map