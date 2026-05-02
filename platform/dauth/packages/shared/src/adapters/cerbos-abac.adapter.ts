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
import type {
  AbacAdapter,
  AbacRequest,
  AbacVerdict,
} from '../dauth-ports/abac.port';

const DENY_CERBOS = 'DAUTH_DENY_CERBOS';
const DENY_CERBOS_UNAVAILABLE = 'DAUTH_DENY_CERBOS_UNAVAILABLE';
const ABSTAIN_NO_POLICY = 'DAUTH_ABSTAIN_NO_POLICY';

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

interface CerbosCheckResponse {
  requestId: string;
  results?: Array<{
    resource: { id: string; kind: string };
    actions: Record<string, 'EFFECT_ALLOW' | 'EFFECT_DENY' | string>;
    meta?: {
      actions?: Record<
        string,
        { matchedPolicy?: string; matchedScope?: string }
      >;
      effectiveDerivedRoles?: string[];
    };
    outputs?: Array<{ src: string; val: unknown }>;
  }>;
  cerbosCallId?: string;
}

export class CerbosAbacAdapter implements AbacAdapter {
  readonly name = 'cerbos' as const;
  private readonly pdpUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly log: { warn: (msg: string, meta?: Record<string, unknown>) => void };
  private versionCache: { version: string; fetchedAt: number } | null = null;

  constructor(options: CerbosAdapterOptions) {
    if (!options.pdpUrl) {
      throw new Error('[DAuth:Cerbos] pdpUrl is required');
    }
    this.pdpUrl = options.pdpUrl.replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs ?? 250;
    const f = options.fetchImpl ?? globalThis.fetch;
    if (!f) throw new Error('[DAuth:Cerbos] no fetch impl available');
    this.fetchImpl = f;
    this.log = {
      warn: options.log?.warn ?? ((m, meta) => console.warn(m, meta ?? {})),
    };
  }

  async evaluate(request: AbacRequest): Promise<AbacVerdict> {
    const started = Date.now();
    const body = {
      requestId:
        typeof crypto !== 'undefined' && (crypto as Crypto).randomUUID
          ? (crypto as Crypto).randomUUID()
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
      const payload = (await res.json()) as CerbosCheckResponse;
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
    } catch (err) {
      this.log.warn('[DAuth:Cerbos] PDP call failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return this.unavailableVerdict(started);
    } finally {
      clearTimeout(timer);
    }
  }

  async currentPolicyVersion(): Promise<string> {
    if (this.versionCache && Date.now() - this.versionCache.fetchedAt < 60_000) {
      return this.versionCache.version;
    }
    try {
      const res = await this.fetchImpl(`${this.pdpUrl}/api/server_info`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return 'cerbos:unknown';
      const body = (await res.json()) as { version?: string; commit?: string };
      const version = body.commit ?? body.version ?? 'cerbos:unknown';
      this.versionCache = { version, fetchedAt: Date.now() };
      return version;
    } catch {
      return 'cerbos:unknown';
    }
  }

  private unavailableVerdict(started: number): AbacVerdict {
    return {
      decision: 'abstain',
      reasonCode: DENY_CERBOS_UNAVAILABLE,
      reason: 'Cerbos unavailable — deferring to native',
      source: 'cerbos',
      latencyMs: Date.now() - started,
    };
  }
}

function extractObligations(
  outputs?: Array<{ src: string; val: unknown }>,
): Record<string, unknown> | undefined {
  if (!outputs || outputs.length === 0) return undefined;
  const obligations: Record<string, unknown> = {};
  for (const o of outputs) {
    if (o.val !== undefined) obligations[o.src] = o.val;
  }
  return Object.keys(obligations).length > 0 ? obligations : undefined;
}
