/**
 * Health, readiness, and metrics HTTP surface.
 *
 *   GET /healthz   — liveness; always 200 unless the process is broken
 *   GET /readyz    — readiness; 200 on `pass`, 200+warn body on `warn`, 503 on `fail`
 *   GET /metrics   — JSON or Prometheus text format (content-negotiated via Accept)
 */
import { Router, type Router as ExpressRouter } from 'express';
import { reportHealth, reportLiveness, type HealthDeps } from '../../application/observability/health';
import { snapshot, renderPrometheus } from '../../application/observability/metrics';

export interface HealthRouterDeps extends HealthDeps {
  version?: string;
}

export function createHealthRouter(deps: HealthRouterDeps = {}): ExpressRouter {
  const router = Router();
  const version = deps.version ?? '1.0.0';

  router.get('/healthz', (_req, res) => {
    res.status(200).json(reportLiveness(version));
  });

  router.get('/readyz', async (_req, res) => {
    const r = await reportHealth(deps, version);
    res.status(r.status === 'fail' ? 503 : 200).json(r);
  });

  router.get('/metrics', (req, res) => {
    const accept = String(req.headers.accept ?? '').toLowerCase();
    const wantsPrometheus =
      accept.includes('text/plain') ||
      accept.includes('application/openmetrics-text') ||
      String(req.query.format ?? '').toLowerCase() === 'prometheus';

    if (wantsPrometheus) {
      res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.send(renderPrometheus());
      return;
    }

    res.json({ module: 'compliance', version, observedAt: new Date().toISOString(), metrics: snapshot() });
  });

  return router;
}
