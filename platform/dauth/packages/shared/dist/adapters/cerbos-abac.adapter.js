"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CerbosAbacAdapter = void 0;
const DENY_CERBOS = 'DAUTH_DENY_CERBOS';
const DENY_CERBOS_UNAVAILABLE = 'DAUTH_DENY_CERBOS_UNAVAILABLE';
const ABSTAIN_NO_POLICY = 'DAUTH_ABSTAIN_NO_POLICY';
class CerbosAbacAdapter {
    name = 'cerbos';
    pdpUrl;
    timeoutMs;
    fetchImpl;
    log;
    versionCache = null;
    constructor(options) {
        if (!options.pdpUrl) {
            throw new Error('[DAuth:Cerbos] pdpUrl is required');
        }
        this.pdpUrl = options.pdpUrl.replace(/\/$/, '');
        this.timeoutMs = options.timeoutMs ?? 250;
        const f = options.fetchImpl ?? globalThis.fetch;
        if (!f)
            throw new Error('[DAuth:Cerbos] no fetch impl available');
        this.fetchImpl = f;
        this.log = {
            warn: options.log?.warn ?? ((m, meta) => console.warn(m, meta ?? {})),
        };
    }
    async evaluate(request) {
        const started = Date.now();
        const body = {
            requestId: typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : String(Date.now()),
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
                this.log.warn('[DAuth:Cerbos] PDP returned non-2xx', { status: res.status });
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
                const matched = result?.meta?.actions?.[request.action]?.matchedPolicy;
                return {
                    decision: 'deny',
                    reasonCode: DENY_CERBOS,
                    reason: matched ? `Cerbos deny (policy=${matched})` : 'Cerbos deny',
                    policyVersion: await this.currentPolicyVersion(),
                    source: 'cerbos',
                    latencyMs: Date.now() - started,
                };
            }
            return {
                decision: 'abstain',
                reasonCode: ABSTAIN_NO_POLICY,
                reason: 'Cerbos: no matching policy',
                policyVersion: await this.currentPolicyVersion(),
                source: 'cerbos',
                latencyMs: Date.now() - started,
            };
        }
        catch (err) {
            this.log.warn('[DAuth:Cerbos] PDP call failed', {
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
            reasonCode: DENY_CERBOS_UNAVAILABLE,
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
//# sourceMappingURL=cerbos-abac.adapter.js.map