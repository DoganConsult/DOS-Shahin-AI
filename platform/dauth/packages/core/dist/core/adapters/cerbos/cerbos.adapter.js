"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CerbosAbacAdapter = void 0;
/**
 * Cerbos ABAC adapter — speaks Cerbos PDP HTTP API.
 *
 * Why no SDK: Cerbos' Node client is optional. We stay dependency-light by
 * calling the `POST /api/check/resources` endpoint directly. This keeps DAuth
 * portable and gives us tight control over the request shape (Cerbos is
 * strict about `principal.id`, `resource.kind`, etc.).
 *
 * Policy-pack version is fetched from `/api/server_info` and cached with a
 * short TTL so replay logs can pin the exact version that produced a decision.
 */
const observability_1 = require("@dos/platform-core/observability");
const dauth_config_1 = require("../../dauth.config");
const reason_codes_1 = require("../../contracts/reason-codes");
class CerbosAbacAdapter {
    name = 'cerbos';
    pdpUrl;
    timeoutMs;
    fetchImpl;
    versionCache = null;
    constructor(options = {}) {
        const pdpUrl = options.pdpUrl ?? dauth_config_1.DAUTH_CONFIG.cerbos.pdpUrl;
        if (!pdpUrl) {
            throw new Error('[DAuth:Cerbos] CERBOS_PDP_URL is required');
        }
        this.pdpUrl = pdpUrl.replace(/\/$/, '');
        this.timeoutMs = options.timeoutMs ?? dauth_config_1.DAUTH_CONFIG.cerbos.timeoutMs;
        const f = options.fetchImpl ?? globalThis.fetch;
        if (!f)
            throw new Error('[DAuth:Cerbos] no fetch impl available');
        this.fetchImpl = f;
    }
    async evaluate(request) {
        const started = Date.now();
        const body = {
            requestId: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
            principal: {
                id: request.principal.userId,
                policyVersion: 'default',
                roles: request.principal.roles,
                attr: {
                    tenantId: request.principal.tenantId,
                    ...(request.principal.attributes ?? {}),
                },
            },
            resources: [
                {
                    actions: [request.action],
                    resource: {
                        id: request.resource.id ?? 'unscoped',
                        kind: request.resource.type,
                        policyVersion: 'default',
                        attr: {
                            tenantId: request.resource.tenantId,
                            ...(request.resource.attributes ?? {}),
                        },
                    },
                },
            ],
            auxData: request.context
                ? { jwt: { token: '', keySetId: '' }, custom: request.context }
                : undefined,
        };
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
            const res = await this.fetchImpl(`${this.pdpUrl}/api/check/resources`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: controller.signal,
            });
            if (!res.ok) {
                observability_1.logger.warn('[DAuth:Cerbos] PDP returned non-2xx', { status: res.status });
                return this.unavailableVerdict(started);
            }
            const payload = (await res.json());
            const result = payload.results?.[0];
            const actionVerdict = result?.actions?.[request.action];
            if (actionVerdict === 'EFFECT_ALLOW') {
                return {
                    decision: 'allow',
                    reason: 'Cerbos allow',
                    policyVersion: await this.currentPolicyVersion(),
                    source: 'cerbos',
                    latencyMs: Date.now() - started,
                    obligations: extractObligations(result?.outputs),
                };
            }
            if (actionVerdict === 'EFFECT_DENY') {
                return {
                    decision: 'deny',
                    reasonCode: reason_codes_1.DAUTH_REASON_CODES.DENY_CERBOS,
                    reason: result?.meta?.actions?.[request.action]?.matchedPolicy
                        ? `Cerbos deny (policy=${result.meta.actions[request.action].matchedPolicy})`
                        : 'Cerbos deny',
                    policyVersion: await this.currentPolicyVersion(),
                    source: 'cerbos',
                    latencyMs: Date.now() - started,
                };
            }
            return {
                decision: 'abstain',
                reasonCode: reason_codes_1.DAUTH_REASON_CODES.ABSTAIN_NO_POLICY,
                reason: 'Cerbos: no matching policy',
                policyVersion: await this.currentPolicyVersion(),
                source: 'cerbos',
                latencyMs: Date.now() - started,
            };
        }
        catch (err) {
            observability_1.logger.warn('[DAuth:Cerbos] PDP call failed', {
                error: err instanceof Error ? err.message : String(err),
            });
            return this.unavailableVerdict(started);
        }
        finally {
            clearTimeout(timer);
        }
    }
    async currentPolicyVersion() {
        if (this.versionCache && Date.now() - this.versionCache.fetchedAt < 60_000) {
            return this.versionCache.version;
        }
        try {
            const res = await this.fetchImpl(`${this.pdpUrl}/api/server_info`, {
                headers: { Accept: 'application/json' },
            });
            if (!res.ok)
                return 'cerbos:unknown';
            const body = (await res.json());
            const version = body.commit ?? body.version ?? 'cerbos:unknown';
            this.versionCache = { version, fetchedAt: Date.now() };
            return version;
        }
        catch {
            return 'cerbos:unknown';
        }
    }
    unavailableVerdict(started) {
        return {
            decision: 'abstain',
            reasonCode: reason_codes_1.DAUTH_REASON_CODES.DENY_CERBOS_UNAVAILABLE,
            reason: 'Cerbos unavailable — deferring to native',
            source: 'cerbos',
            latencyMs: Date.now() - started,
        };
    }
}
exports.CerbosAbacAdapter = CerbosAbacAdapter;
function extractObligations(outputs) {
    if (!outputs || outputs.length === 0)
        return undefined;
    const obligations = {};
    for (const o of outputs) {
        if (o.val !== undefined)
            obligations[o.src] = o.val;
    }
    return Object.keys(obligations).length > 0 ? obligations : undefined;
}
//# sourceMappingURL=cerbos.adapter.js.map