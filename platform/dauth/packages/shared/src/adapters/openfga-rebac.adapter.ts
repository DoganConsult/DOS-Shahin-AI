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
import type {
  RebacAdapter,
  RebacCheckRequest,
  RebacCheckResult,
} from '../dauth-ports/rebac.port';

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

export class OpenFgaRebacAdapter implements RebacAdapter {
  readonly name = 'openfga' as const;
  private readonly apiUrl: string;
  private readonly storeId: string;
  private readonly modelId: string;
  private readonly apiToken?: string;
  private readonly timeoutMs: number;
  private readonly retryAttempts: number;
  private readonly higherConsistency: boolean;
  private readonly fetchImpl: typeof fetch;
  private readonly onLatency?: (op: 'check' | 'write', latencyMs: number, ok: boolean) => void;

  constructor(opts: OpenFgaRebacOptions) {
    if (!opts.apiUrl) throw new Error('[@dos/auth] OpenFgaRebacAdapter requires apiUrl');
    if (!opts.storeId) throw new Error('[@dos/auth] OpenFgaRebacAdapter requires storeId');
    if (!opts.modelId) throw new Error('[@dos/auth] OpenFgaRebacAdapter requires modelId');
    this.apiUrl = opts.apiUrl.replace(/\/$/, '');
    this.storeId = opts.storeId;
    this.modelId = opts.modelId;
    this.apiToken = opts.apiToken;
    this.timeoutMs = opts.timeoutMs ?? 250;
    this.retryAttempts = Math.max(0, opts.retryAttempts ?? 0);
    this.higherConsistency = !!opts.higherConsistency;
    const f = opts.fetchImpl ?? globalThis.fetch;
    if (!f) throw new Error('[@dos/auth] no fetch impl available');
    this.fetchImpl = f;
    this.onLatency = opts.onLatency;
  }

  async check(request: RebacCheckRequest): Promise<RebacCheckResult> {
    const started = Date.now();
    const totalAttempts = 1 + this.retryAttempts;
    let lastErrTrace = 'unavailable: unknown';

    for (let attempt = 0; attempt < totalAttempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const body: Record<string, unknown> = {
          authorization_model_id: this.modelId,
          tuple_key: {
            user: request.user,
            relation: request.relation,
            object: request.object,
          },
        };
        if (this.higherConsistency) body.consistency = 'HIGHER_CONSISTENCY';

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
        } else {
          const json = (await res.json()) as { allowed?: boolean; resolution?: string };
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
      } catch (err) {
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
      } finally {
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

  async currentModelVersion(): Promise<string | null> {
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
  async writeTuples(tuples: Array<RebacTupleWrite>): Promise<void> {
    const writes = tuples.filter((t) => t.op === 'write');
    const deletes = tuples.filter((t) => t.op === 'delete');
    const body: Record<string, unknown> = { authorization_model_id: this.modelId };
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
    if (!body.writes && !body.deletes) return;

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

export interface RebacTupleWrite {
  user: string;
  relation: string;
  object: string;
  op: 'write' | 'delete';
}
