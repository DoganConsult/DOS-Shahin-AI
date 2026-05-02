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
import { logger } from '@dos/platform-core/observability';
import type {
  RebacAdapter,
  RebacCheckRequest,
  RebacCheckResult,
  RebacListRequest,
  RebacListResult,
  RebacTupleWrite,
} from '../../ports/rebac.port';
import { DAUTH_CONFIG } from '../../dauth.config';

export interface OpenFgaAdapterOptions {
  apiUrl?: string;
  storeId?: string;
  modelId?: string;
  apiToken?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export class OpenFgaRebacAdapter implements RebacAdapter {
  readonly name = 'openfga' as const;
  private readonly apiUrl: string;
  private readonly storeId: string;
  private readonly modelId: string;
  private readonly apiToken?: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: OpenFgaAdapterOptions = {}) {
    const apiUrl = options.apiUrl ?? DAUTH_CONFIG.openfga.apiUrl;
    const storeId = options.storeId ?? DAUTH_CONFIG.openfga.storeId;
    const modelId = options.modelId ?? DAUTH_CONFIG.openfga.modelId;
    if (!apiUrl) throw new Error('[DAuth:OpenFGA] OPENFGA_API_URL is required');
    if (!storeId) throw new Error('[DAuth:OpenFGA] OPENFGA_STORE_ID is required');
    if (!modelId) throw new Error('[DAuth:OpenFGA] OPENFGA_MODEL_ID is required');
    this.apiUrl = apiUrl.replace(/\/$/, '');
    this.storeId = storeId;
    this.modelId = modelId;
    this.apiToken = options.apiToken ?? process.env.OPENFGA_API_TOKEN;
    this.timeoutMs = options.timeoutMs ?? DAUTH_CONFIG.openfga.timeoutMs;
    const f = options.fetchImpl ?? globalThis.fetch;
    if (!f) throw new Error('[DAuth:OpenFGA] no fetch impl available');
    this.fetchImpl = f;
  }

  async check(request: RebacCheckRequest): Promise<RebacCheckResult> {
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
        logger.warn('[DAuth:OpenFGA] check returned non-2xx', { status: res.status });
        return {
          allowed: false,
          source: 'openfga',
          modelVersion: this.modelId,
          latencyMs: Date.now() - started,
          trace: `unavailable: HTTP ${res.status}`,
        };
      }
      const body = (await res.json()) as { allowed?: boolean; resolution?: string };
      return {
        allowed: !!body.allowed,
        source: 'openfga',
        modelVersion: this.modelId,
        latencyMs: Date.now() - started,
        trace: body.resolution,
      };
    } catch (err) {
      logger.warn('[DAuth:OpenFGA] check failed', {
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

  async listObjects(request: RebacListRequest): Promise<RebacListResult> {
    try {
      const res = await this.call('list-objects', {
        authorization_model_id: this.modelId,
        user: request.user,
        relation: request.relation,
        type: request.type,
      });
      if (!res.ok) return { objectIds: [], source: 'openfga', modelVersion: this.modelId };
      const body = (await res.json()) as { objects?: string[] };
      return {
        objectIds: (body.objects ?? []).map((o) => o.split(':')[1] ?? o),
        source: 'openfga',
        modelVersion: this.modelId,
      };
    } catch (err) {
      logger.warn('[DAuth:OpenFGA] list-objects failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return { objectIds: [], source: 'openfga', modelVersion: this.modelId };
    }
  }

  async writeTuples(tuples: RebacTupleWrite[]): Promise<void> {
    if (tuples.length === 0) return;

    const batches = chunk(tuples, 100);
    for (const batch of batches) {
      const writes = batch.filter((t) => t.op === 'write')
        .map((t) => ({ user: t.user, relation: t.relation, object: t.object }));
      const deletes = batch.filter((t) => t.op === 'delete')
        .map((t) => ({ user: t.user, relation: t.relation, object: t.object }));

      const body: Record<string, unknown> = {
        authorization_model_id: this.modelId,
      };
      if (writes.length > 0) body.writes = { tuple_keys: writes };
      if (deletes.length > 0) body.deletes = { tuple_keys: deletes };

      const res = await this.call('write', body);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`[DAuth:OpenFGA] write failed (${res.status}): ${text}`);
      }
    }
  }

  async currentModelVersion(): Promise<string> {
    return this.modelId;
  }

  private async call(endpoint: 'check' | 'list-objects' | 'write', body: unknown): Promise<Response> {
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
    } finally {
      clearTimeout(timer);
    }
  }
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}
