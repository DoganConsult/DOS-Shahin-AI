/**
 * DNOC port REST surface — 1:1 with `DNOCPort` from `@dos/ports/dnoc`.
 * Mounted at `/api/dnoc/port/v1`.
 * Spec: platform/dnoc/contracts/dnoc-port.openapi.yaml
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getDNOCPort } from '@dos/dnoc-core';
import type {
  DNOCMetric,
  DNOCLogEntry,
  DNOCTraceSpan,
  DNOCRouteDescriptor,
} from '@dos/ports/dnoc';
import type {
  MetricsRepository,
  TracesRepository,
  RoutesRepository,
} from '@dos/dnoc-core';

const router = Router();

// Read-side repositories wired at bootstrap.
let metricsRepo: MetricsRepository | null = null;
let tracesRepo: TracesRepository | null = null;
let routesRepo: RoutesRepository | null = null;

export function wireReadRepositories(deps: {
  metrics: MetricsRepository;
  traces: TracesRepository;
  routes: RoutesRepository;
}): void {
  metricsRepo = deps.metrics;
  tracesRepo = deps.traces;
  routesRepo = deps.routes;
}

const metricSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(['counter', 'gauge', 'histogram']),
  value: z.number().finite(),
  labels: z.record(z.string()).optional(),
  timestamp: z.string().optional(),
});

const logSchema = z.object({
  level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']),
  message: z.string().min(1),
  moduleCode: z.string().min(1),
  tenantId: z.string().optional(),
  correlationId: z.string().optional(),
  attributes: z.record(z.unknown()).optional(),
});

const spanSchema = z.object({
  traceId: z.string().min(1),
  spanId: z.string().min(1),
  parentSpanId: z.string().optional(),
  name: z.string().min(1),
  startedAt: z.string().min(1),
  endedAt: z.string().min(1),
  attributes: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

const routeSchema = z.object({
  moduleCode: z.string().min(1),
  serviceCode: z.string().min(1),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  path: z.string().min(1),
  authRequired: z.boolean(),
  rateLimit: z.object({ rpm: z.number().int().min(1) }).optional(),
});

function badRequest(res: Response, err: z.ZodError): Response {
  return res.status(400).json({
    code: 'invalid_request',
    message: 'Request body failed schema validation.',
    details: { issues: err.issues },
  });
}

router.post('/metrics', (req: Request, res: Response) => {
  const parsed = metricSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  getDNOCPort().recordMetric(parsed.data as DNOCMetric);
  res.status(202).json({ accepted: true });
});

router.post('/logs', (req: Request, res: Response) => {
  const parsed = logSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  getDNOCPort().emitLog(parsed.data as DNOCLogEntry);
  res.status(202).json({ accepted: true });
});

router.post('/spans', (req: Request, res: Response) => {
  const parsed = spanSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  getDNOCPort().emitSpan(parsed.data as DNOCTraceSpan);
  res.status(202).json({ accepted: true });
});

router.post('/routes', (req: Request, res: Response) => {
  const parsed = routeSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  getDNOCPort().registerRoute(parsed.data as DNOCRouteDescriptor);
  res.status(202).json({ accepted: true });
});

router.get('/health/:serviceCode', (req: Request, res: Response, next: NextFunction) => {
  const serviceCode = String(req.params.serviceCode ?? '');
  if (!serviceCode) {
    return res.status(400).json({ code: 'invalid_request', message: 'serviceCode required.' });
  }
  getDNOCPort()
    .getHealth(serviceCode)
    .then((status) => res.json({ serviceCode, status }))
    .catch(next);
});

const reportHealthSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy', 'unknown']),
  details: z.record(z.unknown()).optional(),
});

// Bootstrap-wired health-repo writer — services self-report here.
let healthWriter: {
  record: (
    serviceCode: string,
    status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown',
    details?: Record<string, unknown>,
  ) => Promise<void>;
} | null = null;

export function wireHealthWriter(fn: typeof healthWriter): void {
  healthWriter = fn;
}

router.post('/health/:serviceCode', (req: Request, res: Response, next: NextFunction) => {
  const serviceCode = String(req.params.serviceCode ?? '');
  if (!serviceCode) {
    return res.status(400).json({ code: 'invalid_request', message: 'serviceCode required.' });
  }
  const parsed = reportHealthSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  if (!healthWriter) {
    return res.status(501).json({ code: 'not_wired', message: 'Health writer not wired.' });
  }
  healthWriter
    .record(serviceCode, parsed.data.status, parsed.data.details)
    .then(() => res.status(202).json({ serviceCode, status: parsed.data.status, accepted: true }))
    .catch(next);
});

// ── Metrics aggregation ──
router.get('/metrics/:name/aggregate', (req: Request, res: Response, next: NextFunction) => {
  if (!metricsRepo) {
    return res.status(501).json({ code: 'not_wired', message: 'Metrics repo not wired.' });
  }
  const name = String(req.params.name ?? '');
  if (!name) {
    return res.status(400).json({ code: 'invalid_request', message: 'name required.' });
  }
  const limit = Math.min(5000, Math.max(1, Number(req.query.limit ?? 1000)));
  metricsRepo
    .recent(name, limit)
    .then((samples) => {
      const values = samples.map((s) => s.value).filter((v) => typeof v === 'number');
      if (values.length === 0) {
        return res.json({ name, count: 0, aggregate: null });
      }
      const sorted = [...values].sort((a, b) => a - b);
      const pct = (p: number) =>
        sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
      const avg = values.reduce((s, v) => s + v, 0) / values.length;
      res.json({
        name,
        count: values.length,
        aggregate: {
          min: sorted[0],
          max: sorted[sorted.length - 1],
          avg,
          p50: pct(50),
          p95: pct(95),
          p99: pct(99),
        },
      });
    })
    .catch(next);
});

// ── Read endpoints ────────────────────────────────────────────

router.get('/metrics', (req: Request, res: Response, next: NextFunction) => {
  if (!metricsRepo) {
    return res.status(501).json({ code: 'not_wired', message: 'Metrics read repo not wired. Bootstrap must call wireReadRepositories().' });
  }
  const name = String(req.query.name ?? '');
  if (!name) {
    return res.status(400).json({ code: 'invalid_request', message: 'name query param required.' });
  }
  const limit = Math.min(500, Math.max(1, Number(req.query.limit ?? 50)));
  metricsRepo
    .recent(name, limit)
    .then((samples) => res.json({ name, count: samples.length, samples }))
    .catch(next);
});

router.get('/traces/:traceId', (req: Request, res: Response, next: NextFunction) => {
  if (!tracesRepo) {
    return res.status(501).json({ code: 'not_wired', message: 'Traces read repo not wired.' });
  }
  const traceId = String(req.params.traceId ?? '');
  if (!traceId) {
    return res.status(400).json({ code: 'invalid_request', message: 'traceId required.' });
  }
  tracesRepo
    .byTraceId(traceId)
    .then((spans) => res.json({ traceId, spanCount: spans.length, spans }))
    .catch(next);
});

router.get('/routes', (req: Request, res: Response, next: NextFunction) => {
  if (!routesRepo) {
    return res.status(501).json({ code: 'not_wired', message: 'Routes read repo not wired.' });
  }
  const serviceCode = String(req.query.serviceCode ?? '');
  if (!serviceCode) {
    return res.status(400).json({ code: 'invalid_request', message: 'serviceCode query param required.' });
  }
  routesRepo
    .listActive(serviceCode)
    .then((routes) => res.json({ serviceCode, count: routes.length, routes }))
    .catch(next);
});

export default router;
