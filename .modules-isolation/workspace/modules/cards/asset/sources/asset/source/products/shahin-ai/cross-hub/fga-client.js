"use strict";
// @ts-nocheck — cross-hub helper compiled outside the module's main rootDir.
//
// Production-grade OpenFGA HTTP client using global `fetch`. Avoids a
// hard dependency on the @openfga/sdk npm package (not present in the
// monorepo) while preserving the same `check`, `read`, and `write` ergonomics
// the privacy-gate consumes.
//
// Canonical env-var precedence:
//   OPENFGA_API_URL   > FGA_API_URL   > http://localhost:8080
//   OPENFGA_STORE_ID  > FGA_STORE_ID  > default-store
//   OPENFGA_MODEL_ID  > FGA_MODEL_ID  > undefined (latest)
// All four cross-hub fga-client stubs MUST resolve identically.
Object.defineProperty(exports, "__esModule", { value: true });
exports.fgaClient = void 0;
const apiUrl = process.env.OPENFGA_API_URL || process.env.FGA_API_URL || 'http://localhost:8080';
const storeId = process.env.OPENFGA_STORE_ID || process.env.FGA_STORE_ID || 'default-store';
const authorizationModelId = process.env.OPENFGA_MODEL_ID || process.env.FGA_MODEL_ID || undefined;
async function call(method, path, body) {
    const url = `${apiUrl.replace(/\/$/, '')}/stores/${encodeURIComponent(storeId)}${path}`;
    const headers = { 'Content-Type': 'application/json' };
    const init = { method, headers };
    if (body !== undefined)
        init.body = JSON.stringify(body);
    const r = await fetch(url, init);
    if (!r.ok) {
        const text = await r.text().catch(() => '');
        throw new Error(`OpenFGA ${method} ${path} -> ${r.status}: ${text || r.statusText}`);
    }
    return (await r.json());
}
exports.fgaClient = {
    /** Check whether `user` has `relation` to `object`. */
    async check(req) {
        return call('POST', '/check', {
            tuple_key: { user: req.user, relation: req.relation, object: req.object },
            authorization_model_id: authorizationModelId,
            contextual_tuples: req.contextualTuples,
        });
    },
    /** Read tuples matching the partial tuple key. */
    async read(req = {}) {
        return call('POST', '/read', {
            tuple_key: req.tuple_key,
            page_size: req.page_size,
            continuation_token: req.continuation_token,
        });
    },
    /** Apply a batch of writes / deletes. */
    async write(req) {
        return call('POST', '/write', {
            ...req,
            authorization_model_id: authorizationModelId,
        });
    },
    /** Expose the configured store/model for diagnostics. */
    config() {
        return { apiUrl, storeId, authorizationModelId };
    },
};
//# sourceMappingURL=fga-client.js.map