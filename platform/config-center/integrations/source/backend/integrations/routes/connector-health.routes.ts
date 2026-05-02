import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { authenticate } from '../ports/auth.port';
import { emptyResult, query as _query, safeQuery, tenantSchema } from '../ports/database.port';
import { emitEvent } from '../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
// ── Zod Validation Schemas ──
import { auditMiddleware, asyncHandler, validate, moduleStack } from '../ports/middleware.port';
import { swallow, swallowDefault, EC } from '@dos/platform-core/resilience';
import { createIdPingBody } from "../schemas/integrations.schemas";

const router = Router();
router.use(moduleStack('integrations'));
router.use(auditMiddleware('integrations'));

// GET /api/connector-health — Merged view from both `connectors` (heartbeat) and `connector_configs` (scheduler)
router.get("/", authenticate, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);

  // Query heartbeat registry
  const heartbeatResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
  `SELECT c.connector_id, c.name, c.connector_type, c.endpoint_url,
  c.uptime_pct, c.latency_ms, c.failure_count, c.last_heartbeat, c.last_run, c.config,
  CASE WHEN c.last_heartbeat > NOW() - INTERVAL '5 minutes' THEN 'healthy'
  WHEN c.last_heartbeat > NOW() - INTERVAL '30 minutes' THEN 'degraded'
  ELSE 'offline' END as status
  FROM "${schema}".connectors c WHERE c.deleted_at IS NULL`
  ), { tenantId: req.tenantId!, operation: 'query connectors' });

  // Query connector_configs (scheduler/execution layer)
  const configResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
  `SELECT cc.connector_id, cc.name, cc.source_system_type as connector_type,
  cc.endpoint_url, cc.platform, cc.schedule, cc.failure_count,
  cc.last_success_at as last_run,
  CASE WHEN cc.failure_count = 0 THEN 'healthy'
  WHEN cc.failure_count <= 2 THEN 'degraded'
  ELSE 'error' END as status,
  100.0 - (cc.failure_count * 5.0) as uptime_pct,
  NULL::int as latency_ms
  FROM "${schema}".connector_configs cc WHERE cc.status = 'active'`
  ), { tenantId: req.tenantId!, operation: 'query connector_configs' });

  // Merge: connector_configs rows that don't exist in connectors heartbeat
  const heartbeatIds = new Set(heartbeatResult.rows.map(( r: Record<string, unknown>) => r.connector_id));
  const merged = [
  ...heartbeatResult.rows,
  ...configResult.rows.filter(( r: Record<string, unknown>) => !heartbeatIds.has(r.connector_id)),
  ];

  // Sort by name
  merged.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

  const healthy = merged.filter((c: Record<string, unknown>) => c.status === 'healthy').length;
  const degraded = merged.filter((c: Record<string, unknown>) => c.status === 'degraded').length;
  const offline = merged.filter((c: Record<string, unknown>) => c.status === 'offline' || c.status === 'error').length;
  res.json({ connectors: merged, summary: { total: merged.length, healthy, degraded, offline } });
}));

router.post("/:id/ping", authenticate, validate({ body: createIdPingBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  await safeQuery(`UPDATE "${schema}".connectors SET last_heartbeat = NOW() WHERE connector_id = $1`, [req.params.id]);
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'admin', event: 'created', entityType: 'connector_health', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:admin.connector_health.created' });
  res.json({ success: true, pinged_at: new Date().toISOString() });
}));

// GET /api/connector-health/:id/health — Detailed health for a single connector
router.get("/:id/health", authenticate, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  // Try heartbeat table first, fall back to connector_configs
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
  `SELECT c.*,
  CASE WHEN c.last_heartbeat > NOW() - INTERVAL '5 minutes' THEN 'healthy'
  WHEN c.last_heartbeat > NOW() - INTERVAL '30 minutes' THEN 'degraded'
  ELSE 'offline' END as health_status
  FROM "${schema}".connectors c WHERE c.connector_id = $1 AND c.deleted_at IS NULL`,
  [req.params.id]
  ), { tenantId: req.tenantId!, operation: 'query connectors' });

  if (getFirstRow(result)) {
  res.json(getFirstRow(result));
  return;
  }

  // Fallback: check connector_configs
  const cfgResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
  `SELECT cc.*,
  CASE WHEN cc.failure_count = 0 THEN 'healthy'
  WHEN cc.failure_count <= 2 THEN 'degraded'
  ELSE 'error' END as health_status
  FROM "${schema}".connector_configs cc WHERE cc.connector_id = $1 AND cc.status != 'disabled'`,
  [req.params.id]
  ), { tenantId: req.tenantId!, operation: 'query connector_configs' });

  if (!getFirstRow(cfgResult)) { res.status(404).json({ error: "Connector not found" }); return; }
  res.json(getFirstRow(cfgResult));
}));

export default router;

