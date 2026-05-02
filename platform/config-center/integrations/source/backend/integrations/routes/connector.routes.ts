import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Shahin-Ai — Connector Routes
// List, create, health-check, run, and view
// execution history for source-system connectors.
// Requirements: 6.1, 6.6
// ============================================


import { authenticate, requirePermission } from '../ports/auth.port';
import {
  getConnectors,
  createConnector,
  getConnectorHealth,
  runConnector,
  getExecutions,
  getHealthDashboard,
  testConnection,
  getConnectorDetail,
  transitionConnectorStatus,
  getStatusHistory,
  getValidNextStatuses as _getValidNextStatuses,
  updateConnectorOwnership,
} from '../services/connector.service';
import { toErrorMessage } from '@dos/module-sdk';
import { emitEvent, eventBus } from '../ports/events.port';
// ── Zod Validation Schemas ──
import { auditMiddleware, setAuditData, automationMiddleware, validate, moduleStack } from '../ports/middleware.port';
import { swallow, EC , catchHandler } from '@dos/platform-core/resilience';
import { createRootBody, createIdRunBody, createTestBody, createTestallBody, createIdTransitionBody, updateIdOwnershipBody } from "../schemas/integrations.schemas";

const router = Router();
router.use(moduleStack('integrations'));
router.use(auditMiddleware("connectors"));
router.use(automationMiddleware("workflows"));

// GET /api/connectors — List all connectors for the tenant (with optional pagination)
router.get("/", validate({ query: z.record(z.unknown()) }), authenticate, async (req: Request, res: Response) => {
  try {
  const tenantId = req.tenantId!;
  const connectors = await getConnectors(tenantId);
  // Optional client-side pagination params
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 0;
  const status = req.query.status as string;
  let filtered = connectors;
  if (status) filtered = filtered.filter((c: Record<string, unknown>) => c.status === status);
  const total = filtered.length;
  if (limit > 0) filtered = filtered.slice((page - 1) * limit, page * limit);
  res.json({ connectors: filtered, count: filtered.length, total, page, limit: limit || total });
  } catch (err: unknown) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
});

// GET /api/connectors/health-dashboard — Aggregated health for all connectors
router.get("/health-dashboard", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("integrations.connector.read"), async (req: Request, res: Response) => {
  try {
  const tenantId = req.tenantId!;
  const dashboard = await getHealthDashboard(tenantId);
  res.json({ connectors: dashboard, count: dashboard.length });
  } catch (err: unknown) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
});

// POST /api/connectors — Create a new connector (admin only)
router.post("/", authenticate, requirePermission("integrations.connector.write"), validate({ body: createRootBody }), async (req: Request, res: Response) => {
  try {
  const tenantId = req.tenantId!;
  const config = req.body;
  if (!config || !config.sourceSystemType || !config.authMethod) {
  res.status(400).json({ error: "sourceSystemType and authMethod are required" });
  return;
  }
  const connector = await createConnector(tenantId, config);
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'admin', event: 'created', entityType: 'connector', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:admin.connector.created' });
  res.status(201).json(connector);
  } catch (err: unknown) {
  const status = toErrorMessage(err).includes("Unsupported") ? 400 : 500;
  res.status(status).json({ error: toErrorMessage(err) });
  }
});

// GET /api/connectors/:id/health — Health status for a single connector
router.get("/:id/health", validate({ query: z.record(z.unknown()) }), authenticate, async (req: Request, res: Response) => {
  try {
  const tenantId = req.tenantId!;
  const health = await getConnectorHealth(tenantId, req.params.id);
  res.json(health);
  } catch (err: unknown) {
  const status = toErrorMessage(err).includes("not found") ? 404 : 500;
  res.status(status).json({ error: toErrorMessage(err) });
  }
});

// POST /api/connectors/:id/run — Trigger a connector execution (admin only)
router.post("/:id/run", authenticate, requirePermission("integrations.connector.write"), validate({ body: createIdRunBody }), async (req: Request, res: Response) => {
  try {
  const tenantId = req.tenantId!;
  const result = await runConnector(tenantId, req.params.id);
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'admin', event: 'created', entityType: 'connector', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:admin.connector.created' });
  res.json(result);
  } catch (err: unknown) {
  const status = toErrorMessage(err).includes("not found") ? 404 : 500;
  res.status(status).json({ error: toErrorMessage(err) });
  }
});

// GET /api/connectors/:id/executions — Execution history for a connector
router.get("/:id/executions", validate({ query: z.record(z.unknown()) }), authenticate, async (req: Request, res: Response) => {
  try {
  const tenantId = req.tenantId!;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const executions = await getExecutions(tenantId, req.params.id, limit);
  res.json({ executions, count: executions.length });
  } catch (err: unknown) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
});

// POST /api/connectors/test — Dry-run connection test (no persistence)
router.post("/test", authenticate, requirePermission("integrations.connector.write"), validate({ body: createTestBody }), async (req: Request, res: Response) => {
  try {
  const { sourceSystemType, credentials, platform } = req.body;
  if (!sourceSystemType || !credentials) {
  res.status(400).json({ error: "sourceSystemType and credentials are required" });
  return;
  }
  const result = await testConnection({ sourceSystemType, credentials, platform });
  res.json(result);
  } catch (err: unknown) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
});

// POST /api/connectors/test-all — Test all connectors
router.post("/test-all", authenticate, requirePermission("integrations.connector.write"), validate({ body: createTestallBody }), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const connectors = await getConnectors(tenantId);
  const results = [];
  for (const c of connectors) {
  try {
  const h = await getConnectorHealth(tenantId, c.connector_id);
  results.push({ connector_id: c.connector_id, name: c.name, status: h.status || "ok" });
  } catch { results.push({ connector_id: c.connector_id, name: c.name, status: "error" }); }
  }
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'admin', event: 'created', entityType: 'connector', entityId: 'test-all' } as any)), { tenantId: tenantId, operation: 'grcEvent:admin.connector.created' });
  res.json({ results, count: results.length });
});

// GET /api/connectors/:id/logs — Connector execution logs
router.get("/:id/logs", validate({ query: z.record(z.unknown()) }), authenticate, async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const executions = await getExecutions(tenantId, req.params.id, limit);
  res.json({ logs: executions, count: executions.length });
});

// GET /api/connectors/:id/detail — Full detail with ownership context
router.get("/:id/detail", validate({ query: z.record(z.unknown()) }), authenticate, async (req: Request, res: Response) => {
  try {
  const tenantId = req.tenantId!;
  const detail = await getConnectorDetail(tenantId, req.params.id);
  res.json(detail);
  } catch (err: unknown) {
  const status = ((err as Record<string, unknown>)?.statusCode) || 500;
  res.status((status as any)).json({ error: toErrorMessage(err) });
  }
});

// POST /api/connectors/:id/transition — Status lifecycle transition
router.post("/:id/transition", authenticate, requirePermission("integrations.connector.write"), validate({ body: createIdTransitionBody }), async (req: Request, res: Response) => {
  try {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  const { status: newStatus, reason } = req.body;
  if (!newStatus) { res.status(400).json({ error: "status is required" }); return; }
  const result = await transitionConnectorStatus(tenantId, req.params.id, newStatus, userId, reason);
  setAuditData(res as any, { action: "update", entityType: "connector", entityId: req.params.id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId, module: 'admin', event: 'updated', entityType: 'connector', entityId: req.params.id } as any)), { tenantId: tenantId, operation: 'grcEvent:admin.connector.updated' });
  res.json(result);
  } catch (err: unknown) {
  const status = ((err as Record<string, unknown>)?.statusCode) || 500;
  res.status((status as any)).json({ error: toErrorMessage(err) });
  }
});

// GET /api/connectors/:id/status-history — Status change timeline
router.get("/:id/status-history", validate({ query: z.record(z.unknown()) }), authenticate, async (req: Request, res: Response) => {
  try {
  const tenantId = req.tenantId!;
  const history = await getStatusHistory(tenantId, req.params.id);
  res.json({ history, count: history.length });
  } catch (err: unknown) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
});

// PUT /api/connectors/:id/ownership — Update owner and team
router.put("/:id/ownership", authenticate, requirePermission("integrations.connector.write"), validate({ body: updateIdOwnershipBody }), async (req: Request, res: Response) => {
  try {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  const { ownerId, ownerTeamId } = req.body;
  await updateConnectorOwnership(tenantId, req.params.id, { ownerId, ownerTeamId }, userId);
  setAuditData(res as any, { action: "update", entityType: "connector", entityId: req.params.id, afterState: { ownerId, ownerTeamId } });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId, module: 'admin', event: 'updated', entityType: 'connector', entityId: req.params.id } as any)), { tenantId: tenantId, operation: 'grcEvent:admin.connector.updated' });
  res.json({ updated: true });
  } catch (err: unknown) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
});

// DELETE /api/connectors/:id — Delete a connector
router.delete("/:id", validate({ body: genericPayloadSchema }), authenticate, requirePermission("integrations.connector.delete"), async (req: Request, res: Response) => {
  const { safeQuery, tenantSchema } = await import("../../../config/database.js");
  const schema = tenantSchema(req.tenantId!);
  // Soft-delete from both tables (connectors heartbeat registry and connector_configs)
  await safeQuery(`UPDATE "${schema}".connectors SET deleted_at = NOW() WHERE connector_id = $1`, [req.params.id]).catch(catchHandler(EC.EVENT_BUS, {}));
  await safeQuery(`UPDATE "${schema}".connector_configs SET status = 'disabled' WHERE connector_id = $1`, [req.params.id]).catch(catchHandler(EC.EVENT_BUS, {}));
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'admin', event: 'deleted', entityType: 'connector', entityId: req.params.id } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:admin.connector.deleted' });
  swallow(EC.EVENT_BUS, eventBus.publish(({ eventType: 'foundation.status_changed' as string, tenantId: req.tenantId!, severity: 'info', payload: { entityId: req.params.id, moduleCode: 'foundation', fromStatus: 'active', toStatus: 'disabled', actorUserId: req.user!.userId! } } as any)), { tenantId: req.tenantId!, operation: 'eventBus:foundation.status_changed' });
  res.json({ deleted: true });
});

export default router;

