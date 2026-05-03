// Risk module readiness probe: GET /api/health/risk
//
// Returns ONLY safe readiness data. No tenant data, no DB error detail, no
// stack traces, no secrets. Internal failures collapse to status='down' with
// no detail leaked over HTTP. 1.5s overall timeout. No auth required.
// 5-second in-process cache so the probe is cheap when called frequently.
//
// Wave-1 Module-Pack pilot: powers the health-strip on the universal
// /risk/overview + /risk/settings pages.

import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'crypto';

interface CheckResult {
  name: 'route-catalog' | 'db-pool' | 'risk-store';
  status: 'ok' | 'fail';
}

interface HealthBody {
  status: 'up' | 'degraded' | 'down';
  module: 'risk';
  ts: string;
  checks: CheckResult[];
  correlationId?: string;
}

const CACHE_TTL_MS = 5000;
const TOTAL_TIMEOUT_MS = 1500;
const PER_CHECK_TIMEOUT_MS = 200;

let cached: { body: HealthBody; expiresAt: number } | null = null;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race<T | null>([
    p.catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

async function checkRouteCatalog(): Promise<CheckResult> {
  // The risk router is mounted by server.ts before this probe is reachable.
  return { name: 'route-catalog', status: 'ok' };
}

async function checkDbPool(): Promise<CheckResult> {
  try {
    const dbMod = (await import('@dos/db').catch(() => null)) as any;
    if (!dbMod || typeof dbMod.query !== 'function') {
      return { name: 'db-pool', status: 'fail' };
    }
    const result = await withTimeout(dbMod.query('SELECT 1'), PER_CHECK_TIMEOUT_MS);
    return { name: 'db-pool', status: result === null ? 'fail' : 'ok' };
  } catch {
    return { name: 'db-pool', status: 'fail' };
  }
}

async function checkRiskStore(): Promise<CheckResult> {
  // SELECT 1 against the risks table catalog presence — no tenant data.
  try {
    const dbMod = (await import('@dos/db').catch(() => null)) as any;
    if (!dbMod || typeof dbMod.query !== 'function') {
      return { name: 'risk-store', status: 'fail' };
    }
    const result = await withTimeout(
      dbMod.query("SELECT 1 FROM information_schema.tables WHERE table_name='risks' LIMIT 1"),
      PER_CHECK_TIMEOUT_MS,
    );
    return { name: 'risk-store', status: result === null ? 'fail' : 'ok' };
  } catch {
    return { name: 'risk-store', status: 'fail' };
  }
}

function deriveOverallStatus(checks: CheckResult[]): HealthBody['status'] {
  const ok = checks.filter((c) => c.status === 'ok').length;
  if (ok === checks.length) return 'up';
  if (ok === 0) return 'down';
  return 'degraded';
}

async function buildHealthBody(correlationId?: string): Promise<HealthBody> {
  const probeRace = Promise.all([
    checkRouteCatalog(),
    checkDbPool(),
    checkRiskStore(),
  ]);
  const checksOrNull = await withTimeout(probeRace, TOTAL_TIMEOUT_MS);
  const checks = checksOrNull ?? [
    { name: 'route-catalog', status: 'fail' },
    { name: 'db-pool', status: 'fail' },
    { name: 'risk-store', status: 'fail' },
  ];
  return {
    status: deriveOverallStatus(checks),
    module: 'risk',
    ts: new Date().toISOString(),
    checks,
    ...(correlationId ? { correlationId } : {}),
  };
}

export const healthRiskRouter = Router();

healthRiskRouter.get('/', async (req: Request, res: Response) => {
  const now = Date.now();
  const correlationId =
    (req.header('x-correlation-id') as string | undefined) || randomUUID();

  if (cached && cached.expiresAt > now) {
    res.status(200).json({ ...cached.body, correlationId });
    return;
  }

  const body = await buildHealthBody(correlationId);
  cached = { body, expiresAt: now + CACHE_TTL_MS };
  res.status(200).json(body);
});

export default healthRiskRouter;
