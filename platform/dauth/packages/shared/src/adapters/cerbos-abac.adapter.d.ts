/**
 * Cerbos ABAC adapter — speaks Cerbos PDP HTTP API under DAuth.
 *
 * Source: platform/core/current-source/dauth/adapters/cerbos/cerbos.adapter.ts
 * Change vs. source: config is options-based (no DAUTH_CONFIG import) so the
 * adapter is usable from `@dos/auth` bootstrap and unit-tested in isolation.
 *
 * Why no Cerbos SDK: Cerbos' Node client is optional. Calling
 * `POST /api/check/resources` directly keeps DAuth dependency-light and gives
 * us tight control over the request shape.
 *
 * Policy-pack version is fetched from `/api/server_info` and cached for 60s
 * so replay logs can pin the exact version that produced a decision.
 */
import type { AbacAdapter, AbacRequest, AbacVerdict } from '../dauth-ports/abac.port';
export interface CerbosAdapterOptions {
    /** Required. Full URL to the Cerbos PDP (e.g. `http://127.0.0.1:3592`). */
    pdpUrl: string;
    /** Per-call timeout. Defaults to 250ms — tight SLO for a shadow-mode hot path. */
    timeoutMs?: number;
    /** Inject fetch impl for tests / non-node runtimes. */
    fetchImpl?: typeof fetch;
    /** Structured logger. Optional — defaults to console.warn on failures. */
    log?: {
        warn?: (msg: string, meta?: Record<string, unknown>) => void;
    };
}
export declare class CerbosAbacAdapter implements AbacAdapter {
    readonly name: "cerbos";
    private readonly pdpUrl;
    private readonly timeoutMs;
    private readonly fetchImpl;
    private readonly log;
    private versionCache;
    constructor(options: CerbosAdapterOptions);
    evaluate(request: AbacRequest): Promise<AbacVerdict>;
    currentPolicyVersion(): Promise<string>;
    private unavailableVerdict;
}
