/**
 * Health & readiness aggregator.
 *
 * Liveness:  the module process can answer (always 200 unless throwing).
 * Readiness: dependent ports/migrations are bound + applied.
 *
 * The host supplies a `HealthDeps` bag describing what to check; the module
 * never reaches into platform internals. Returns a typed `HealthReport`.
 */
import { getFoundationPort } from '../../ports/foundation.port';
import { getDynamicUiPort } from '../../ports/dynamic-ui.port';
import { getAiPort } from '../../ports/ai.port';
import type { DbClient } from '../../db/runner';

export type CheckStatus = 'pass' | 'warn' | 'fail';

export interface HealthCheck {
  name: string;
  status: CheckStatus;
  detail?: string;
  durationMs: number;
}

export interface HealthReport {
  status: CheckStatus;
  module: 'compliance';
  version: string;
  checks: HealthCheck[];
  observedAt: string;
}

export interface HealthDeps {
  client?: DbClient;
  /** When true, verify foundation port is bound. */
  requireFoundation?: boolean;
  /** When true, verify dynamic-ui port is bound. */
  requireDynamicUi?: boolean;
  /** When true, treat AI as required (else missing AI is `warn`, not `fail`). */
  requireAi?: boolean;
}

const time = async <T>(fn: () => Promise<T>): Promise<{ value?: T; error?: unknown; ms: number }> => {
  const t0 = Date.now();
  try { const value = await fn(); return { value, ms: Date.now() - t0 }; }
  catch (error) { return { error, ms: Date.now() - t0 }; }
};

const isUnboundError = (e: unknown): boolean =>
  /not bound/.test(String((e as Error)?.message ?? ''));

async function checkPort(name: string, probe: () => Promise<unknown>, required: boolean): Promise<HealthCheck> {
  const r = await time(probe);
  if (!r.error) return { name, status: 'pass', durationMs: r.ms };
  const unbound = isUnboundError(r.error);
  return {
    name,
    status: unbound && !required ? 'warn' : 'fail',
    detail: String((r.error as Error).message ?? r.error),
    durationMs: r.ms,
  };
}

async function checkDb(client?: DbClient): Promise<HealthCheck> {
  if (!client) return { name: 'db', status: 'warn', detail: 'no client supplied', durationMs: 0 };
  const r = await time(() => client.query('SELECT 1 AS ok'));
  return r.error
    ? { name: 'db', status: 'fail', detail: String((r.error as Error).message ?? r.error), durationMs: r.ms }
    : { name: 'db', status: 'pass', durationMs: r.ms };
}

const rollup = (checks: HealthCheck[]): CheckStatus =>
  checks.some((c) => c.status === 'fail') ? 'fail'
    : checks.some((c) => c.status === 'warn') ? 'warn'
    : 'pass';

export async function reportHealth(deps: HealthDeps = {}, version = '1.0.0'): Promise<HealthReport> {
  const checks: HealthCheck[] = [await checkDb(deps.client)];

  if (deps.requireFoundation) {
    checks.push(await checkPort('foundation', () => getFoundationPort().lookups('healthcheck', '__hc__'), true));
  }
  if (deps.requireDynamicUi) {
    checks.push(await checkPort('dynamic-ui', () => getDynamicUiPort().getEnrollment('__hc__'), true));
  }
  // AI is always reported; required-ness controlled by `requireAi`
  checks.push(await checkPort(
    'ai',
    () => getAiPort().interpretQuery({ tenantId: '__hc__', actorId: '__hc__', scopeType: 'healthcheck', query: 'ping' }),
    Boolean(deps.requireAi),
  ));

  return {
    status: rollup(checks),
    module: 'compliance',
    version,
    checks,
    observedAt: new Date().toISOString(),
  };
}

/** Liveness: never depends on external state; returns 'pass' unless thrown. */
export function reportLiveness(version = '1.0.0'): HealthReport {
  return {
    status: 'pass',
    module: 'compliance',
    version,
    checks: [{ name: 'process', status: 'pass', durationMs: 0 }],
    observedAt: new Date().toISOString(),
  };
}
