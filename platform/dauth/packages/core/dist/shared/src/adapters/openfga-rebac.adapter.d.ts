/**
 * OpenFGA ReBAC adapter — speaks the OpenFGA HTTP API.
 *
 * No dependency on `@openfga/sdk`. We hit `/stores/{id}/check` directly.
 * The authorization model id is pinned via constructor so replay can tie a
 * decision to a specific graph-schema version.
 *
 * Timeout-bounded: if OpenFGA is slow or unreachable, returns
 * `allowed: false, trace: 'unavailable'` rather than throwing. The decision
 * engine translates this into `DAUTH_DENY_OPENFGA_UNAVAILABLE` so ops sees
 * it in the ledger and can respond.
 */
import type { RebacAdapter, RebacCheckRequest, RebacCheckResult } from '../dauth-ports/rebac.port';
export interface OpenFgaRebacOptions {
    apiUrl: string;
    storeId: string;
    modelId: string;
    apiToken?: string;
    timeoutMs?: number;
    /**
     * Number of additional retry attempts on network/timeout failure.
     * Total attempts = 1 + retryAttempts. Defaults to 0 (no retry) for
     * backward compatibility; bootstrap reads OPENFGA_RETRY_ATTEMPTS.
     */
    retryAttempts?: number;
    /**
     * When true, requests `consistency=HIGHER_CONSISTENCY` from OpenFGA.
     * Use for SoD-critical reads (e.g. can_approve) where stale tuples
     * could cause an SoD bypass.
     */
    higherConsistency?: boolean;
    fetchImpl?: typeof fetch;
    /** Optional latency observer — bootstrap may wire to platform metrics. */
    onLatency?: (op: 'check' | 'write', latencyMs: number, ok: boolean) => void;
}
export declare class OpenFgaRebacAdapter implements RebacAdapter {
    readonly name: "openfga";
    private readonly apiUrl;
    private readonly storeId;
    private readonly modelId;
    private readonly apiToken?;
    private readonly timeoutMs;
    private readonly retryAttempts;
    private readonly higherConsistency;
    private readonly fetchImpl;
    private readonly onLatency?;
    constructor(opts: OpenFgaRebacOptions);
    check(request: RebacCheckRequest): Promise<RebacCheckResult>;
    currentModelVersion(): Promise<string | null>;
    /**
     * Write or delete relation tuples in bulk. Used by the tuple-sync
     * subscribers to mirror DAuth domain events into the OpenFGA graph.
     *
     * Partitions by op (writes vs deletes) and fires a single POST /write per
     * partition — OpenFGA accepts both in a single request but separating
     * makes failure diagnosis easier in the ledger.
     */
    writeTuples(tuples: Array<RebacTupleWrite>): Promise<void>;
}
export interface RebacTupleWrite {
    user: string;
    relation: string;
    object: string;
    op: 'write' | 'delete';
}
