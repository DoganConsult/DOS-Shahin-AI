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
import { logger } from '@dos/platform-core/observability';
import type {
  AbacAdapter,
  AbacRequest,
  AbacVerdict,
} from '../../ports/abac.port';
import { DAUTH_CONFIG } from '../../dauth.config';
import { DAUTH_REASON_CODES } from '../../contracts/reason-codes';

export interface CerbosAdapterOptions {
  pdpUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
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
  private versionCache: { version: string; fetchedAt: number } | null = null;

  constructor(options: CerbosAdapterOptions = {}) {
    const pdpUrl = options.pdpUrl ?? DAUTH_CONFIG.cerbos.pdpUrl;
    if (!pdpUrl) {
      throw new Error('[DAuth:Cerbos] CERBOS_PDP_URL is required');
    }
    this.pdpUrl = pdpUrl.replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs ?? DAUTH_CONFIG.cerbos.timeoutMs;
    const f = options.fetchImpl ?? globalThis.fetch;
    if (!f) throw new Error('[DAuth:Cerbos] no fetch impl available');
    this.fetchImpl = f;
  }

  async evaluate(request: AbacRequest): Promise<AbacVerdict> {
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
        logger.warn('[DAuth:Cerbos] PDP returned non-2xx', { status: res.status });
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
        return {
          decision: 'deny',
          reasonCode: DAUTH_REASON_CODES.DENY_CERBOS,
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
        reasonCode: DAUTH_REASON_CODES.ABSTAIN_NO_POLICY,
        reason: 'Cerbos: no matching policy',
        policyVersion: await this.currentPolicyVersion(),
        source: 'cerbos',
        latencyMs: Date.now() - started,
      };
    } catch (err) {
      logger.warn('[DAuth:Cerbos] PDP call failed', {
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
      reasonCode: DAUTH_REASON_CODES.DENY_CERBOS_UNAVAILABLE,
      reason: 'Cerbos unavailable — deferring to native',
      source: 'cerbos',
      latencyMs: Date.now() - started,
    };
  }
}

function extractObligations(outputs?: Array<{ src: string; val: unknown }>): Record<string, unknown> | undefined {
  if (!outputs || outputs.length === 0) return undefined;
  const obligations: Record<string, unknown> = {};
  for (const o of outputs) {
    if (o.val !== undefined) obligations[o.src] = o.val;
  }
  return Object.keys(obligations).length > 0 ? obligations : undefined;
}
