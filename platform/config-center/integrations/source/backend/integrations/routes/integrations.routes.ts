import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Shahin-Ai — Integrations Routes
// Webhook CRUD, event dispatch, Jira/Slack
// connectors, and integration config management
// ============================================


import { authenticate, requirePermission } from '../ports/auth.port';
import {
  registerWebhook,
  listWebhooks,
  deleteWebhook,
  dispatchEvent,
} from '../ports/platform.port';
import { createIssue, syncStatus } from '../services/jira-connector.service';
import { postMessage } from '../services/slack-connector.service';
import { query as _query, safeQuery, tenantSchema } from '../ports/database.port';
import { emitEvent } from '../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { 
  isOpenClawAvailable, 
  getOpenClawServiceConfig,
  listOpenClawTools,
  listOpenClawResources,
  executeOpenClawTool,
} from '../ports/platform.port';
import { getFirstRow } from '@dos/db';
// ── Zod Validation Schemas ──
import { auditMiddleware, setAuditData, automationMiddleware, fieldRbacFilter, validate, moduleStack } from '../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { invalidateConfigCache } from '../services/integration-config-resolver.service';
import { createWebhooksBody, createWebhooksDispatchBody, createJiraIssuesBody, createSlackMessagesBody, createConfigsBody, updateConfigsidBody, createOpenclawToolstoolNameExecuteBody, createOpenclawTestBody } from "../schemas/integrations.schemas";

const router = Router();
router.use(moduleStack('integrations'));
router.use(auditMiddleware("integrations"));
router.use(automationMiddleware("integrations"));
router.use(fieldRbacFilter("integrations"));

function authorizationFromReq(req: Request): string | undefined {
  const h = req.headers.authorization;
  if (Array.isArray(h)) {
    return h[0];
  }
  return typeof h === 'string' ? h : undefined;
}

function openClawContext(req: Request): {
  tenantId: string;
  userId: string;
  correlationId?: string;
  authorization?: string;
} {
  const cid = req.headers['x-correlation-id'];
  const correlationId = Array.isArray(cid) ? cid[0] : typeof cid === 'string' ? cid : undefined;
  return {
    tenantId: req.user!.tenantId!,
    userId: req.user!.userId!,
    correlationId,
    authorization: authorizationFromReq(req),
  };
}

// ── Webhook Endpoints ──

// POST /webhooks — Register a new webhook
router.post(
  "/webhooks", authenticate, requirePermission("integrations.write"), validate({ body: createWebhooksBody }),
  async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId!;
    // Validate webhook URL
    const { url } = req.body;
    if (!url || typeof url !== 'string') { res.status(400).json({ error: "url is required" }); return; }
    try { new URL(url); } catch { res.status(400).json({ error: "Invalid webhook URL" }); return; }
    const webhook = await registerWebhook(tenantId, req.body);
    setAuditData(res as any, { action: "create", entityType: "integration", entityId: webhook.webhook_id, afterState: webhook });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'admin', event: 'created', entityType: 'integration', entityId: webhook.webhook_id } as any)), { tenantId: tenantId, operation: 'grcEvent:admin.integration.created' });
    res.status(201).json(webhook);
  }
);

// GET /webhooks — List all webhooks for the tenant
router.get(
  "/webhooks", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("integrations.connector.read"),
  async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId!;
    const webhooks = await listWebhooks(tenantId);
    res.json(webhooks);
  }
);

// DELETE /webhooks/:id — Delete a webhook
router.delete(
  "/webhooks/:id", validate({ body: genericPayloadSchema }), authenticate,
  requirePermission("integrations.write"),
  async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId!;
    await deleteWebhook(tenantId, req.params.id as string);
    setAuditData(res as any, { action: "delete", entityType: "integration", entityId: req.params.id, afterState: { deleted: true } });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'admin', event: 'deleted', entityType: 'integration', entityId: req.params.id as string } as any)), { tenantId: tenantId, operation: 'grcEvent:admin.integration.deleted' });
    res.json({ message: "Webhook deleted" });
  }
);

// POST /webhooks/dispatch — Dispatch an event to matching webhooks
router.post(
  "/webhooks/dispatch", authenticate, requirePermission("integrations.write"), validate({ body: createWebhooksDispatchBody }),
  async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId!;
    const { eventType, payload } = req.body;

    if (!eventType) {
      res.status(400).json({ error: "eventType is required" });
      return;
    }

    const results = await dispatchEvent(tenantId, eventType, payload);
    setAuditData(res as any, { action: "create", entityType: "integration", entityId: eventType, afterState: results });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'admin', event: 'created', entityType: 'webhook_dispatch', entityId: eventType } as any)), { tenantId: tenantId, operation: 'grcEvent:admin.webhook_dispatch.created' });
    res.json(results);
  }
);

// ── Jira Endpoints ──

// POST /jira/issues — Create a Jira issue
router.post(
  "/jira/issues", authenticate, requirePermission("integrations.write"), validate({ body: createJiraIssuesBody }),
  async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId!;
    const { title, description, priority, assignee } = req.body;

    if (!title || !description || !priority) {
      res.status(400).json({ error: "title, description, and priority are required" });
      return;
    }

    const result = await createIssue(tenantId, { title, description, priority, assignee });
    if ("error" in result) {
      res.status(502).json(result);
      return;
    }

    setAuditData(res as any, { action: "create", entityType: "integration", entityId: (result as Record<string, unknown>).key || (result as Record<string, unknown>).id, afterState: result });

    swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'admin', event: 'created', entityType: 'jira_issue', entityId: (result as Record<string, unknown>).key || (result as Record<string, unknown>).id || '' } as any)), { tenantId: tenantId, operation: 'grcEvent:admin.jira_issue.created' });
    res.status(201).json(result);
  }
);

// GET /jira/issues/:key/status — Sync Jira issue status
router.get(
  "/jira/issues/:key/status", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("integrations.connector.read"),
  async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId!;
    const result = await syncStatus(tenantId, req.params.key as string);
    if ("error" in result) {
      res.status(502).json(result);
      return;
    }
    res.json(result);
  }
);

// ── Slack Endpoints ──

// POST /slack/messages — Post a message to Slack
router.post(
  "/slack/messages", authenticate, requirePermission("integrations.write"), validate({ body: createSlackMessagesBody }),
  async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId!;
    const { channel, text, blocks } = req.body;

    if (!channel || !text) {
      res.status(400).json({ error: "channel and text are required" });
      return;
    }

    const result = await postMessage(tenantId, channel, { text, blocks });
    if (result && "error" in result) {
      res.status(502).json(result);
      return;
    }
    setAuditData(res as any, { action: "create", entityType: "integration", entityId: channel, afterState: { message: "Message posted to Slack" } });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'admin', event: 'created', entityType: 'slack_message', entityId: channel } as any)), { tenantId: tenantId, operation: 'grcEvent:admin.slack_message.created' });
    res.json({ message: "Message posted to Slack" });
  }
);

// ── Integration Config Endpoints ──

// GET /configs — List all integration configs for the tenant
router.get(
  "/configs", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("integrations.connector.read"),
  async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId!;
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT * FROM "${schema}".integration_configs ORDER BY created_at DESC`,
      []
    );
    res.json(result.rows);
  }
);

// POST /configs — Create a new integration config
router.post(
  "/configs", authenticate, requirePermission("integrations.write"), validate({ body: createConfigsBody }),
  async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId!;
    const { type, name, config, enabled } = req.body;

    if (!type || !config) {
      res.status(400).json({ error: "type and config are required" });
      return;
    }

    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `INSERT INTO "${schema}".integration_configs (type, name, config, enabled)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [type, name || type, JSON.stringify(config), enabled ?? true]
    );
    invalidateConfigCache(tenantId, type);
    setAuditData(res as any, { action: "create", entityType: "integration", entityId: getFirstRow(result)?.integration_id, afterState: getFirstRow(result) });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'admin', event: 'created', entityType: 'integration_config', entityId: getFirstRow(result)?.integration_id } as any)), { tenantId: tenantId, operation: 'grcEvent:admin.integration_config.created' });
    res.status(201).json(getFirstRow(result));
  }
);

// PUT /configs/:id — Update an integration config
router.put(
  "/configs/:id", authenticate, requirePermission("integrations.write"), validate({ body: updateConfigsidBody }),
  async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId!;
    const { type, config, enabled } = req.body;
    const schema = tenantSchema(tenantId);

    const result = await safeQuery(
      `UPDATE "${schema}".integration_configs
       SET type = COALESCE($1, type),
           config = COALESCE($2, config),
           enabled = COALESCE($3, enabled),
           updated_at = NOW()
       WHERE integration_id = $4
       RETURNING *`,
      [type ?? null, config ? JSON.stringify(config) : null, enabled ?? null, req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Integration config not found" });
      return;
    }
    invalidateConfigCache(tenantId);
    setAuditData(res as any, { action: "update", entityType: "integration", entityId: req.params.id, afterState: getFirstRow(result) });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'admin', event: 'updated', entityType: 'integration_config', entityId: req.params.id as string } as any)), { tenantId: tenantId, operation: 'grcEvent:admin.integration_config.updated' });
    res.json(getFirstRow(result));
  }
);

// DELETE /configs/:id — Delete an integration config
router.delete(
  "/configs/:id", validate({ body: genericPayloadSchema }), authenticate,
  requirePermission("integrations.write"),
  async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId!;
    const schema = tenantSchema(tenantId);

    const result = await safeQuery(
      `DELETE FROM "${schema}".integration_configs WHERE integration_id = $1 RETURNING integration_id`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Integration config not found" });
      return;
    }
    invalidateConfigCache(tenantId);
    setAuditData(res as any, { action: "delete", entityType: "integration", entityId: req.params.id, afterState: { deleted: true } });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'admin', event: 'deleted', entityType: 'integration_config', entityId: req.params.id as string } as any)), { tenantId: tenantId, operation: 'grcEvent:admin.integration_config.deleted' });
    res.json({ message: "Integration config deleted" });
  }
);

// ── OpenClaw Endpoints ──

// GET /openclaw/status — Get OpenClaw status and configuration
router.get(
  "/openclaw/status", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("integrations.connector.read"),
  async (req: Request, res: Response) => {
    const config = await getOpenClawServiceConfig();
    const available = await isOpenClawAvailable();
    const enabled = Boolean(config.enabled);
    const connected = enabled && available;

    res.json({
      connected,
      enabled,
      available,
      transport: config.transport,
      port: config.port,
      host: config.host,
      integrations: {
        langgraph: config.langgraphEnabled,
        temporal: config.temporalEnabled,
        langfuse: config.langfuseEnabled,
      },
      connectors: {
        exposed: config.exposeConnectors,
        timeoutMs: config.connectorTimeoutMs,
      },
      rateLimit: {
        enabled: config.rateLimitEnabled,
        windowMs: config.rateLimitWindowMs,
        maxRequests: config.rateLimitMaxRequests,
      },
    });
  }
);

// GET /openclaw/tools — List available OpenClaw tools
router.get(
  "/openclaw/tools", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("integrations.connector.read"),
  async (req: Request, res: Response) => {
    if (!(await isOpenClawAvailable())) {
      return res.status(503).json({ error: "OpenClaw is not available" });
    }

    const tools = await listOpenClawTools(openClawContext(req));
    res.json({ tools });
  }
);

// GET /openclaw/resources — List available OpenClaw resources
router.get(
  "/openclaw/resources", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("integrations.connector.read"),
  async (req: Request, res: Response) => {
    const { uri } = req.query;

    if (!(await isOpenClawAvailable())) {
      return res.status(503).json({ error: "OpenClaw is not available" });
    }

    const resources = await listOpenClawResources(uri as string | undefined, openClawContext(req));
    res.json({ resources });
  }
);

// POST /openclaw/tools/:toolName/execute — Execute an OpenClaw tool
router.post(
  "/openclaw/tools/:toolName/execute", authenticate, requirePermission("integrations.write"), validate({ body: createOpenclawToolstoolNameExecuteBody }),
  async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId!;
    const { toolName } = req.params;
    const args = req.body;

    if (!(await isOpenClawAvailable())) {
      return res.status(503).json({ error: "OpenClaw is not available" });
    }

    const result = await executeOpenClawTool(toolName, args, openClawContext(req));

    setAuditData(res as any, { action: "create", entityType: "integration", entityId: toolName, afterState: { tool: toolName, result } });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: userId, module: 'admin', event: 'created', entityType: 'openclaw_tool_execution', entityId: toolName } as any)), { tenantId: tenantId, operation: 'grcEvent:admin.openclaw_tool_execution.created' });
    res.json({ result });
  }
);

// POST /openclaw/test — Test OpenClaw connectivity
router.post(
  "/openclaw/test", authenticate, requirePermission("integrations.connector.read"), validate({ body: createOpenclawTestBody }),
  async (req: Request, res: Response) => {
    try {
      if (!(await isOpenClawAvailable())) {
        return res.json({ 
          ok: false, 
          message: "OpenClaw is not enabled or unavailable",
        });
      }

      // Test by listing tools (lightweight operation)
      const tools = await listOpenClawTools(openClawContext(req));
      
      res.json({ 
        ok: true, 
        message: `OpenClaw is operational. ${tools.length} tools available.`,
        toolsCount: tools.length,
      });
    } catch (err: unknown) {
      res.json({ 
        ok: false, 
        message: `OpenClaw test failed: ${toErrorMessage(err)}`,
      });
    }
  }
);

export default router;

