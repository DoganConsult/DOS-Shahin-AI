/**
 * Aggregate platform health surface — `GET /api/dos/platform/health`.
 *
 * Fans out to every platform-module service's /api/<m>/ready endpoint
 * and returns one consolidated status. An operator / monitoring tool
 * can hit this single endpoint to know if the 4-module stack is up.
 *
 * Uses DOSPort-native data — no direct imports of @dos/dauth-*,
 * @dos/dsoc-*, or @dos/dnoc-* — so it stays within DOS isolation.
 */

import { Router, Request, Response } from 'express';

const router = Router();

export interface ModuleProbe {
  moduleCode: 'dauth' | 'dsoc' | 'dnoc' | 'dos';
  url: string;
}

const DEFAULT_PROBES: ModuleProbe[] = [
  { moduleCode: 'dos',   url: process.env.DOS_SERVICE_URL   ?? 'http://127.0.0.1:4100' },
  { moduleCode: 'dauth', url: process.env.AUTH_SERVICE_URL  ?? 'http://127.0.0.1:4001' },
  { moduleCode: 'dsoc',  url: process.env.DSOC_SERVICE_URL  ?? 'http://127.0.0.1:4101' },
  { moduleCode: 'dnoc',  url: process.env.DNOC_SERVICE_URL  ?? 'http://127.0.0.1:4102' },
];

let probes: ModuleProbe[] = DEFAULT_PROBES;

/** Bootstrap-time override — tests or ops can swap the probe list. */
export function configurePlatformHealthProbes(list: ModuleProbe[]): void {
  probes = list.slice();
}

/** Expose the default list for diagnostics. */
export function currentProbes(): readonly ModuleProbe[] {
  return probes;
}

interface ModuleHealthStatus {
  moduleCode: string;
  url: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  httpStatus?: number;
  latencyMs?: number;
  error?: string;
}

async function probeOne(p: ModuleProbe, timeoutMs: number): Promise<ModuleHealthStatus> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const base = p.url.replace(/\/$/, '');
    const res = await fetch(`${base}/api/${p.moduleCode}/ready`, { signal: controller.signal });
    const latencyMs = Date.now() - start;
    const status: ModuleHealthStatus['status'] =
      res.ok ? 'healthy' : res.status >= 500 ? 'unhealthy' : 'degraded';
    return { moduleCode: p.moduleCode, url: p.url, status, httpStatus: res.status, latencyMs };
  } catch (err) {
    return {
      moduleCode: p.moduleCode,
      url: p.url,
      status: 'unhealthy',
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

// Per-pillar liveness/readiness probes — required by the platform-health
// fan-out (which calls /api/<pillar>/ready) and by the gateway proxy contract
// (so /api/dos/health works behind the auth-guarded reverse-proxy).
router.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true, service: 'dos-service' });
});
router.get('/ready', (_req: Request, res: Response) => {
  res.json({ ok: true, service: 'dos-service' });
});

router.get('/platform/health', async (req: Request, res: Response) => {
  const timeoutMs = Math.min(15000, Math.max(100, Number(req.query.timeoutMs ?? 3000)));
  const results = await Promise.all(probes.map((p) => probeOne(p, timeoutMs)));
  const worst = results.reduce<'healthy' | 'degraded' | 'unhealthy'>((acc, r) => {
    if (r.status === 'unhealthy') return 'unhealthy';
    if (r.status === 'degraded' && acc !== 'unhealthy') return 'degraded';
    return acc;
  }, 'healthy');

  res.status(worst === 'healthy' ? 200 : worst === 'degraded' ? 207 : 503).json({
    status: worst,
    checkedAt: new Date().toISOString(),
    modules: results,
  });
});

export default router;
